import assert from "node:assert/strict";
import {
  selectPickerSuggestions,
  scoreDayType,
  scoreVariation,
  suggestionScoreBreakdown,
  mealMatchesPickerFilters,
  scoreCategoryPreference,
  scoreMealFit,
  scoreMealRecency,
  scoreRecentCategoryUse,
} from "../../src/domain/suggestions.js";

function testMealRecencyScore() {
  assert.equal(scoreMealRecency(null), 25);
  assert.equal(scoreMealRecency(7), -95);
  assert.equal(scoreMealRecency(14), -58);
  assert.equal(scoreMealRecency(21), -30);
  assert.equal(scoreMealRecency(28), -14);
  assert.equal(scoreMealRecency(35), 10);
}

function testRecentCategoryUseScore() {
  assert.equal(scoreRecentCategoryUse(6), -22);
  assert.equal(scoreRecentCategoryUse(4), -14);
  assert.equal(scoreRecentCategoryUse(2), -6);
  assert.equal(scoreRecentCategoryUse(1), 0);
}

function testMealFitScore() {
  assert.equal(
    scoreMealFit(
      { favorite: true, kidFriendly: true, prepTime: "quick", leftovers: "likely", suitability: ["weekend"] },
      { wantsQuick: true, dayType: "weekend", preferLeftovers: true },
    ),
    69,
  );

  assert.equal(
    scoreMealFit(
      { favorite: false, kidFriendly: false, prepTime: "medium", leftovers: "unlikely", suitability: [] },
      { wantsQuick: true, dayType: "weekday", preferLeftovers: true },
    ),
    10,
  );
}

function testCategoryPreferenceScore() {
  assert.equal(
    scoreCategoryPreference(["fisk", "vegetar"], {
      counts: { fisk: 0, vegetar: 2 },
      goalsByCategory: {
        fisk: { minPerWeek: 1, minEveryWeeks: 2 },
        vegetar: { maxPerWeek: 2 },
      },
      dueCategories: ["fisk"],
    }),
    -10,
  );

  assert.equal(scoreCategoryPreference(["pasta"], { goalsByCategory: {} }), 0);
}

testMealRecencyScore();
testRecentCategoryUseScore();
testMealFitScore();
testCategoryPreferenceScore();


assert.equal(scoreDayType({suitability:["weekend"]},"weekend"),22);
assert.equal(scoreDayType({suitability:[]},"weekend"),10);
assert.equal(scoreDayType({suitability:["weekday"]},"weekend"),-20);
assert.equal(scoreMealRecency(140),30); assert.ok(scoreMealRecency(35)<scoreMealRecency(140));
assert.equal(scoreVariation("2026-10-12",5,"meal"),scoreVariation("2026-10-12",5,"meal"));
for(let i=0;i<100;i++)assert.ok(scoreVariation("2026-10-12",5,String(i))>=0&&scoreVariation("2026-10-12",5,String(i))<=15);
const mixed={id:"a",suitability:["weekend"],favorite:true,kidFriendly:true,prepTime:"quick",leftovers:"likely"};
const options={dayType:"weekend",wantsQuick:true,preferLeftovers:true,daysSince:35,categoryScore:45,recentCategoryUses:2,weekKey:"2026-10-12",dayIndex:5};
const parts=suggestionScoreBreakdown(mixed,options);
assert.equal(parts.dayType,22);assert.equal(parts.marks,16);assert.equal(parts.recency,10);assert.equal(parts.category,39);
assert.equal(parts.total,scoreMealFit(mixed,options)+scoreMealRecency(35)+39+scoreVariation(options.weekKey,5,"a"));
assert.equal(mealMatchesPickerFilters(mixed,{quick:true,kidFriendly:true,favorite:true}),true);
assert.equal(mealMatchesPickerFilters({...mixed,kidFriendly:false},{quick:true,kidFriendly:true}),false);
assert.equal(mealMatchesPickerFilters({...mixed,categories:["fish"]},{category:"fish"}),true);
assert.equal(mealMatchesPickerFilters({...mixed,categories:["fish"]},{category:"veg"}),false);

