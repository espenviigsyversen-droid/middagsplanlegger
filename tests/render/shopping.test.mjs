import assert from "node:assert/strict";
import {
  renderShoppingItemEditorView,
  renderShoppingListView,
  renderShoppingReviewModalView,
  renderShoppingSuggestionsView,
} from "../../src/render/shopping.js";

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function testSuggestionsRender() {
  const html = renderShoppingSuggestionsView({
    suggestions: [{ name: "Pasta", category: "dry" }],
    categories: { dry: "Tørrvarer" },
    escapeHtml,
  });
  assert.match(html, /data-shopping-suggestion="Pasta"/);
  assert.match(html, /Tørrvarer/);
  assert.equal(renderShoppingSuggestionsView({ suggestions: [], escapeHtml }), "");
}

function testReviewRender() {
  const html = renderShoppingReviewModalView({
    review: {
      open: true,
      mode: "week",
      title: "Se over",
      selectedItemIds: ["a"],
      groups: [{ id: "g1", title: "Pasta", items: [{ id: "a", name: "Tagliatelle", amount: "1", unit: "pakke" }] }],
    },
    selectedCount: 1,
    totalCount: 1,
    escapeHtml,
  });
  assert.match(html, /week-review/);
  assert.match(html, /Legg til 1 vare/);
  assert.match(html, /Tagliatelle/);
}

function testEditorRenderEscapesValues() {
  const html = renderShoppingItemEditorView({
    item: { id: "1", name: "<melk>", amount: "1", unit: "l", category: "dairy" },
    unitOptions: ["", "l"],
    storeCategories: [{ key: "dairy", label: "Meieri" }],
    escapeHtml,
  });
  assert.match(html, /&lt;melk&gt;/);
  assert.match(html, /selected>l/);
  assert.match(html, /Meieri/);
}

function testShoppingListRender() {
  const html = renderShoppingListView({
    items: [
      { id: "1", name: "Pasta", amount: "1", unit: "pakke", category: "dry", checked: false },
      { id: "2", name: "Melk", amount: "1", unit: "l", category: "dairy", checked: true },
    ],
    storeCategories: [{ key: "dry", label: "Tørrvarer" }, { key: "dairy", label: "Meieri" }],
    shoppingIconHtml: "<svg></svg>",
    escapeHtml,
  });
  assert.match(html, /1 gjenstår · 1 avhuket/);
  assert.match(html, /Tørrvarer/);
  assert.match(html, /I kurven \(1\)/);
}

testSuggestionsRender();
testReviewRender();
testEditorRenderEscapesValues();
testShoppingListRender();

console.log("shopping render tests ok");
