import assert from "node:assert/strict";
import {
  formatAmount,
  formatShoppingAmount,
  mergeShoppingAmount,
  mergeShoppingItems,
  normalizeShoppingList,
  orderStoreCategories,
  parseAmount,
  scaleAmount,
  shoppingMergeKey,
} from "../../src/domain/shopping.js";

function testParseAmount() {
  assert.equal(parseAmount(""), null);
  assert.equal(parseAmount("abc"), null);
  assert.equal(parseAmount("1"), 1);
  assert.equal(parseAmount("1,5"), 1.5);
  assert.equal(parseAmount("1/2"), 0.5);
  assert.equal(parseAmount("2 / 4"), 0.5);
  assert.equal(parseAmount("1/0"), null);
}

function testFormatAndScaleAmount() {
  assert.equal(formatAmount(1), "1");
  assert.equal(formatAmount(1.25), "1,25");
  assert.equal(formatAmount(12.25), "12,3");
  assert.equal(scaleAmount("2", 4, 8), "4");
  assert.equal(scaleAmount("1/2", 4, 8), "1");
  assert.equal(scaleAmount("litt", 4, 8), "litt");
  assert.equal(scaleAmount("2", 4, 4), "2");
}

function testNormalizeShoppingList() {
  const normalized = normalizeShoppingList({
    generatedForWeek: "2026-05-18",
    items: [
      { id: 123, name: " Pasta ", amount: 1, unit: " pakke ", category: "", checked: 1, custom: 0 },
      { name: "   " },
    ],
  });

  assert.equal(normalized.generatedForWeek, "2026-05-18");
  assert.equal(normalized.items.length, 1);
  assert.equal(normalized.items[0].id, "123");
  assert.equal(normalized.items[0].name, "Pasta");
  assert.equal(normalized.items[0].amount, "1");
  assert.equal(normalized.items[0].unit, "pakke");
  assert.equal(normalized.items[0].category, "other");
  assert.equal(normalized.items[0].checked, true);
  assert.equal(normalized.items[0].custom, false);
}

function testShoppingMergeHelpers() {
  assert.equal(formatShoppingAmount(NaN), "");
  assert.equal(formatShoppingAmount(0), "");
  assert.equal(formatShoppingAmount(1), "1");
  assert.equal(formatShoppingAmount(1.25), "1.25");
  assert.equal(shoppingMergeKey({ name: " Pasta ", unit: " Pakke " }), "pasta__pakke");
  assert.equal(mergeShoppingAmount("1", "2"), "3");
  assert.equal(mergeShoppingAmount("litt", "2"), "litt");
  assert.equal(mergeShoppingAmount("", "2"), "2");
}

function testMergeShoppingItems() {
  const merged = mergeShoppingItems(
    [
      { id: "a", name: "Pasta", amount: "1", unit: "pakke", category: "dry", checked: true, custom: true },
      { id: "b", name: "Salt", amount: "", unit: "", category: "spices", checked: false, custom: true },
    ],
    [
      { id: "c", name: " pasta ", amount: "2", unit: "pakke", category: "other", checked: false, custom: false },
      { id: "d", name: "Paprika", amount: "1", unit: "stk", category: "produce", checked: false, custom: false },
    ],
  );

  assert.equal(merged.length, 3);
  assert.deepEqual(
    merged.find((item) => item.name === "Pasta"),
    { id: "a", name: "Pasta", amount: "3", unit: "pakke", category: "dry", checked: false, custom: false },
  );
  assert.deepEqual(
    merged.find((item) => item.name === "Paprika"),
    { id: "d", name: "Paprika", amount: "1", unit: "stk", category: "produce", checked: false, custom: false },
  );
}

testParseAmount();
testFormatAndScaleAmount();
testNormalizeShoppingList();
testShoppingMergeHelpers();
testMergeShoppingItems();

const categories = [
  { key: "produce", label: "Grønnsaker" },
  { key: "meat", label: "Kjøtt" },
  { key: "other", label: "Annet" },
];
const original = structuredClone(categories);
assert.deepEqual(orderStoreCategories(categories, []), original);
assert.deepEqual(orderStoreCategories(categories, null), original);
assert.deepEqual(orderStoreCategories(categories, ["meat"]).map((cat) => cat.key), ["meat", "produce", "other"]);
assert.deepEqual(orderStoreCategories(categories, ["unknown", "other", "other", "produce"]).map((cat) => cat.key), ["other", "produce", "meat"]);
assert.deepEqual(orderStoreCategories(categories, ["unknown"]), original);
assert.deepEqual(orderStoreCategories([], ["meat"]), []);
assert.deepEqual(orderStoreCategories([...categories, { key: "new" }], ["other", "meat", "produce"]).map((cat) => cat.key), ["other", "meat", "produce", "new"]);
assert.deepEqual(categories, original);

console.log("shopping domain tests ok");
