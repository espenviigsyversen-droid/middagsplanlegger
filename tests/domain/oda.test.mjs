import assert from "node:assert/strict";
import { normalizeShoppingList, mergeShoppingItems } from "../../src/domain/shopping.js";
import { odaSearchTerm, odaSearchUrl, toggleOdaItem, markOdaOrdered, orderedShoppingItems } from "../../src/domain/oda.js";
import { buildBackup } from "../../src/domain/backup.js";
import { backupFixture } from "../helpers/backup-fixture.mjs";
import { validateBackup, buildRestoreDocuments } from "../../src/sync/restore.js";
const item={id:"a",name:"Melk",amount:"2",unit:"l",category:"dairy",checked:false,custom:true};
for(const value of [true,false,"true",1,undefined]) {
 const result=normalizeShoppingList({items:[{...item,oda:value}]}).items[0];
 assert.equal(Object.hasOwn(result,"oda"),value===true);
}
const selected={...item,oda:true};
const purchased=normalizeShoppingList({items:[{...selected,checked:true}]}).items[0];
assert.equal(Object.hasOwn(purchased,"oda"),false);
assert.equal(Object.hasOwn(normalizeShoppingList({items:[{...purchased,checked:false}]}).items[0],"oda"),false);
assert.equal(mergeShoppingItems([selected],[{...item,id:"new",amount:"1"}])[0].oda,true);
assert.equal(mergeShoppingItems([selected],[{...item,id:"new",amount:"1"}])[0].amount,"3");
assert.equal(Object.hasOwn(mergeShoppingItems([],[item])[0],"oda"),false);
assert.equal(toggleOdaItem([item],"a")[0].oda,true);assert.equal(Object.hasOwn(toggleOdaItem([selected],"a")[0],"oda"),false);
assert.deepEqual(toggleOdaItem([purchased],"a"),[purchased]);assert.equal(selected.oda,true);
assert.equal(markOdaOrdered([selected,item])[0].checked,true);assert.equal(Object.hasOwn(markOdaOrdered([selected])[0],"oda"),false);assert.deepEqual(markOdaOrdered([item]),[item]);
assert.equal(odaSearchTerm("Sammalt hvete, fin"),"sammalt hvete");
assert.equal(odaSearchUrl("Sammalt hvete, fin"),"https://oda.com/no/search/products/?q=sammalt%20hvete");
assert.equal(odaSearchTerm("Melk (lett), kald"),"melk");assert.equal(odaSearchTerm("Ris (stor (pose))"),"ris");
assert.equal(odaSearchUrl("Olje & eddik"),"https://oda.com/no/search/products/?q=olje%20%26%20eddik");
const unordered=[{...item,id:"dry",category:"dry"},{...item,id:"dairy1"},{...item,id:"dairy2"}];
assert.deepEqual(orderedShoppingItems(unordered,[{key:"dairy"},{key:"dry"}]).map(i=>i.id),["dairy1","dairy2","dry"]);
const backup=backupFixture();backup.data.shoppingList.items[0]={...item,oda:true};
const exported=buildBackup({data:backup.data,appVersion:"v125",familyId:"familien",now:new Date()});assert.equal(exported.data.shoppingList.items[0].oda,true);
assert.equal(validateBackup(exported).data.shoppingList.items[0].oda,true);
assert.equal(buildRestoreDocuments(exported).find(d=>d.path[0]==="shoppingItems"&&d.path[1]==="a").data.oda,true);
assert.equal(buildRestoreDocuments(exported).at(-1).data.minAppVersion,125);
for(const bad of ["true",1,null,[],{}]) {const input=structuredClone(exported);input.data.shoppingList.items[0].oda=bad;assert.throws(()=>validateBackup(input),/Ugyldig/);}
console.log("Oda domain tests ok (normalization, checking, merging, ordering, search, backup and restore)");