export const saturdayMeals = [
  ...Array.from({length:3},(_,i)=>({id:"old-"+(i+1),title:"Merket middag "+(i+1),suitability:["weekend"],favorite:true,kidFriendly:true})),
  ...Array.from({length:5},(_,i)=>({id:"weekday-"+(i+1),title:"Hverdagsmiddag "+(i+1),suitability:["weekday"]})),
  ...Array.from({length:22},(_,i)=>({id:"new-"+String(i+1).padStart(2,"0"),title:"Ny middag "+(i+1),suitability:[]})),
];
const beforeFit=meal=>(meal.favorite?20:0)+(meal.kidFriendly?15:0)+(meal.suitability.includes("weekend")?35:0);
let scoreNewWeeks=0,scoreOldWeeks=0,pickerNewWeeks=0;
export let saturdayComparison;
for(let week=0;week<52;week++) {
  const date=new Date(2026,9,12+week*7,12),key=date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");
  const ranked=saturdayMeals.map(meal=>({meal,daysSince:meal.id.startsWith("old-")?35:null,
    score:suggestionScoreBreakdown(meal,{dayType:"weekend",daysSince:meal.id.startsWith("old-")?35:null,weekKey:key,dayIndex:5}).total})).sort((a,b)=>b.score-a.score);
  const top=ranked.slice(0,3),picker=selectPickerSuggestions(ranked);
  if(top.some(entry=>entry.meal.id.startsWith("new-")))scoreNewWeeks++;
  if(top.some(entry=>entry.meal.id.startsWith("old-")))scoreOldWeeks++;
  if(picker.some(entry=>entry.meal.id.startsWith("new-")))pickerNewWeeks++;
  assert.ok(picker.some(entry=>entry.meal.id.startsWith("new-")),"Picker must discover a new meal in week "+week);
  assert.equal(picker.length,3);
  assert.deepEqual(selectPickerSuggestions(ranked),picker);
  if(week===0) {
    const before=saturdayMeals.map(meal=>({title:meal.title,score:beforeFit(meal)+(meal.id.startsWith("old-")?0:18)})).sort((a,b)=>b.score-a.score);
    saturdayComparison={week:key,before:before.slice(0,5),after:ranked.slice(0,5).map(({meal,score})=>({title:meal.title,score})),picker:picker.map(({meal,score,planningLabel})=>({title:meal.title,score,planningLabel}))};
  }
}
export const saturdaySimulation={saturdays:52,pickerNewWeeks,scoreNewWeeks,scoreOldWeeks};
assert.equal(pickerNewWeeks,52);assert.ok(scoreNewWeeks>=15,JSON.stringify(saturdaySimulation));assert.ok(scoreOldWeeks>=30,JSON.stringify(saturdaySimulation));
const equalCandidates=Array.from({length:20},(_,i)=>({id:"equal-"+i}));
const order=day=>equalCandidates.map(meal=>({id:meal.id,score:scoreVariation("2026-10-12",day,meal.id)})).sort((a,b)=>b.score-a.score).map(x=>x.id);
assert.deepEqual(order(0),order(0));assert.notDeepEqual(order(0),order(1));
const shortHistory=[{meal:{id:"a"},daysSince:3},{meal:{id:"b"},daysSince:10},{meal:{id:"c"},daysSince:20}];
assert.deepEqual(selectPickerSuggestions(shortHistory),shortHistory);
assert.equal(selectPickerSuggestions([{meal:{id:"rare"},daysSince:70}])[0].planningLabel,"Ikke i planen på lenge");
assert.equal(selectPickerSuggestions([{meal:{id:"never"},daysSince:null}])[0].planningLabel,"Aldri i planen");
const slotCandidates=[{meal:{id:"a"},score:80,daysSince:30},{meal:{id:"b"},score:70,daysSince:40},{meal:{id:"c"},score:60,daysSince:55},{meal:{id:"d"},score:50,daysSince:56}];
assert.deepEqual(selectPickerSuggestions(slotCandidates).map(x=>x.meal.id),["a","b","d"]);
assert.deepEqual(selectPickerSuggestions(slotCandidates.filter(x=>x.meal.id!=="d")).map(x=>x.meal.id),["a","b","c"]);

