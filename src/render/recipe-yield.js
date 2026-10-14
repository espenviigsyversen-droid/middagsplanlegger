import { recipeYieldEditorValues } from "../domain/recipe-yield.js";

export function renderRecipeYieldEditor(meal, escapeHtml = String) {
  const { amount, unit, approximate } = recipeYieldEditorValues(meal);
  const pieces = unit.trim() && unit.trim().toLocaleLowerCase("nb") !== "porsjoner";
  return `<fieldset class="recipe-yield-editor"><legend>Oppskriften gir</legend>
    <div class="recipe-yield-fields">
      <label>Antall<input class="input" type="text" inputmode="numeric" pattern="[0-9]*" name="yieldAmount" data-yield-amount value="${escapeHtml(amount)}" required aria-label="Antall oppskriften gir"></label>
      <label>Enhet<input class="input" type="text" name="yieldUnit" data-yield-unit maxlength="20" value="${escapeHtml(unit)}" required aria-label="Enhet oppskriften gir"></label>
    </div>
    <div class="recipe-yield-shortcuts" aria-label="Velg enhet">${["porsjoner","stk","pannekaker","rundstykker","boller","brød"].map(value=>`<button class="picker-filter" type="button" data-yield-unit-choice="${value}" aria-pressed="${unit.trim().toLocaleLowerCase("nb")===value}">${value}</button>`).join("")}</div>
    <div class="yield-holder" data-yield-holder-section ${pieces?"":"hidden"}>
      <label for="mealBaseServings">Holder til ca.</label>
      <div class="recipe-servings-control"><button class="button secondary" type="button" data-yield-holder="-1" aria-label="Færre personer" ${approximate<=1?"disabled":""}>−</button>
        <label class="recipe-servings-value"><input id="mealBaseServings" type="text" inputmode="numeric" pattern="[0-9]*" name="baseServings" data-yield-holder-input value="${escapeHtml(approximate)}" aria-label="Holder til antall personer"><span>personer</span></label>
        <button class="button secondary" type="button" data-yield-holder="1" aria-label="Flere personer" ${approximate>=30?"disabled":""}>+</button></div>
      <p class="field-hint">Brukes når middagen planlegges i Uke, slik at mengdene passer antallet som spiser.</p>
    </div>
  </fieldset>`;
}
