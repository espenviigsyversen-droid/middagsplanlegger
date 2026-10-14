import assert from "node:assert/strict";
import { pencilIcon } from "../../src/render/icons.js";
import { renderWeekRow, weekIcon } from "../../src/render/week.js";
import { readFileSync } from "node:fs";
import {
  renderMealCardView,
  renderMealDetailView,
  renderMealEditorView,
  renderMealSearchSuggestionsView,
  renderMealsView,
  renderEditorRowMenuView,
  renderIngredientEditorRowView,
  renderStepEditorRowView,
} from "../../src/render/meals.js";

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function testMealCardRender() {
  const html = renderMealCardView({
    meal: {
      id: "pasta",
      title: "Pasta <god>",
      description: "Rask",
      categories: ["pasta"],
      favorite: true,
      kidFriendly: true,
      prepTime: "quick",
      leftovers: "likely",
      suitability: ["weekday"],
      excludeFromSuggestions: true,
      ingredients: [{ name: "Pasta" }],
    },
    categoryLabels: { pasta: "Pasta" },
    suitabilityLabels: { weekday: "Hverdag" },
    escapeHtml,
  });
  assert.match(html, /Pasta &lt;god&gt;/);
  assert.match(html, /aria-label="Pasta &lt;god&gt;, åpne oppskrift"/);
  assert.match(html, /aria-label="Rediger Pasta &lt;god&gt;"/);
  assert.doesNotMatch(html, /Favoritt/);
  assert.doesNotMatch(html, /Kun oppskrift/);
  assert.doesNotMatch(html, /Rask/);
  assert.doesNotMatch(html, /Mangler oppskrift/);
  assert.match(renderMealCardView({ meal: { id: "ny", title: "Ny middag" } }), /Mangler oppskrift/);
}

function testRecipeImportRender() {
  const meal = { id: "linked", title: "Lenke", description: "", recipeUrl: "https://example.com/recipe", ingredients: [], steps: [] };
  const linked = renderMealDetailView({ meal, menuOpen: true, importAvailable: true, escapeHtml });
  assert.match(linked, /data-import-from-link="linked"/);
  assert.match(linked, /Hent fra lenke/);
  assert.doesNotMatch(renderMealDetailView({ meal: { ...meal, ingredients: [{ name: "Fisk" }] }, menuOpen:true, escapeHtml }), /data-import-from-link/);
  assert.doesNotMatch(renderMealDetailView({ meal: { ...meal, recipeUrl: "" }, menuOpen:true, escapeHtml }), /data-import-from-link/);
  assert.match(renderMealDetailView({ meal, menuOpen:true, importAvailable:false }), /data-import-from-link="linked" disabled/);
  for (const isNew of [true, false]) {
    const html = renderMealEditorView({ meal, isNew, importAvailable: true, aiKeyStatus: { configured: true, status: "connected" }, recipeImport: { url: meal.recipeUrl, showText: true, text: "<script>bad</script>" }, escapeHtml });
    assert.match(html, /Fyll ut automatisk/); assert.doesNotMatch(html, /data-import-fetch/); assert.match(html, /data-import-interpret/);
    assert.doesNotMatch(html, /<script>/);
    assert.ok(html.indexOf("recipe-import-panel") < html.indexOf("data-meal-form"));
  }
  const busy = renderMealEditorView({ meal, importAvailable: true, aiKeyStatus: { configured: true, status: "connected" }, recipeImport: { busy: true, showText: true }, escapeHtml });
  assert.match(busy, /data-import-interpret disabled/);
  assert.match(busy, /Henter oppskrift/);
}
testRecipeImportRender();

function testMealsViewRender() {
  const html = renderMealsView({
    meals: [{ id: "pasta", title: "Pasta", description: "", categories: ["pasta"], suitability: [] }],
    filters: { query: "pas", category: "pasta", flag: "all", sort: "alpha" },
    categoryEntries: [["pasta", "Pasta"]],
    categoryLabels: { pasta: "Pasta" },
    suitabilityEntries: [["weekday", "Hverdag"]],
    suitabilityLabels: { weekday: "Hverdag" },
    addIconHtml: "<svg></svg>",
    escapeHtml,
  });
  assert.match(html, /value="pas"/);
  assert.match(html, /data-clear-meal-search/);
  assert.match(html, /data-meal-list/);
  assert.match(html, /data-meal-search-suggestions/);
  assert.match(html, /meal-search-suggestion/);
  assert.match(html, /Ny oppskrift/);
  assert.match(html, /Pasta/);
  assert.match(html, /value="needs-recipe"/);
  const missingFilter = renderMealsView({ filters: { flag: "needs-recipe" } });
  assert.match(missingFilter, /value="needs-recipe" selected>Mangler oppskrift/);
}