// v114 pre-release fix: never planned wins discovery over long-absent favorites.
export const discoveryRegression = [];
const discoveryMeals = saturdayMeals.filter(meal=>!meal.id.startsWith("weekday-"));
for (const favoriteWeeks of [12,5,2]) {
  let withNew = 0;
  for (let week=0;week<52;week++) {
    const date = new Date(2026,9,12+week*7,12);
    const key=date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");
    const ranked = discoveryMeals.map(meal=>({meal,daysSince:meal.id.startsWith("old-")?favoriteWeeks*7:null,
      score:suggestionScoreBreakdown(meal,{dayType:"weekend",daysSince:meal.id.startsWith("old-")?favoriteWeeks*7:null,weekKey:key,dayIndex:5}).total})).sort((a,b)=>b.score-a.score);
    const before = JSON.stringify(ranked), result = selectPickerSuggestions(ranked);
    assert.equal(JSON.stringify(ranked),before,"The picker must not mutate the score ranking");
    assert.deepEqual(result.slice(0,2).map(e=>e.meal.id),ranked.slice(0,2).map(e=>e.meal.id));
    assert.equal(new Set(result.map(e=>e.meal.id)).size,3);
    if(result.some(entry=>entry.meal.id.startsWith("new-")))withNew++;
    assert.ok(result.some(entry=>entry.meal.id.startsWith("new-")&&entry.planningLabel==="Aldri i planen"));
    if(favoriteWeeks===12)for(const entry of result.filter(e=>e.meal.id.startsWith("old-")))assert.equal(entry.planningLabel,"Ikke i planen på lenge");
  }
  discoveryRegression.push({favoriteWeeks,saturdays:52,withNew});
  assert.equal(withNew,52,"Never-planned meal must appear with favorites last planned "+favoriteWeeks+" weeks ago");
}
const prioritized=[{meal:{id:"top-never"},daysSince:null,score:100},{meal:{id:"top-old"},daysSince:84,score:90},{meal:{id:"other-old"},daysSince:70,score:80},{meal:{id:"other-never"},daysSince:null,score:50}];
const selectedDiscovery=selectPickerSuggestions(prioritized);
assert.deepEqual(selectedDiscovery.map(e=>e.meal.id),["top-never","top-old","other-never"]);
assert.deepEqual(selectedDiscovery.map(e=>e.planningLabel),["Aldri i planen","Ikke i planen på lenge","Aldri i planen"]);
const tenWeekCandidates=[{meal:{id:"recent-1"},score:80,daysSince:3},{meal:{id:"recent-2"},score:70,daysSince:14},{meal:{id:"recent-3"},score:60,daysSince:21},{meal:{id:"ten-weeks"},score:50,daysSince:70}];
const tenWeekChoice=selectPickerSuggestions(tenWeekCandidates);
assert.deepEqual(tenWeekChoice.map(e=>e.meal.id),["recent-1","recent-2","ten-weeks"]);
assert.equal(tenWeekChoice[2].planningLabel,"Ikke i planen på lenge");
assert.equal(Object.hasOwn(tenWeekChoice[0],"planningLabel"),false);
assert.equal(Object.hasOwn(selectPickerSuggestions(tenWeekCandidates.slice(0,3))[2],"planningLabel"),false);
assert.deepEqual(selectPickerSuggestions([]),[]);
assert.equal(selectPickerSuggestions(prioritized.slice(0,1)).length,1);


// v115: suitability is one exact, optional marker and combines with every other filter.
assert.equal(mealMatchesPickerFilters({suitability:["weekend"]},{suitability:"weekend"}),true);
assert.equal(mealMatchesPickerFilters({suitability:["weekday"]},{suitability:"weekend"}),false);
assert.equal(mealMatchesPickerFilters({suitability:[]},{suitability:"weekend"}),false);
assert.equal(mealMatchesPickerFilters({},{suitability:"weekend"}),false);
assert.equal(mealMatchesPickerFilters({suitability:[]},{suitability:""}),true);
const weekendQuickFish={suitability:["weekend","guests"],prepTime:"quick",kidFriendly:true,favorite:true,categories:["fisk"]};
assert.equal(mealMatchesPickerFilters(weekendQuickFish,{suitability:"weekend",quick:true,kidFriendly:true,favorite:true,category:"fisk"}),true);
assert.equal(mealMatchesPickerFilters({...weekendQuickFish,prepTime:"long"},{suitability:"weekend",quick:true,category:"fisk"}),false);
assert.equal(mealMatchesPickerFilters(weekendQuickFish,{suitability:"weekday",quick:true,category:"fisk"}),false);
assert.equal(mealMatchesPickerFilters({suitability:["custom-day"]},{suitability:"custom-day"}),true);

console.log("suggestions domain tests ok");
