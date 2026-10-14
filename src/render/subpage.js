export function renderSubpageBar({ backAttribute = "data-subpage-back", actionHtml = "" } = {}) {
  return `<nav class="subpage-bar" aria-label="Underside">
    <button class="subpage-back" type="button" ${backAttribute}><span aria-hidden="true">‹</span> Tilbake</button>
    ${actionHtml ? `<div class="subpage-action">${actionHtml}</div>` : ""}
  </nav>`;
}
