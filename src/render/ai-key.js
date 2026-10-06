export function aiKeyStatusLabel(status) {
  if (!status) return "Kontrollerer tilkobling …";
  if (!status.configured) return "Ikke satt opp";
  return status.status === "connected" ? "Tilkoblet" : status.status === "invalid" ? "Nøkkelen virker ikke" : "Kunne ikke kontrolleres";
}
export function renderAiKeyView({ status = null, isAdmin = false, available = false, busy = false, returnToEditor = false, message = "", escapeHtml = String } = {}) {
  const disabled = !available || busy ? "disabled" : "";
  return `<section class="view-header"><div><h2 class="view-title">AI og oppskriftsimport</h2></div>
    <button class="button ghost" ${returnToEditor ? "data-ai-key-return-editor" : 'data-view="setup"'}>Tilbake</button></section>
    <section class="panel account-panel"><h3>OpenAI <span class="chip" role="status">${escapeHtml(aiKeyStatusLabel(status))}</span></h3>
    ${status?.masked ? `<p>API-nøkkel: ${escapeHtml(status.masked)}</p>` : ""}
    ${isAdmin ? `<div class="form"><label for="aiKeyInput">Ny API-nøkkel</label>
      <input id="aiKeyInput" class="input" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" data-ai-key-input maxlength="300" ${disabled}>
      <div class="form-actions"><button class="button" type="button" data-ai-key-save ${disabled}>Lagre og valider</button>
      <button class="button secondary" type="button" data-ai-key-test ${disabled || (!status?.configured ? "disabled" : "")}>Test tilkobling</button>
      <button class="button ghost danger" type="button" data-ai-key-delete ${disabled || (!status?.configured ? "disabled" : "")}>Slett nøkkel</button></div></div>`
      : "<p>Bare administratorer kan endre nøkkelen.</p>"}
    ${busy ? '<p role="status">Kontrollerer OpenAI …</p>' : ""}
    ${message ? `<p role="status">${escapeHtml(message)}</p>` : ""}
    ${!available ? '<p class="field-hint">Krever innlogging og nett.</p>' : ""}
    <p>Nøkkelen sendes til serveren, kontrolleres og lagres kryptert. Den lagres ikke i appen, nettleseren eller sikkerhetskopien.</p>
    <p>Oppskriftstekst, nettsideinnhold og bilder sendes til OpenAI bare når du selv trykker Hent, Tolk tekst eller Tolk bilder.</p></section>`;
}
