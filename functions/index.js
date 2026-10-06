"use strict";
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { runImport } = require("./lib/import.js");
const { runKeyAction } = require("./lib/key-service.js");
const { CONFIG_PATH, selectModel, runModelSave } = require("./lib/models.js");
const { nextUsage } = require("./lib/core.js");
const { KEY_PATH, decryptKey, sameKeyRecord, nextKeyUsage, checkProviderKey } = require("./lib/keys.js");
const { fetchPage } = require("./lib/transport.js");
const { interpretRecipe } = require("./lib/ai.js");
initializeApp();
const db = getFirestore();
const KEY_ENCRYPTION_SECRET = defineSecret("KEY_ENCRYPTION_SECRET");
const getRecord = async path => { const doc = await db.doc(path).get(); return doc.exists ? doc.data() : null; };
const getKey = () => getRecord(KEY_PATH);
const getModel = async () => selectModel(await getRecord(CONFIG_PATH));
const consume = (path, next) => db.runTransaction(async transaction => {
  const ref = db.doc(path), current = await transaction.get(ref);
  const usage = next(current.exists ? current.data() : {});
  transaction.set(ref, usage); return usage;
});
// Late results must not change a newly saved key or recreate a deleted key.
const updateKeyStatus = (testedRecord, status) => db.runTransaction(async transaction => {
  const ref = db.doc(KEY_PATH), current = await transaction.get(ref);
  if (current.exists && sameKeyRecord(current.data(), testedRecord)) transaction.update(ref, { status, checkedAt: FieldValue.serverTimestamp() });
});
const log = record => logger.info("middagsapp-ai", record);
const callable = (options, handler) => onCall({ region: "europe-west1", maxInstances: 3, enforceAppCheck: false, ...options }, async request => {
  try { return await handler(request); } catch (error) {
    throw new HttpsError(["unauthenticated", "permission-denied", "invalid-argument"].includes(error?.code) ? error.code : "internal",
      error?.code === "invalid-argument" ? "Ugyldig forespørsel." : "Innlogging eller tilgang mangler.");
  }
});
const keyDeps = {
  getMember: email => getRecord(`families/familien/members/${email}`), getKey,
  saveKey: record => db.doc(KEY_PATH).set(record), deleteKey: () => db.doc(KEY_PATH).delete(), updateKeyStatus,
  consumeKeyUsage: () => consume("families/familien/private/keyUsage", nextKeyUsage),
  encryptionSecret: () => KEY_ENCRYPTION_SECRET.value(), serverTimestamp: () => FieldValue.serverTimestamp(),
  checkKey: checkProviderKey, getModel, log,
};
exports.aiKeyStatus = callable({ timeoutSeconds: 30 }, request => runKeyAction("status", request, keyDeps));
exports.aiKeySave = callable({ timeoutSeconds: 30, secrets: [KEY_ENCRYPTION_SECRET] }, request => runKeyAction("save", request, keyDeps));
exports.aiKeyTest = callable({ timeoutSeconds: 30, secrets: [KEY_ENCRYPTION_SECRET] }, request => runKeyAction("test", request, keyDeps));
exports.aiKeyDelete = callable({ timeoutSeconds: 30 }, request => runKeyAction("delete", request, keyDeps));
exports.aiModelSave = callable({ timeoutSeconds: 90, secrets: [KEY_ENCRYPTION_SECRET] }, request => runModelSave(request, {
  ...keyDeps, saveConfig: record => db.doc(CONFIG_PATH).set(record), interpretRecipe,
}));
exports.importRecipe = callable({ timeoutSeconds: 120, memory: "512MiB", secrets: [KEY_ENCRYPTION_SECRET] }, request => runImport(request, {
  memberExists: async email => !!await getRecord(`families/familien/members/${email}`),
  loadKey: async () => {
    const record = await getKey(), key = decryptKey(record, KEY_ENCRYPTION_SECRET.value());
    if (record && !key) { try { await updateKeyStatus(record, "invalid"); } catch {} }
    return key ? { key, record } : null;
  },
  markKeyInvalid: record => updateKeyStatus(record, "invalid"),
  consumeUsage: () => consume("families/familien/private/importUsage", nextUsage), fetchPage, getModel, interpretRecipe, log,
}));
