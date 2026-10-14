import { descriptionRepeatsTitle } from "../domain/meals.js";
import { pencilIcon } from "./icons.js";

export function weekIcon(name, label = "") {
  if (name === "pencil") return pencilIcon(label);
  const paths = {
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    refresh: '<path d="M20 7v5h-5"/><path d="M20 12a8 8 0 1 0-2 6"/>',
    swap: '<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    suggest: '<path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1"/><circle cx="12" cy="12" r="2"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  };
  return `<svg class="week-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${paths[name] || ""}</svg>`;
}

export function renderWeekRow({ day, dateLabel, index, title, home, mealId, locked, isToday, ownServings, note, escapeHtml: e }) {
  const hasMeal = home && Boolean(mealId), empty = home && !hasMeal;
  const action = hasMeal ? `data-view-meal="${e(mealId)}" data-recipe-day="${index}"`
    : empty ? `data-open-meal-picker="${index}"` : `data-edit-planner-day="${index}"`;
  const subline = [ownServings ? `${ownServings} porsjoner` : "", note].filter(Boolean).join(" · ");
  const text = empty ? "+ Planlegg middag" : title;
  return `<div class="week-day-row${isToday ? " is-today" : ""}">
    <button class="week-day-main${empty ? " empty" : !home ? " away" : ""}" type="button" ${action} aria-label="${e(day)} ${e(dateLabel)}, ${e(text)}, ${hasMeal ? "åpne oppskrift" : empty ? "velg middag" : "endre dagen"}">
      <span class="week-day-date"><strong>${e(day.slice(0,3))}</strong><small>${e(dateLabel)}</small>${isToday ? '<span class="week-today-label">I dag</span>' : ""}</span>
      <span class="week-day-content"><span class="week-day-title">${e(text)}</span>${subline ? `<small class="week-day-note">${e(subline)}</small>` : ""}</span>
    </button>
    ${locked ? `<span class="week-day-lock">${weekIcon("lock", "Låst")}</span>` : ""}
    ${!empty ? `<button class="pencil-button week-pencil" type="button" data-edit-planner-day="${index}" aria-label="Endre ${e(day.toLowerCase())}">${pencilIcon()}</button>` : ""}
  </div>`;
}

export function renderWeekView({ heading, offset, emptyCount, rowsHtml, windowsHtml, escapeHtml: e }) {
  return `<section class="week-view">
    <header class="week-heading"><button class="week-arrow" type="button" data-week="-1" aria-label="Forrige uke">‹</button>
      ${offset ? `<button class="week-heading-center" type="button" data-week="0" aria-label="Gå til denne uken">` : '<div class="week-heading-center">'}
        <h2>${e(heading.title)}</h2><p>${e(heading.subtitle)}</p>${offset ? "</button>" : "</div>"}
      <button class="week-arrow" type="button" data-week="1" aria-label="Neste uke">›</button></header>
    <div class="week-toolbar"><div>${emptyCount ? `<button class="button week-fill" type="button" data-fill-week>${weekIcon("suggest")} Foreslå til ${emptyCount} ${emptyCount === 1 ? "tom dag" : "tomme dager"}</button>`
      : `<p class="week-complete">${weekIcon("check")} Alle dager er planlagt</p>`}</div>
      <div class="week-tools">${offset ? '<button class="week-today" type="button" data-week="0">I dag</button>' : ""}<button class="week-more" type="button" data-open-planner-actions aria-label="Flere valg for uka">⋯</button></div></div>
    <div class="week-days" data-week-days>${rowsHtml}</div>${windowsHtml}</section>`;
}

export function renderDaySheet({ day, dateLabel, index, locked, home, meal, planLabel, dayMode, dayType, dayNote,
  servings, ownServings, standard, modes, types, escapeHtml: e }) {
  const description = meal && !descriptionRepeatsTitle(meal.title, meal.description) ? meal.description || "" : "";
  return `<div class="modal-backdrop week-backdrop" data-close-planner-day><section class="modal week-sheet week-day-sheet" role="dialog" aria-modal="true" aria-label="Endre ${e(day)}">
    <div class="week-sheet-handle" aria-hidden="true"></div><div class="modal-header"><div><h3>${e(day)}</h3><p class="modal-subtitle">${e(dateLabel)}</p></div><button class="modal-close" type="button" data-focus-key="planner-close" data-close-planner-day aria-label="Lukk">×</button></div>
    <div class="week-sheet-body" data-scroll-key="planner-day">
      <div class="week-meal-card"><h4>${e(home ? meal?.title || "Ingen middag valgt" : planLabel)}</h4>
        <p>${e([description, `${servings} porsjoner`].filter(Boolean).join(" · "))}</p>
        ${home ? meal ? `<button class="button" type="button" data-focus-key="planner-recipe:${index}" data-view-meal="${e(meal.id)}" data-recipe-day="${index}">Åpne oppskrift ›</button>`
          : `<button class="button" type="button" data-focus-key="planner-card-pick:${index}" data-open-meal-picker="${index}">Velg middag</button>` : ""}</div>
      ${home ? `<div class="week-day-actions"><button class="week-outline" type="button" data-focus-key="planner-meal:${index}" data-open-meal-picker="${index}">${weekIcon("swap")} Bytt middag</button>
        <button class="week-outline" type="button" data-focus-key="planner-random:${index}" data-random-day="${index}" ${locked ? "disabled" : ""}>${weekIcon("refresh")} Foreslå annen</button></div>
        ${locked ? '<p class="field-hint week-lock-explanation">Dagen er låst – Foreslå hopper over den</p>' : ""}` : ""}
      <div class="week-day-settings">
        <label class="week-setting"><span>Plan</span><span class="week-setting-choice"><select data-focus-key="planner-mode:${index}" data-day-mode="${index}" aria-label="Plan for ${e(day)}">${modes.map(([key,opt])=>`<option value="${e(key)}" ${key===dayMode?"selected":""}>${e(opt.label)}</option>`).join("")}</select><span aria-hidden="true">›</span></span></label>
        <label class="week-setting"><span>Type dag</span><span class="week-setting-choice"><select data-focus-key="planner-type:${index}" data-day-type="${index}" aria-label="Type dag for ${e(day)}">${types.map(([key,label])=>`<option value="${e(key)}" ${key===dayType?"selected":""}>${e(label)}</option>`).join("")}</select><span aria-hidden="true">›</span></span></label>
        <div class="week-setting"><div><span>Porsjoner</span><small>${ownServings ? "Endret for denne dagen" : "Følger standarden"}</small>${ownServings ? `<button class="text-action" type="button" data-focus-key="planner-standard:${index}" data-use-standard-servings="${index}">Bruk standard (${standard})</button>` : ""}</div>
          <div class="week-portions"><button class="week-outline" type="button" data-focus-key="planner-minus:${index}" data-day-portions="${index}" data-delta="-1" aria-label="Færre porsjoner" ${servings<=1?"disabled":""}>−</button><strong>${servings}</strong><button class="week-outline" type="button" data-focus-key="planner-plus:${index}" data-day-portions="${index}" data-delta="1" aria-label="Flere porsjoner" ${servings>=30?"disabled":""}>+</button></div></div>
        <div class="week-setting"><div><span>Lås dagen</span><small>Låste dager endres ikke av Foreslå</small></div><button class="wake-switch" type="button" role="switch" aria-checked="${locked}" data-focus-key="planner-lock:${index}" data-lock-day="${index}" aria-label="Lås dagen"><span class="switch-track" aria-hidden="true"><span></span></span></button></div>
        <label class="week-note-setting"><span>Notat</span><input class="input" data-focus-key="planner-note:${index}" data-day-note="${index}" value="${e(dayNote)}" placeholder="F.eks. spiser tidlig, trening eller gjester"></label>
      </div>
      ${home && meal ? `<button class="week-remove" type="button" data-focus-key="planner-remove:${index}" data-remove-day-meal="${index}">${weekIcon("trash")} Fjern middag fra ${e(day.toLowerCase())}</button>` : ""}
    </div></section></div>`;
}

export function renderWeekMenu({ heading, emptyDays, replaceCount, escapeHtml: e }) {
  const count = emptyDays.length;
  const fillText = count <= 3 ? `Fyller ${new Intl.ListFormat("nb-NO").format(emptyDays.map(day=>day.toLowerCase()))}. Det som er valgt, beholdes.` : `Fyller ${count} dager. Det som er valgt, beholdes.`;
  return `<div class="modal-backdrop week-backdrop" data-close-planner-actions><section class="modal week-sheet" role="dialog" aria-modal="true" aria-label="Flere valg for uka"><div class="week-sheet-handle" aria-hidden="true"></div>
    <div class="modal-header"><div><h3>Uke ${heading.number}</h3><p class="modal-subtitle">${e(heading.dates)}</p></div><button class="modal-close" type="button" data-focus-key="week-menu-close" data-close-planner-actions aria-label="Lukk">×</button></div>
    <div class="week-sheet-body week-menu-body" data-scroll-key="week-menu"><button class="week-menu-option featured" type="button" data-focus-key="week-menu-fill" data-fill-week ${count?"":"disabled"}>${weekIcon("suggest")}<span><strong>Foreslå til tomme dager</strong><small>${count?e(fillText):"Ingen tomme dager å fylle."}</small></span></button>
      <button class="week-menu-option" type="button" data-focus-key="week-menu-replace" data-replace-open-week ${replaceCount?"":"disabled"}>${weekIcon("refresh")}<span><strong>Foreslå hele uka på nytt</strong><small>Bytter alle middager som ikke er låst (${replaceCount} dager).</small></span></button>
      <div class="week-menu-danger"><button class="week-remove" type="button" data-focus-key="week-menu-clear" data-clear-week>${weekIcon("trash")} Tøm uka …</button><p>Du får spørsmål før noe fjernes.</p></div>
      <button class="week-outline" type="button" data-focus-key="week-menu-cancel" data-close-planner-actions>Avbryt</button></div></section></div>`;
}

export function renderWeekClear({ heading, escapeHtml: e }) {
  return `<div class="modal-backdrop week-backdrop" data-cancel-week-clear><section class="modal week-sheet" role="dialog" aria-modal="true" aria-labelledby="weekClearTitle"><div class="week-sheet-handle" aria-hidden="true"></div>
    <div class="modal-header"><h3 id="weekClearTitle">Tømme uke ${heading.number}?</h3></div><div class="week-sheet-body" data-scroll-key="week-clear">
      <p>Middager, låser, planvalg, dagstyper, porsjoner og notater for ${e(heading.dates)} fjernes.</p>
      <div class="week-day-actions"><button class="week-outline" type="button" data-focus-key="week-clear-cancel" data-cancel-week-clear>Avbryt</button><button class="button danger" type="button" data-focus-key="week-clear-confirm" data-confirm-week-clear>Tøm uka</button></div></div></section></div>`;
}