function testMealSearchSuggestionsRender() {
  const html = renderMealSearchSuggestionsView({
    meals: [
      { id: "nachos", title: "Nachos", categories: ["meat"] },
      { id: "kyllingnachos", title: "Kyllingnachos", categories: ["chicken"] },
    ],
    query: "nach",
    categoryLabels: { meat: "Kjøtt", chicken: "Kylling" },
    escapeHtml,
  });
  assert.match(html, /data-view-meal="nachos"/);
  assert.match(html, /Nachos/);
  assert.match(html, /Kjøtt/);
}

function testMealDetailRender() {
  const html = renderMealDetailView({
    meal: { id: "pasta", title: "Pasta", description: "", recipeUrl: "https://example.com" },
    steps: ["Kok pasta"],
    ingredients: [{ amount: "2", unit: "stk", name: "Tomat" }],
    wakeSupported: false,
    servingText: "Oppskrift til 4 porsjoner.",
    leftoversText: "Gir rester",
    shoppingIconHtml: "<svg></svg>",
    scaleAmount: (amount) => amount,
    escapeHtml,
  });
  assert.match(html, /Oppskrift til 4 porsjoner/);
  assert.match(html, /Tomat/);
  assert.match(html, /Kok pasta/);
  assert.match(html, /aria-label="Flere valg"/);
  assert.doesNotMatch(html, /Åpne lenke/);
  assert.match(renderMealDetailView({meal:{id:"a",title:"A",recipeUrl:"https://example.com"},menuOpen:true}), /target="_blank" rel="noopener">Åpne lenke/);
  assert.doesNotMatch(html, /Ingen oppskrift lagt inn ennå/);
  const missingDetail = renderMealDetailView({ meal: { id: "ny", title: "Ny" } });
  assert.match(missingDetail, /Ingen oppskrift lagt inn ennå/);
  assert.match(missingDetail, /data-edit-meal="ny">Legg inn oppskrift/);
}

for (const description of ["Pasta", "PASTA 🍝", "  PASTA!!! "]) {
  const html = renderMealDetailView({meal:{id:"p",title:"Pasta",description}});
  assert.doesNotMatch(html, /<p>[^<]*PASTA|<p>Pasta/);
}
const duplicate = renderMealDetailView({meal:{title:"Cheesy Alfredo pasta med saftig kylling",description:"CHEESY ALFREDO-PASTA MED SAFTIG KYLLING 🍝🍗🧀"}});
assert.doesNotMatch(duplicate,/CHEESY|🍝/);
assert.match(renderMealDetailView({meal:{title:"Pasta",description:"Kremet middag"}}), /<p>Kremet middag/);
for (const checked of [true,false]) {
  const html=renderMealDetailView({meal:{id:"a",title:"A"},wakeSupported:true,keepScreenAwake:checked});
  assert.match(html,new RegExp(`role="switch" aria-checked="${checked}"`));
  assert.match(html,/Hold skjermen på/);
}
assert.match(renderMealDetailView({meal:{title:"A"},wakeSupported:false}), /data-toggle-wake disabled/);

function testMealEditorRender() {
  const html = renderMealEditorView({
    isNew: false,
    meal: {
      id: "pasta",
      title: "Pasta <god>",
      description: "Rask",
      recipeUrl: "example.com",
      categories: ["pasta"],
      suitability: ["weekday"],
      kidFriendly: true,
      favorite: false,
      excludeFromSuggestions: true,
      leftovers: "likely",
      prepTime: "quick",
      minDaysBetween: 14,
    },
    baseServings: 4,
    ingredients: [{ amount: "1", unit: "pakke", name: "Pasta" }],
    steps: ["Kok"],
    categoryEntries: [["pasta", "Pasta"]],
    suitabilityEntries: [["weekday", "Hverdag"]],
    prepTimeEntries: [["quick", "Rask"]],
    unitOptions: ["", "pakke"],
    escapeHtml,
  });
  assert.ok(html.includes("<strong>Rediger</strong>"));
  assert.match(html, /name="kidFriendly" checked/);
  assert.match(html, /name="excludeFromSuggestions" checked/);
  assert.match(html, /data-ingredient-row="0"/);
  assert.match(html, /data-step-row="0"/);
  assert.match(html, /Slett/);
  assert.match(html, /Porsjoner i oppskriften/);
  assert.match(html, /Antallet mengdene er beregnet for\. Ukeplan og handleliste regner om til porsjonene for dagen\./);
  assert.match(html, /aria-describedby="mealBaseServingsHint"/);
  const quickEditor = renderMealEditorView({ meal: { id: "ny", title: "Ny", prepTime: "" }, prepTimeEntries: [["quick", "Rask"]] });
  assert.match(quickEditor, /value="" selected>Ikke angitt/);
  assert.doesNotMatch(quickEditor, /value="quick" selected/);
}

