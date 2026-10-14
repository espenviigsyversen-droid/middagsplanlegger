// Shared edit icon for recipe cards and week rows; size belongs to .pencil-button.
export function pencilIcon(label = "") {
  return `<svg class="week-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}><path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m14 5 5 5"/></svg>`;
}
