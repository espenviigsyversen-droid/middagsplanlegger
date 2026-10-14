import { mealBaseServings, recipeYieldFields } from "./meals.js";
import { roundScaledAmount, formatShoppingAmount } from "./shopping.js";

export function recipeYieldEditorValues(meal) {
  const fields = recipeYieldFields(meal);
  return { amount: String(meal._yieldAmountInput ?? fields.yieldAmount ?? mealBaseServings(meal)),
    unit: String(meal._yieldUnitInput ?? fields.yieldUnit ?? "porsjoner"),
    approximate: meal._yieldApproxServings ?? mealBaseServings(meal) };
}

export function recipeYieldFromInputs({ amount, unit, approximate }) {
  const text = String(amount ?? "").trim(), label = String(unit ?? "").trim();
  const portions = label.toLocaleLowerCase("nb") === "porsjoner";
  if (!/^[0-9]{1,3}$/.test(text) || Number(text) < 1 || Number(text) > (portions ? 30 : 200)
    || label.length < 1 || label.length > 20) return null;
  if (portions) return { baseServings: Number(text) };
  const base = Number(approximate);
  return Number.isInteger(base) && base >= 1 && base <= 30
    ? { yieldAmount: Number(text), yieldUnit: label, baseServings: base } : null;
}

export function recipeYieldView(meal, value, dayContext = false) {
  const fields = recipeYieldFields(meal), base = mealBaseServings(meal);
  const pieces = Boolean(fields.yieldUnit), byCount = pieces && !dayContext;
  return { pieces, byCount, unit: byCount ? fields.yieldUnit : "porsjoner", maximum: byCount ? 200 : 30,
    scaleBase: byCount ? fields.yieldAmount : base, scaleTarget: value,
    ratio: value / (byCount ? fields.yieldAmount : base),
    estimate: pieces && dayContext ? `Gir ca. ${formatShoppingAmount(roundScaledAmount(fields.yieldAmount * value / base))} ${fields.yieldUnit}` : "",
    note: pieces && dayContext ? `Oppskriften gir ${fields.yieldAmount} ${fields.yieldUnit} til ca. ${base} personer.` : "",
    title: byCount ? `Oppskriften gir ${fields.yieldAmount} ${fields.yieldUnit} · holder til ca. ${base} personer` : "",
    scope: byCount && value === fields.yieldAmount ? "Hele oppskriften" : "" };
}