testMealCardRender();
testMealsViewRender();
testMealSearchSuggestionsRender();
testMealDetailRender();
testMealEditorRender();

const groupedIngredients = [{ name: "hvitløk, finhakket", amount: "2", unit: "stk", group: "Saus" }, { name: "melk", group: "Saus" }, { name: "ris", group: "Tilbehør" }, { name: "salt" }, { name: "olje", group: "Saus" }];
const groupedDetail = renderMealDetailView({ meal: { id: "group", title: "Test" }, ingredients: groupedIngredients, escapeHtml });
assert.equal((groupedDetail.match(/ingredient-group-heading/g) || []).length, 3);
assert.match(groupedDetail, /<strong>hvitløk<\/strong>, finhakket/);
assert.doesNotMatch(groupedDetail, /<strong>hvitløk, finhakket<\/strong>/);
const groupedEditor = renderMealEditorView({ meal: { id: "group", title: "Test" }, ingredients: groupedIngredients, escapeHtml });
assert.match(groupedEditor, /Overskrift, for eksempel Saus/); assert.match(groupedEditor, /data-add-ingredient-heading/);
assert.match(groupedEditor, /data-move-ingredient-heading/); assert.match(groupedEditor, /value="Saus"/);
assert.match(groupedEditor, /maxlength="60"/); assert.match(groupedEditor, /data-ingredient-heading="true"/);
const xssGroup = renderMealDetailView({ meal: { id: "group", title: "Test" }, ingredients: [{ name: "a, <script>", group: "<img>" }], escapeHtml });
assert.doesNotMatch(xssGroup, /<img>|<script>/); assert.match(xssGroup, /&lt;img&gt;/);

