import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

// Real rendering and event handlers, with a small local DOM stub that replaces nodes on innerHTML.
const appUrl = new URL("../../app.js", import.meta.url);
let source = await readFile(appUrl, "utf8");
const imports = /import\s+(\{[\s\S]*?\})\s+from\s+"([^"]+)";/g, bindings = {};
for (const match of source.matchAll(imports)) {
  const module = await import(new URL(match[2], appUrl));
  for (const entry of match[1].slice(1, -1).split(",").filter(item => item.trim())) {
    const [name, alias = name] = entry.trim().split(/\s+as\s+/); bindings[alias] = module[name];
  }
}
source = source.replace(imports, "").replace(/render\(\);\s*initFirebaseSync\(\);\s*$/, "");
const decode = value => value.replaceAll("&quot;", '"').replaceAll("&#039;", "'")
  .replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
const documentEvents = {};
const document = { activeElement: null, addEventListener(type, fn) { documentEvents[type] = fn; }, visibilityState: "visible",
  documentElement: { scrollTop: 0 }, body: { style: {} } };
const classes = new Set();
document.body.classList = { contains: key => classes.has(key), add: key => classes.add(key), remove: key => classes.delete(key),
  toggle: (key, on) => on ? classes.add(key) : classes.delete(key) };
const focusCalls = [], scrollWrites = [], storage = new Map();
class Node {
  constructor(tag = "div", attrs = {}) {
    this.tagName = tag; this.attrs = attrs; this.children = []; this.parent = null; this.style = {}; this.handlers = {};
    this.dataset = Object.fromEntries(Object.entries(attrs).filter(([key]) => key.startsWith("data-"))
      .map(([key, value]) => [key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), value]));
    this.checked = "checked" in attrs; this.value = attrs.value || ""; this.disabled = "disabled" in attrs; this._scrollTop = 0;
  }
  get scrollTop() { return this._scrollTop; }
  set scrollTop(value) { this._scrollTop = value; scrollWrites.push([this.dataset.scrollKey, value]); }
  matches(selector) {
    if (selector.startsWith(".")) return (this.attrs.class || "").split(/\s+/).includes(selector.slice(1));
    if (selector.startsWith("#")) return this.attrs.id === selector.slice(1);
    const attribute = /^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selector);
    return attribute ? attribute[1] in this.attrs && (attribute[2] === undefined || this.attrs[attribute[1]] === attribute[2])
      : this.tagName === selector;
  }
  querySelectorAll(selector) { return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { return this.matches(selector) ? this : this.parent?.closest(selector) || null; }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  addEventListener(type, fn) { this.handlers[type] = fn; }
  focus(options) {
    document.activeElement = this; focusCalls.push({ key: this.dataset.focusKey, options });
    // Model the unwanted scroll when focus() is called without preventScroll.
    if (!options?.preventScroll) { const scroller = this.closest("[data-scroll-key]"); if (scroller) scroller.scrollTop = 0; }
  }
  blur() { if(document.activeElement===this) document.activeElement=null; }
  select() {}
  setSelectionRange() {}
  scrollIntoView() {}
  set innerHTML(html) {
    const replacedFocusedNode = this.contains(document.activeElement);
    this.html = html; this.children = [];
    const stack = [this], voidTags = new Set(["input", "br", "hr", "img", "path", "circle", "rect"]);
    for (const match of html.matchAll(/<\/?([a-z][\w-]*)\b([^>]*)>/gi)) {
      const tag = match[1].toLowerCase();
      if (match[0].startsWith("</")) {
        if (stack.at(-1)?.tagName === tag) stack.pop();
        continue;
      }
      const attrs = Object.fromEntries([...match[2].matchAll(/([\w-]+)(?:="([^"]*)"|='([^']*)')?/g)]
        .map(attribute => [attribute[1], decode(attribute[2] ?? attribute[3] ?? "")]));
      const child = new Node(tag, attrs); child.parent = stack.at(-1); child.parent.children.push(child);
      if (!voidTags.has(tag) && !match[0].endsWith("/>")) stack.push(child);
    }
    if (replacedFocusedNode && !this.contains(document.activeElement)) document.activeElement = null;
  }
  get innerHTML() { return this.html || ""; }
}
const app = new Node();
document.querySelector = selector => selector === "#app" ? app : null;
const pageScrolls = [];
const media = {matches:false,addEventListener(type,fn){this.changed=fn;}};
const window = { matchMedia:query=>query==="(min-width: 900px)"?media:{matches:false},addEventListener() {}, scrollY: 330, scrollTo: (x, y) => { pageScrolls.push([x, y]); window.scrollY = y; } };
const context = vm.createContext({ ...bindings, structuredClone, Date, Blob, File, URL, console, document, window,
  navigator: { onLine: false }, setTimeout() {}, clearTimeout() {},
  localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
vm.runInContext(source, context);
const run = code => vm.runInContext(code, context);


const json=code=>JSON.parse(run('JSON.stringify('+code+')'));
const click=selector=>{const node=app.querySelector(selector);assert.ok(node,selector);node.focus({preventScroll:true});node.handlers.click({preventDefault(){}});};
run('accessState={kind:"ready",offline:false};loadAiKeyStatus=async()=>{};var writes=[];shoppingSync={enqueue:diff=>writes.push(diff),stop(){}};state.shoppingList=normalizeShoppingList({items:[{id:"milk",name:"Melk",amount:"2",unit:"l",category:"dairy",oda:true},{id:"flour",name:"Sammalt hvete, fin",amount:"2",unit:"dl",category:"dry"},{id:"egg",name:"Egg",amount:"12",unit:"stk",category:"dairy"}]});navigate({activeView:"shopping"})');
assert.equal(run('odaExpanded'),false);click('[data-toggle-oda-box]');assert.equal(run('odaExpanded'),true);assert.ok(app.querySelector('[data-toggle-item="milk"]'));
run('navigate({activeView:"oda"})');assert.deepEqual(json('navigationLevels()'),['page:oda']);assert.equal(window.scrollY,0);
const timestamp=run('state.clientUpdatedAt'),pending=run('state.pendingLocalSync');
window.scrollY=600;const flour=app.querySelector('[data-oda-item="flour"]');flour.focus({preventScroll:true});flour.handlers.change();
assert.equal(run('state.shoppingList.items.find(i=>i.id==="flour").oda'),true);assert.equal(window.scrollY,600);assert.equal(document.activeElement.dataset.focusKey,'oda-item:flour');
assert.deepEqual(json('writes.at(-1).updated'),[{id:'flour',fields:{oda:true}}]);assert.equal(run('state.clientUpdatedAt'),timestamp);assert.equal(run('state.pendingLocalSync'),pending);
const search=app.querySelector('[data-oda-search="flour"]');search.handlers.click();assert.equal(search.textContent,'Søkt ✓');assert.equal(run('odaSearched.has("flour")'),true);
run('render()');assert.match(app.innerHTML,/Søkt ✓/);
const egg=app.querySelector('[data-oda-item="egg"]');egg.focus({preventScroll:true});egg.handlers.change();
assert.equal(run('state.shoppingList.items.find(i=>i.id==="egg").oda'),true);
app.querySelector('[data-oda-item="egg"]').handlers.change();assert.equal(run('state.shoppingList.items.find(i=>i.id==="egg").oda'),undefined);assert.deepEqual(json('writes.at(-1).updated'),[{id:'egg',fields:{oda:null}}]);
click('[data-oda-order]');assert.equal(run('state.activeView'),'shopping');assert.equal(run('state.toast.message'),'2 varer merket som bestilt');
assert.equal(run('state.shoppingList.items.find(i=>i.id==="milk").checked'),true);assert.equal(run('state.shoppingList.items.find(i=>i.id==="flour").checked'),true);assert.equal(run('state.shoppingList.items.find(i=>i.id==="egg").checked'),false);
assert.equal(run('state.shoppingList.items.some(i=>i.oda)'),false);
const undo=app.querySelector('[data-toggle-item="milk"]');undo.checked=false;undo.handlers.change();assert.equal(run('state.shoppingList.items.find(i=>i.id==="milk").oda'),undefined);
run('setState({shoppingList:{items:state.shoppingList.items.map(i=>i.id==="milk"?{...i,oda:true}:i)}})');
assert.equal(run('mergeGeneratedShoppingItems([{id:"new",name:"Melk",amount:"1",unit:"l",category:"dairy",custom:false}]).find(i=>i.id==="milk").oda'),true);
run('navigate({activeView:"oda"});navigateBack()');assert.equal(run('state.activeView'),'shopping');
run('navigate({activeView:"oda"});navigate({activeView:"week"},"tab")');assert.equal(run('state.activeView'),'week');
run('saveState()');const local=storage.get('middagsapp-state');assert.doesNotMatch(local,/odaExpanded|odaSearched|Søkt/);assert.doesNotMatch(run('JSON.stringify(syncPayload())'),/odaExpanded|odaSearched|Søkt/);
assert.doesNotMatch(run('JSON.stringify(buildBackup({data:syncPayload(),appVersion:APP_VERSION,familyId:FAMILY_ID,now:new Date()}))'),/odaExpanded|odaSearched|Søkt/);
run('stopAllSync()');assert.equal(run('odaExpanded'),false);assert.equal(run('odaSearched.size'),0);
console.log('Oda app tests ok (selection, per-item diff, focus/scroll, search memory, purchase, checking and navigation)');
