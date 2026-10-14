import { pencilIcon } from "./icons.js";

export function renderPickerPlansView({ expanded = false, noteDraft = null, plans = [], escapeHtml: e = String } = {}) {
  const noteText = String(noteDraft?.text || "").slice(0, 60);
  if (noteDraft) return `<form class="picker-note-form" data-scroll-key="picker-note" data-picker-note-form>
    <label for="pickerNoteText">Hva skjer denne dagen?</label>
    <input id="pickerNoteText" class="input" type="text" data-picker-note-input data-focus-key="picker-note-input" value="${e(noteText)}" maxlength="60" placeholder="F.eks. cup, bursdag eller gjester" autocomplete="off">
    <button class="button" type="submit" data-picker-note-save ${noteText.trim() ? "" : "disabled"}>Legg inn</button>
    <button class="text-action quiet picker-plan-cancel" type="button" data-focus-key="picker-note-back" data-picker-note-back>Tilbake</button>
  </form>`;
  if (!expanded) return `<button class="picker-plan-option picker-other-plan" type="button" data-focus-key="picker-other-plans" data-picker-other-plans>
    <span class="picker-plan-copy"><strong>Annen plan</strong><small>Spise borte, rester eller eget notat</small></span><span aria-hidden="true">›</span>
  </button>`;
  return '<div class="picker-plan-choices" data-scroll-key="picker-plans"><h4 class="meal-picker-category-title">ANNEN PLAN</h4>'
    + plans.map(([key, option]) => `<button class="picker-plan-option" type="button" data-focus-key="picker-plan:${e(key)}" data-picker-plan="${e(key)}"><span>${e(option.label)}</span><span aria-hidden="true">›</span></button>`).join("")
    + `<button class="picker-plan-option" type="button" data-focus-key="picker-plan-note" data-picker-own-note>${pencilIcon()}<span class="picker-plan-copy">Eget notat</span><span aria-hidden="true">›</span></button>`
    + '<button class="text-action quiet picker-plan-cancel" type="button" data-focus-key="picker-plan-cancel" data-picker-plans-cancel>Avbryt</button></div>';
}
