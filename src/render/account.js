export function renderAccessScreen({ access, summary, busy = false, escapeHtml = String }) {
  const e = escapeHtml;
  const retry = '<button class="button secondary" data-access-retry>Prøv igjen</button>';
  const switchAccount = '<button class="button secondary" data-sign-out>Bytt konto</button>';
  let heading, body;
  if (access.kind === "checking") return '<main class="access-screen" aria-busy="true"><p role="status">Kontrollerer innlogging og tilgang...</p></main>';
  if (access.kind === "login") {
    heading = "Logg inn med Google";
    body = '<p>Logg inn for å åpne familiens middagsplan, oppskrifter og handleliste.</p><button class="button" data-google-login>Logg inn med Google</button><button class="button secondary" data-access-retry>Prøv igjen</button>';
  } else if (access.kind === "denied") {
    heading = "Du har ikke tilgang ennå";
    body = `<p>Be en administrator legge til ${e(access.user?.email || "kontoen din")} under Konto og medlemmer.</p>${retry}${switchAccount}`;
  } else if (access.kind === "update") {
    heading = "Appen må oppdateres";
    body = '<p>Familien bruker en nyere appversjon. Oppdater appen før du fortsetter.</p><button class="button" data-refresh-app>Oppdater app</button>';
  } else if (access.kind === "setup") {
    heading = "Databasen er ikke satt opp";
    body = access.role === "admin" ? `<p>Les inn familiens sikkerhetskopi, eller start med en tom database.</p>
      <label class="button restore-file-label">Les inn sikkerhetskopi<input type="file" accept=".json,application/json" data-restore-file ${busy ? "disabled" : ""}></label>
      <button class="button secondary" data-empty-setup>Start med tom database</button>
      ${summary ? `<section class="restore-summary"><h2>Kontroller sikkerhetskopien</h2>
        <p>Eksportdato: ${e(summary.exportedAt)}<br>Appversjon: ${e(summary.appVersion)}</p>
        <p>${summary.meals} oppskrifter · ${summary.weeks} uker · ${summary.items} varer</p>
        <button class="button" data-confirm-restore>Bekreft innlesing</button>
        <button class="button secondary" data-cancel-restore>Avbryt</button></section>` : ""}`
      : `<p>Databasen er ikke satt opp ennå. En administrator må gjøre det først.</p>${retry}`;
    body += switchAccount;
  } else {
    heading = "Appen kunne ikke koble til";
    body = retry + switchAccount;
  }
  return `<main class="access-screen"><section class="access-panel">
    <div class="brand-mark" aria-hidden="true">M</div><h1>${heading}</h1>
    ${access.message ? `<p class="account-message" role="alert">${e(access.message)}</p>` : ""}
    <div class="access-actions" ${busy ? 'aria-busy="true"' : ""}>${body}</div>
    ${busy ? '<p role="status">Arbeider. Vent til oppsettet er ferdig.</p>' : ""}
  </section></main>`;
}

export function renderAccountView({ email = "", role, members = [], message = "", offline = false, busy = false, escapeHtml = String }) {
  const e = escapeHtml;
  return `<section class="view-header"><div><h2 class="view-title">Konto og medlemmer</h2>
    <p class="view-lead">Innlogget som ${e(email)}</p></div><button class="button secondary" data-view="setup">Tilbake</button></section>
    <section class="panel account-panel"><button class="button secondary" data-sign-out>Logg ut</button>
      ${message ? `<p class="account-message" role="status">${e(message)}</p>` : ""}
      ${offline ? '<p>Medlemslisten krever nett. Lokale data er tilgjengelige.</p>' : `<h3>Medlemmer</h3>
      <ul class="member-list">${members.map((member) => {
        const own = member.email === email.toLowerCase();
        return `<li><div><strong>${e(member.email)}</strong>${own ? " · deg" : ""}<span>${member.role === "admin" ? "Administrator" : "Medlem"}</span></div>
          ${role === "admin" && !own ? `<select class="select" aria-label="Rolle for ${e(member.email)}" data-member-role="${e(member.email)}" ${busy ? "disabled" : ""}>
            <option value="member" ${member.role === "member" ? "selected" : ""}>Medlem</option><option value="admin" ${member.role === "admin" ? "selected" : ""}>Administrator</option></select>
            <button class="button secondary compact" data-remove-member="${e(member.email)}" ${busy ? "disabled" : ""}>Fjern</button>` : ""}</li>`;
      }).join("")}</ul>
      ${role === "admin" ? `<form class="member-add-form" data-add-member>
        <label>E-post<input class="input" type="email" name="email" required autocomplete="email" ${busy ? "disabled" : ""}></label>
        <label>Rolle<select class="select" name="role" ${busy ? "disabled" : ""}><option value="member">Medlem</option><option value="admin">Administrator</option></select></label>
        <button class="button" type="submit" ${busy ? "disabled" : ""}>Legg til medlem</button><p>Adressen må være en Google-konto.</p></form>` : ""}`}
    </section>`;
}
