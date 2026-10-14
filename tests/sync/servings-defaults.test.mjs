import assert from "node:assert/strict";
import { servingsDefaultsPatch, createServingsDefaultsTransition } from "../../src/sync/servings-defaults.js";

const state = {family:{familySize:4},servingsByWeek:{"2026-10-05":{0:5,1:4},"2026-10-12":{0:5,1:4,2:7,3:null},"2026-10-19":{0:5}}};
const patch = servingsDefaultsPatch(state,"2026-10-12");
assert.equal(patch.count,3); assert.deepEqual(patch.servingsByWeek["2026-10-05"],{0:5,1:4});
assert.deepEqual(patch.servingsByWeek["2026-10-12"],{0:null,1:null,2:7,3:null});
assert.equal(patch.servingsByWeek["2026-10-19"][0],null); assert.equal(state.servingsByWeek["2026-10-12"][0],5);
assert.equal(servingsDefaultsPatch({...state,servingsByWeek:patch.servingsByWeek},"2026-10-12").count,0);
function fixture(meta={initializedAt:1,minAppVersion:120}) {
  let alive=true, acknowledged, stored=structuredClone(state);const calls=[],done=[];
  const pending=new Promise((resolve,reject)=>{acknowledged={resolve,reject};});
  const transition=createServingsDefaultsTransition({readMeta:async()=>{calls.push("read");return meta;},getState:()=>stored,currentWeek:()=>"2026-10-12",
    enqueue:next=>{calls.push("enqueue");stored.servingsByWeek=next;},waitForWrites:()=>{calls.push("wait");return pending;},
    markDone:async()=>{calls.push("mark");meta.servingsDefaultsV106=true;},onDone:result=>done.push(result),valid:()=>alive});
  return {transition,calls,done,acknowledged,stop:()=>{alive=false;}};
}
const ready={role:"admin",offline:false,weeksReady:true,profileReady:true};
for(const options of [{role:"member"},{offline:true},{weeksReady:false},{profileReady:false}]){
  const f=fixture();assert.equal(await f.transition.run({...ready,...options}),false);assert.deepEqual(f.calls,[]);
}
for(const meta of [{initializedAt:1,minAppVersion:120,servingsDefaultsV106:true},{initializedAt:1,minAppVersion:119},{initializedAt:1,minAppVersion:106},{minAppVersion:120},{initializedAt:1},{initializedAt:1,minAppVersion:"bad"},{initializedAt:1,minAppVersion:121}]){
  const f=fixture(meta);assert.equal(await f.transition.run(ready),false);assert.deepEqual(f.calls,["read"]);
}
const settle=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
const f=fixture(), work=f.transition.run(ready);await settle();assert.deepEqual(f.calls,["read","enqueue","wait"]);assert.equal(f.done.length,0);
f.acknowledged.resolve();assert.equal(await work,true);assert.deepEqual(f.calls,["read","enqueue","wait","read","mark"]);assert.equal(f.done[0].count,3);
await f.transition.run(ready);assert.equal(f.calls.filter(c=>c==="mark").length,1);
const second=fixture({initializedAt:1,minAppVersion:120,servingsDefaultsV106:true});assert.equal(await second.transition.run(ready),false);
for(const interrupt of ["stop","reject"]){const f=fixture(),work=f.transition.run(ready);await settle();
  if(interrupt==="stop"){f.stop();f.acknowledged.resolve();}else f.acknowledged.reject(new Error("Rejected write"));
  assert.equal(await work,false);assert.equal(f.calls.includes("mark"),false);assert.equal(f.done.length,0);
}
console.log("servings default transition tests ok (readiness, idempotence, marker after acknowledgement, interruption)");
