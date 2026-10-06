import assert from "node:assert/strict";
import { parseAmountRange, shoppingAmountValue } from "../../src/domain/shopping.js";
for (const value of ["3-4", "3–4"]) assert.deepEqual(parseAmountRange(value), { min: 3, max: 4 });
assert.deepEqual(parseAmountRange("0,5-1,5"), { min: 0.5, max: 1.5 });
assert.deepEqual(parseAmountRange("½-1"), { min: 0.5, max: 1 });
assert.deepEqual(parseAmountRange("1 1/2-2"), { min: 1.5, max: 2 });
for (const value of ["4-3", "1-2-3", "3 stk", "3", "-4", "1/0-2"]) assert.equal(parseAmountRange(value), null);
assert.equal(shoppingAmountValue("3-4"), 4);
assert.equal(scaleAmount("3-4", 4, 5), "3,75–5");
assert.equal(scaleAmount("3,2-4", 4, 5), "4–5");
assert.equal(scaleAmount("3-4", 4, 4), "3-4");
assert.equal(mergeShoppingAmount("3-4", "2–3"), "7");
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
  for (const value of ["2 1/2", "2½", "2 ½"]) assert.equal(parseAmount(value), 2.5);
  for (const [glyph, fraction] of [["½", 0.5], ["¼", 0.25], ["¾", 0.75]]) {
    assert.equal(parseAmount(glyph), fraction);
    assert.equal(parseAmount(`2${glyph}`), 2 + fraction);
    assert.equal(parseAmount(`2 ${glyph}`), 2 + fraction);
  }
  for (const value of ["2 1/0", "1 2 3", "ca 2", "2 ½ ½"]) assert.equal(parseAmount(value), null);
  assert.deepEqual(parseAmountRange("2½–3 ¾"), { min: 2.5, max: 3.75 });
  assert.deepEqual(parseAmountRange("2 1/2-3 1/2"), { min: 2.5, max: 3.5 });
}

function testFormatAndScaleAmount() {
  assert.equal(formatAmount(1), "1");
  assert.equal(formatAmount(1.25), "1,25");
  assert.equal(formatAmount(12.25), "12,3");
  assert.equal(scaleAmount("2", 4, 8), "4");
  assert.equal(scaleAmount("1/2", 4, 8), "1");
  assert.equal(scaleAmount("litt", 4, 8), "litt");
  assert.equal(scaleAmount("2", 4, 4), "2");
  assert.equal(scaleAmount("2 1/2", 4, 5), "3,25"); // Existing display rounds to quarters.
  assert.equal(scaleAmount("2 1/2", 4, 4), "2 1/2");
  assert.equal(scaleAmount("2½", 4, 8), "5");
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
  assert.equal(normalizeShoppingList({ items: [{ id: "a", name: "Melk", createdAt: 123 }] }).items[0].createdAt, 123);
  assert.equal(normalizeShoppingList({ items: [{ id: "a", name: "Melk", createdAt: NaN }] }).items[0].createdAt, undefined);
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
  assert.equal(mergeShoppingAmount("2 1/2", "1"), "3.5");
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