for (const [ingredients, steps, conflict] of [[true, true, "ingredienser og fremgangsmåte"], [true, false, "ingredienser"], [false, true, "fremgangsmåte"]]) {
  const choice = renderMealEditorView({ meal: { title: "Test" }, importAvailable: true,
    aiKeyStatus: { configured: true, status: "connected" },
    recipeImport: { showText: true, message: "Ingenting ble endret.", warnings: ["Kontroller porsjonene"], pending: {
      recipe: { ingredients: [{ name: "Vare" }], steps: ["Steg"] }, conflictIngredients: ingredients, conflictSteps: steps,
    } }, escapeHtml });
  assert.match(choice, /<h4 id="recipeImportChoiceTitle">Ikke alt ble byttet<\/h4>/);
  assert.match(choice, new RegExp(`Oppskriften hadde ${conflict} fra før, og ${ingredients ? "de" : "den"} står urørt\\.`));
  assert.match(choice, new RegExp(`Importen fant ${ingredients && steps ? "1 ingredienser og 1 steg" : ingredients ? "1 ingredienser" : "1 steg"}\\.`));
  assert.match(choice, /recipe-import-choice" data-import-choice/);
  assert.match(choice, /data-import-replace>Bytt til de importerte/);
  assert.match(choice, /data-import-keep>Behold mine/);
  assert.doesNotMatch(choice, /0 ingredienser|0 steg/);
  assert.doesNotMatch(choice, /data-import-fetch/);
  assert.match(choice, /data-import-interpret[^>]*>Hent fra tekst/);
  assert.match(choice, /Kontroller porsjonene/);
  assert.doesNotMatch(choice, /Ingenting ble endret\./);
}

for (const [busy, preparing, available] of [[false, false, true], [true, false, true], [false, true, true], [false, false, false]]) {
  const html = renderMealEditorView({ meal: { title: "Test" }, importAvailable: available,
    aiKeyStatus: { configured: true, status: "connected" }, recipeImport: { busy, preparing, mode: "image", showImages: true,
      images: [{ data: "PRIVATE_IMAGE_BYTES", name: "private.jpg" }, { data: "OTHER_BYTES" }] }, escapeHtml });
  assert.match(html, /Velg bilder eller ta bilde/); assert.match(html, /type="file" accept="image\/\*" multiple/);
  assert.match(html, /Bilde 1/); assert.match(html, /Bilde 2/); assert.match(html, /aria-label="Fjern bilde 2"/);
  assert.doesNotMatch(html, /PRIVATE_IMAGE_BYTES|OTHER_BYTES|private\.jpg|<img/);
  assert.match(html, busy || preparing || !available ? /data-import-images disabled>Hent fra 2 bilder/ : /data-import-images >Hent fra 2 bilder/);
  if (busy) assert.match(html, /Leser bildene … Det kan ta opptil et minutt/);
  if (preparing) assert.match(html, /Klargjør bilder/);
}
console.log("meals render tests ok");
const portionsHtml=renderMealDetailView({meal:{id:"a",title:"Test"},targetServings:5,baseServings:4,servingScope:"Gjelder mandag 12. okt."});
assert.match(portionsHtml,/data-recipe-servings="-1"/);assert.match(portionsHtml,/data-recipe-servings="1"/);
assert.match(portionsHtml,/5 porsjoner/);assert.match(portionsHtml,/Gjelder mandag 12\. okt\./);
assert.match(renderMealDetailView({meal:{title:"Test"},targetServings:1}),/aria-label="Færre porsjoner" disabled/);
assert.match(renderMealDetailView({meal:{title:"Test"},targetServings:30}),/aria-label="Flere porsjoner" disabled/);
for (const remainingToday of [0, 1, 30, 31, 150, null, -1, 2.5]) {
  const html = renderMealEditorView({ meal: { title: "Test" }, importAvailable: true,
    aiKeyStatus: { configured: true, status: "connected" }, recipeImport: { expanded: true, remainingToday }, escapeHtml });
  if (Number.isInteger(remainingToday) && remainingToday >= 0 && remainingToday <= 30) assert.ok(html.includes(`${remainingToday} importer igjen i dag.`));
  else assert.doesNotMatch(html, /importer igjen i dag/);
}

// v107: row menus and insertion at each group boundary.
const menuRows = [{name:'salt'}, {type:'heading',title:'Mat'}, {name:'gulrot'}, {type:'heading',title:''}, {name:'mel'}];
const rowMenu = index => renderEditorRowMenuView({kind:'ingredient', index, ingredients:menuRows, escapeHtml});
assert.match(rowMenu(0), /action="up" disabled/);
assert.match(rowMenu(4), /action="down" disabled/);
assert.match(rowMenu(2), /Uten overskrift/); assert.match(rowMenu(2), /Overskrift uten navn/);
assert.ok(!rowMenu(2).includes('>Mat</button>'));
assert.match(rowMenu(2), /Flytt opp/); assert.match(rowMenu(2), /Flytt ned/); assert.match(rowMenu(2), /Fjern/);
assert.doesNotMatch(renderEditorRowMenuView({kind:'ingredient',index:0,ingredients:[{name:'Salt'}]}), /Flytt til/);
assert.doesNotMatch(renderEditorRowMenuView({kind:'step',index:0,steps:['Kok']}), /Flytt til/);
assert.match(renderEditorRowMenuView({kind:'step',index:0,steps:['Kok']}), /Valg for steg 1/);
const menuIngredient = renderIngredientEditorRowView({item:{name:'<gulrot>',amount:'1',unit:'stk'},escapeHtml});
assert.match(menuIngredient, /aria-label="Valg for &lt;gulrot&gt;"/); assert.ok(menuIngredient.includes('>⋯</button>'));
assert.doesNotMatch(menuIngredient, /data-remove-ingredient/);
assert.match(renderIngredientEditorRowView({item:{name:'',amount:'',unit:''}}), /Valg for ingrediens/);
assert.match(renderIngredientEditorRowView({item:{type:'heading',title:'Mat'},index:1,totalRows:2}), /data-direction="1" aria-label="Flytt overskrift ned" disabled/);
assert.ok(renderStepEditorRowView({step:'Stek',index:2}).includes('step-editor-number">3</div>'));
assert.ok(renderStepEditorRowView({step:'Stek'}).includes('>⋯</button>'));
const groupEditor = renderMealEditorView({meal:{title:'Test'},ingredients:menuRows,steps:['Kok'],rowMenu:{kind:'ingredient',index:2},escapeHtml});
assert.equal((groupEditor.match(/data-add-ingredient-group=/g)||[]).length,2);
assert.match(groupEditor, /role="dialog" aria-modal="true"/);
assert.ok(groupEditor.indexOf('</form>') < groupEditor.indexOf('editor-row-menu-backdrop'));
const css = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
assert.match(css, /grid-template-columns: 64px 72px minmax\(0, 1fr\) 44px/);
assert.match(css, /\.ingredient-editor-row \.icon-button\s*\{\s*width: 44px;\s*height: 44px;/);
assert.match(css, /\.editor-row-menu-actions \.button\s*\{ min-height: 44px;/);
assert.match(css, /\.editor-row-menu-actions \{[^}]*overflow-y: auto/);
// At 375 px the grid reserves the same width as v106, so the name field does not shrink.
assert.equal(64 + 72 + 44 + 3 * 6, 70 + 78 + 32 + 3 * 6);
assert.equal(20 + 44 + 2 * 6, 32 + 32 + 2 * 6);

// v110: intrinsic SVG size must not expand with a full-width recipe button.
const buttonRule = /\.button\s*\{([^}]+)\}/.exec(css)?.[1] || "";
assert.match(buttonRule, /display:\s*inline-flex/);
assert.match(buttonRule, /align-items:\s*center/);
assert.match(buttonRule, /justify-content:\s*center/);
assert.match(buttonRule, /gap:\s*8px/);
const svgRule = /\.button svg\s*\{([^}]+)\}/.exec(css)?.[1] || "";
assert.match(svgRule, /width:\s*1\.25em/);
assert.match(svgRule, /height:\s*1\.25em/);
assert.match(svgRule, /flex-shrink:\s*0/);
assert.doesNotMatch(css, /\.recipe-primary[^{}]*svg\s*\{/);
assert.match(css, /\.button\.recipe-primary\s*\{[^}]*min-height:\s*48px;[^}]*white-space:\s*nowrap/);
assert.match(css, /@media \(max-width: 640px\)\s*\{\s*\.recipe-primary\s*\{\s*width:\s*100%/);
for (const [selector, size] of [[".nav-button svg", 20], [".topbar-settings-button svg", 19]]) {
  const rule = css.slice(css.indexOf(selector)).split("}", 1)[0];
  assert.match(rule, new RegExp(`width:\\s*${size}px`)); assert.match(rule, new RegExp(`height:\\s*${size}px`));
}
const compactGenerate = css.slice(css.indexOf(".shopping-view-header .button svg")).split("}", 1)[0];
assert.match(compactGenerate, /width:\s*18px/); assert.match(compactGenerate, /height:\s*18px/);


// v116: sibling native buttons and one shared edit SVG, with offline coverage.
const card = renderMealCardView({meal:{id:"accessible",title:'Fisk & ris',ingredients:[]},escapeHtml});
assert.doesNotMatch(card,/□|✎|meal-open-btn/);
assert.doesNotMatch(card,/<article[^>]*data-view-meal/);
const cardButtons=[...card.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
assert.equal(cardButtons.length,2);
assert.match(cardButtons[0][1],/data-view-meal="accessible"/);assert.match(cardButtons[0][1],/aria-label="Fisk &amp; ris, åpne oppskrift"/);
assert.match(cardButtons[0][2],/Fisk &amp; ris/);assert.match(cardButtons[0][2],/Mangler oppskrift/);
assert.match(cardButtons[1][1],/data-edit-meal="accessible"/);assert.match(cardButtons[1][1],/aria-label="Rediger Fisk &amp; ris"/);
assert.ok(cardButtons.every(match=>!/<button\b/.test(match[2])),"Buttons must never be nested");
assert.equal(cardButtons[1][2],pencilIcon());assert.equal(weekIcon("pencil"),pencilIcon());
const weekPencil=renderWeekRow({day:"Mandag",dateLabel:"12. okt.",index:0,title:"Fisk",home:true,mealId:"accessible",escapeHtml});
assert.match(weekPencil,/class="pencil-button week-pencil"/);assert.ok(weekPencil.includes(pencilIcon()));
for(const file of ['meals.js','week.js'])assert.match(readFileSync(new URL('../../src/render/'+file,import.meta.url),'utf8'),/import \{ pencilIcon \} from "\.\/icons\.js"/);
const pencilRule=/\.pencil-button\s*\{([^}]+)\}/.exec(css)?.[1];
assert.match(pencilRule,/width:\s*44px/);assert.match(pencilRule,/height:\s*44px/);assert.match(pencilRule,/background:\s*transparent/);assert.match(pencilRule,/border:\s*none/);assert.match(pencilRule,/color:\s*var\(--muted\)/);
assert.match(css,/\.pencil-button svg\s*\{[^}]*width:\s*18px;[^}]*height:\s*18px/);
const sw=readFileSync(new URL('../../service-worker.js',import.meta.url),'utf8');assert.equal(sw.split('src/render/icons.js').length-1,2);
