import assert from "node:assert/strict";
import { renderRecipeImport, renderSocialImportNotice } from "../../src/render/recipe-import.js";
import { renderMealEditorView, renderMealsView } from "../../src/render/meals.js";
import { readFileSync } from "node:fs";
const e=value=>String(value??"").replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const options={isNew:true,meal:{title:"",baseServings:4},aiKeyStatus:{configured:true,status:"connected"},importAvailable:true,escapeHtml:e};
for(const tab of ['url','image','text']){
 const html=renderRecipeImport({...options,recipeImport:{tab,images:[{},{}],text:'Lang oppskriftstekst for import',url:'https://example.com/recipe'}});
 assert.match(html,new RegExp(`data-import-mode="${tab}" aria-pressed="true"`));
 assert.equal(html.includes('data-import-url value='),tab==='url');assert.equal(html.includes('data-import-text maxlength='),tab==='text');assert.equal(html.includes('data-import-image-files'),tab==='image');
}
assert.match(renderRecipeImport(options),/data-import-fetch[^>]*disabled>Hent oppskrift/);
assert.match(renderRecipeImport({...options,recipeImport:{tab:'text'}}),/data-import-interpret disabled>Hent fra tekst/);
assert.match(renderRecipeImport({...options,recipeImport:{tab:'image',images:[{}]}}),/Hent fra 1 bilde/);
const pictures=renderRecipeImport({...options,recipeImport:{tab:'image',images:[{data:'PRIVATE_BYTES'},{}]}});
assert.match(pictures,/Hent fra 2 bilder/);assert.match(pictures,/class="visually-hidden"/);assert.match(pictures,/Fjern bilde 2/);assert.doesNotMatch(pictures,/PRIVATE_BYTES/);
assert.match(renderRecipeImport({...options,recipeImport:{tab:'image',images:[{},{},{},{}]}}),/Hent fra 4 bilder/);
assert.doesNotMatch(renderRecipeImport({...options,recipeImport:{tab:'image',images:[{},{},{},{}]}}),/class="import-image-add"/);
assert.match(renderRecipeImport({...options,isNew:false,meal:{recipeUrl:'https://example.com',ingredients:[{name:'a'}]}}),/data-import-expand aria-expanded="false"/);
assert.match(renderRecipeImport({...options,isNew:false,meal:{recipeUrl:'https://example.com',ingredients:[],steps:[]}}),/recipe-import-panel/);
for(const [host,label]of[['m.instagram.com','Instagram'],['www.facebook.com','Facebook'],['fb.watch','Facebook'],['m.tiktok.com','TikTok']]){
 const url='https://'+host+'/post',html=renderRecipeImport({...options,meal:{recipeUrl:url},recipeImport:{url}});
 assert.match(html,new RegExp(label+' kan ikke hentes direkte'));assert.match(html,/data-import-fetch hidden/);assert.match(html,/Lenken er lagret som kilde/);
 assert.doesNotMatch(renderSocialImportNotice({url},{recipeUrl:'https://example.com/other'},e),/Lenken er lagret som kilde/);
}
const editor=renderMealEditorView({...options,ingredients:[],steps:[]});
assert.match(editor,/form="mealEditorForm">Lagre/);assert.match(editor,/id="mealEditorForm"/);assert.equal((editor.match(/data-cancel-edit/g)||[]).length,1);assert.match(editor,/type="submit">Lagre middag/);assert.match(editor,/Kilde \(lenke\)/);
assert.equal(renderMealsView({editorHtml:editor}),editor);
const dialog=renderMealEditorView({...options,discardOpen:true});assert.match(dialog,/role="alertdialog"/);assert.match(dialog,/Den nye oppskriften er ikke lagret/);assert.match(dialog,/Fortsett å redigere/);assert.match(dialog,/Forkast endringene/);
const css=readFileSync(new URL('../../styles.css',import.meta.url),'utf8');assert.match(css,/\.meal-editor-bar \{ position: sticky; top: 0/);assert.match(css,/\.import-modes \{[^}]*repeat\(3, minmax\(0, 1fr\)\)/);assert.match(css,/\.import-image-grid \{[^}]*repeat\(4, minmax\(0,1fr\)\)/);assert.match(css,/\.recipe-import-panel \.visually-hidden \{[^}]*clip:/);
console.log('recipe import card render tests ok');
