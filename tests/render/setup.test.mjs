import assert from "node:assert/strict";
import {
  renderAppSettingsView,
  renderFamilySettingsView,
  renderMetadataRowsView,
  renderSetupPageView,
  renderSetupView,
} from "../../src/render/setup.js";

const escapeHtml = (value) => String(value ?? "").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function testSetupRender() {
  const page = renderSetupView({
    family: { name: "Flo", familySize: 5, kidFriendlyPerWeek: 3, leftovers: true, reuseIngredients: false },
    quickDays: ["Mandag"],
    dayNames: ["Mandag", "Tirsdag"],
    counts: { categories: 4, units: 8, prepTimes: 3, suitability: 4, planModes: 3, ingredientMappings: 2, storeCategories: 7, preferenceGoals: 1 },
    appVersion: "v79",
    escapeHtml,
  });
  assert.match(page, /Innstillinger/);
  assert.match(page, /data-view="family-settings"/);
  assert.match(page, /data-view="app-settings"/);
  assert.match(page, /Versjon v79/);
  assert.match(page, /data-view="categories"/);
  assert.doesNotMatch(page, /Familienavn/);

  const familyPage = renderFamilySettingsView({
    family: { name: "Flo", familySize: 5, kidFriendlyPerWeek: 3, leftovers: true, reuseIngredients: false },
    quickDays: ["Mandag"],
    dayNames: ["Mandag", "Tirsdag"],
    escapeHtml,
  });
  assert.match(familyPage, /Familienavn/);
  assert.match(familyPage, /data-family="name"/);

  const appPage = renderAppSettingsView({ appVersion: "v79", escapeHtml });
  assert.match(appPage, /Oppdater app/);
  assert.match(appPage, /Versjon v79/);
  assert.match(appPage, /Sikkerhetskopi/);
  assert.match(appPage, /data-download-backup/);
  assert.match(appPage, /slik de ligger på denne enheten/);
  const storageMessage = "Nettleserens lagring er full. Appen virker, men kan ikke startes uten nett på denne enheten.";
  assert.equal(appPage.includes(storageMessage), false);
  assert.ok(renderAppSettingsView({ localStoreFailed: true }).includes(storageMessage));
  assert.equal(renderSetupView({ localStoreFailed: true }).includes(storageMessage), false);

  const rows = renderMetadataRowsView({ entries: [["fisk", "Fisk"]], inputAttribute: "data-category-label", saveAttribute: "data-save-category", removeAttribute: "data-remove-category", editable: true, escapeHtml });
  assert.match(rows, /data-category-label="fisk"/);

  const subPage = renderSetupPageView({ title: "Kategorier", lead: "Test", bodyHtml: rows, escapeHtml });
  assert.match(subPage, /Kategorier/);
  assert.match(subPage, /Tilbake/);
}

testSetupRender();

console.log("setup render tests ok");
