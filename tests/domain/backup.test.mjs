import assert from "node:assert/strict";
import { backupFileName, buildBackup } from "../../src/domain/backup.js";

const now = new Date(2026, 0, 2, 12, 0, 0);
const data = {
  family: { name: "Familien" },
  meals: [{ id: "taco", title: "Taco" }],
  plansByWeek: { "2026-01-05": { 0: "taco" } },
  metadata: { storeCategoryOrder: ["other"] },
  shoppingList: { items: [{ name: "Melk" }] },
};
const backup = buildBackup({ data, appVersion: "v91", familyId: "familien", now });
assert.deepEqual(backup, {
  app: "middagsapp", exportVersion: 1, appVersion: "v91", familyId: "familien",
  exportedAt: now.toISOString(), data,
});
assert.deepEqual(JSON.parse(JSON.stringify(backup)), backup);
assert.equal(backupFileName(now), "middagsapp-backup-2026-01-02.json");
assert.equal(backupFileName(new Date(2026, 9, 5)), "middagsapp-backup-2026-10-05.json");
assert.equal(backupFileName(new Date(2026, 11, 31)), "middagsapp-backup-2026-12-31.json");
data.meals[0].title = "Endret";
assert.equal(backup.data.meals[0].title, "Taco");
backup.data.metadata.storeCategoryOrder.push("meat");
assert.deepEqual(data.metadata.storeCategoryOrder, ["other"]);
assert.throws(() => buildBackup({ data, now: "invalid date" }), RangeError);

console.log("backup domain tests ok");
