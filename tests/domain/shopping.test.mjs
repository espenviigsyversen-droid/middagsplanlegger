import assert from "node:assert/strict";
import { parseAmountRange, shoppingAmountValue } from "../../src/domain/shopping.js";
for (const value of ["3-4", "3–4"]) assert.deepEqual(parseAmountRange(value), { min: 3, max: 4 });
assert.deepEqual(parseAmountRange("0,5-1,5"), { min: 0.5, max: 1.5 });
assert.deepEqual(parseAmountRange("½-1"), { min: 0.5, max: 1 });
assert.deepEqual(parseAmountRange("1 1/2-2"), { min: 1.5, max: 2 });
for (const value of ["4-3", "1-2-3", "3 stk", "3", "-4", "1/0-2"]) assert.equal(parseAmountRange(value), null);
assert.equal(shoppingAmountValue("3-4"), 4);
assert.equal(scaleAmount("3-4", 4, 5), "4–5");
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
  roundScaledAmount,
  roundRecipeShoppingItems,
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
  assert.equal(scaleAmount("2 1/2", 4, 5), "3"); // Counted quantities round to whole numbers above three.
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
  assert.equal(formatShoppingAmount(1.25), "1,25");
  assert.equal(shoppingMergeKey({ name: " Pasta ", unit: " Pakke " }), "pasta__pakke");
  assert.equal(mergeShoppingAmount("1", "2"), "3");
  assert.equal(mergeShoppingAmount("litt", "2"), "litt");
  assert.equal(mergeShoppingAmount("", "2"), "2");
  assert.equal(mergeShoppingAmount("2 1/2", "1"), "3,5");
  assert.equal(mergeShoppingAmount("2.5", "1"), "3,5");
  assert.equal(mergeShoppingAmount("2,5", "1"), "3,5");
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
const examples = [["500", "g", "625"], ["390", "g", "500"], ["1", "stk", "1,5"], ["3", "fedd", "4"],
  ["3", "ss", "4"], ["4", "dl", "5"], ["1", "", "1,5"], ["10", "stk", "13"]];
for (const [amount, unit, expected] of examples) assert.equal(scaleAmount(amount, 4, 5, unit), expected);
for (const [value, unit, expected] of [[12.5,"g",13],[105,"g",110],[487.5,"g",500],[12.5,"ML",13],
  [0.15,"kg",0.2],[0.15,"L",0.2],[1.25,"dl",1.5],[0.375,"ts",0.5],[1.25,"SS",1.5],[2.25,"plate",2.5],[3.5,"terning",4]]) {
  assert.equal(roundScaledAmount(value, unit), expected);
}
for (const unit of ["g","ml","kg","l","dl","ts","ss","stk","fedd","plate","terning",""]) {
  assert.ok(roundScaledAmount(0.00001, unit) > 0);
  assert.equal(scaleAmount("2 1/2",4,4,unit),"2 1/2");
}
assert.equal(scaleAmount("390-500",4,5,"g"),"500–625");
assert.equal(scaleAmount("½-1",4,5,"stk"),"0,5–1,5");
assert.equal(scaleAmount("0,15",4,4,"kg"),"0,15");
const contribution = (amount,unit,scaled=true) => ({id:"a",name:"Løk",amount:String(amount),unit,_rawAmount:amount,_scaled:scaled});
assert.equal(roundRecipeShoppingItems([contribution(0.625,"stk"),contribution(0.625,"stk")],{weekly:true})[0].amount,"2");
assert.equal(roundRecipeShoppingItems([contribution(1.25,"stk")])[0].amount,"1,5");
assert.equal(roundRecipeShoppingItems([contribution(487.5,"g")],{weekly:true})[0].amount,"500");
assert.equal(roundRecipeShoppingItems([contribution(0.075,"kg"),contribution(0.075,"kg")],{weekly:true})[0].amount,"0,2");
assert.doesNotMatch(JSON.stringify(roundRecipeShoppingItems([contribution(2,"stk")],{weekly:true})), /_rawAmount|_scaled/);
// Unpublished v106 correction: finer steps for small mass and volume, also in weekly totals.
for (const unit of ["g", "ml", "G", "ML"]) {
  for (const [amount, target, expected] of [["2",5,"2,5"],["12",6,"18"],["7",5,"9"],["18",5,"25"]]) {
    assert.equal(scaleAmount(amount,4,target,unit),expected);
  }
  for (const [value, expected] of [[0.0001,0.5],[0.75,1],[2.25,2.5],[9.75,10],[10,10],[12.5,13],
    [19.5,20],[20,20],[22.5,25],[99.5,100],[100,100],[105,110],[249.5,250],[250,250]]) {
    assert.equal(roundScaledAmount(value,unit),expected);
  }
  assert.equal(scaleAmount("2",4,4,unit),"2");
  assert.equal(scaleAmount("2-7",4,5,unit),"2,5–9");
  assert.equal(roundRecipeShoppingItems([contribution(1.25,unit),contribution(1.25,unit)],{weekly:true})[0].amount,"2,5");
}
