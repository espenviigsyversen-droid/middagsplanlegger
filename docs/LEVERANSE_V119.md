# Leveranse v119 – rulleposisjon ved skjermbytte

Dato: 14. oktober 2026. Utgangspunkt: v118 med rettingen av kildelenker.

## Resultat

Nye skjermbilder framover og nye faner starter øverst. Tilbake viser skjermen på posisjonen den hadde da den ble forlatt; ukjente posisjoner starter på 0. Samme skjermnøkkel gir ingen rulling ved avhuking, ukebytte, synk, åpne/lukke vinduer eller vanlig re-tegning. V108-vindusposisjoner og fokusbevaring er beholdt.

Trykk på allerede vist rotfane ruller til toppen med smooth, eller auto ved prefers-reduced-motion. Ingen render eller historikkoppføring er nødvendig for dette. Trykk på en fane fra oppskrift/editor åpner rotfanen øverst.

## Skjermnøkkel, retning og tidspunkt

- **src/ui/page-scroll.js, pageScreenKey:** editor:<id> når editoren faktisk vises i meals, recipe:<id> i oppskriften, ellers kanonisk activeView. calendar/planner tolkes som week. Vinduer inngår ikke. AI-innstillinger har egen nøkkel selv om editorens arbeid beholdes.
- **pageScrollTarget:** ren funksjon som returnerer null ved lik nøkkel, 0 ved framover/fane og husket posisjon eller 0 ved tilbake.
- **createPageScroll:** Map og siste skjermnøkkel bare i minnet. beforeRender husker posisjonen på skjermen som forlates. history.scrollRestoration settes til manual. Tilgangsskjerm nullstiller minnet.
- **app.js, navigate/withPageScrollDirection:** framover som standard, tab ved fanebytte. backInApp markerer back både fra appknappen og popstate. Avbryt/Forkast og sletting markerer også back. Retningen gjelder bare den synkrone handlingen og arves ikke av senere callbacks.
- **app.js, render:** frigjør aktiv middagsvelgerlås ved nøkkelbytte, måler den opprinnelige posisjonen, tegner, binder hendelser og gjenoppretter v108-fokus/vinduer. Målposisjonen settes synkront til slutt, før neste maling. En eventuell ny velgerlås tas etter målet er satt. Ved samme nøkkel beholdes gammel lås-/opplåsingsflyt.

Rulleminnet ligger ikke i state, localStorage, history.state, synk eller sikkerhetskopi. Ingen datamodell- eller synkendring.

## Retur fra redigering

Gjennomgangen fant at tidligere Avbryt og Lagre gikk til listen. Dette er tilpasset den bestilte v119-flyten med runtime mealEditorReturn og felles openMealEditor.

Rediger fra en oppskrift beholder oppskriftens ID, previousView og dagskontekst. Editorens historikknivå ligger over oppskriften, slik at Avbryt eller tilbake viser samme oppskrift på dens tidligere posisjon. Rediger/Ny fra listen returnerer til listen. V117-forkastingsarket beskytter fortsatt endringer og påvirker ikke skjermnøkkelen.

Lagre åpner den lagrede oppskriften framover på 0. Tilbake derfra gir opprinnelig liste/Uke/Handle. Sletting går til denne foreldrevisningen på husket posisjon, uten å åpne en slettet oppskrift. Returtilstanden er bare i minnet, beholdes ved besøk i AI-innstillinger og forkastes når editoren avsluttes eller ved fane-/tilgangsbytte. Oppskrifts- og ukepatcher ved lagring/sletting bruker samme domenesynk som før.

## Endrede filer per mappe

### Roten

| Fil | Endring |
|---|---|
| app.js | Rullekontroller i render, kortvarig retning i navigasjon/tilbake, fanehandlinger og editorens retur/felles åpning. Lagre åpner oppskrift og sletting returnerer til forelder. V119/119. |
| index.html | Alle tre versjonsparametre til 119. |
| service-worker.js | Cache middagsplan-v119 og page-scroll.js i begge asset-listene. Strategien er uendret. |
| AGENTS.md | Regler om skjermnøkkel, retning, rullelås, historikk, minne og nye testkommandoer. |

### src/ui

| Fil | Status og endring |
|---|---|
| page-scroll.js | Ny: ren skjermnøkkel/målbeslutning og kontroller for rulleminne/manual restoration. |

### tests/ui

| Fil | Status og endring |
|---|---|
| page-scroll.test.mjs | Ny: fram/tilbake/fane/samme, ukjent posisjon, samme oppskrift åpnet igjen, editor/AI/vinduer/kanoniske navn, nullstilling og begge asset-listene. |

### tests/app

| Fil | Status og endring |
|---|---|
| page-scroll.test.mjs | Ny: faktiske appfunksjoner med simulert scrollY/History. Liste/oppskrift/editor, Avbryt/popstate, ny/forkastingsark, avhuk/synk/ukebytte, faner/redusert bevegelse, innstillinger/AI-retur, lås, Lagre/sletting, dagskontekst og ingen varig lagring. |
| navigation.test.mjs | Editor åpnet fra oppskrift har denne som forelder og Avbryt går dit. Deretter Tilbake til den opprinnelige visningen. Øvrige vindus-/historikk-/utkasttester beholdes. |
| window-scroll.test.mjs | Underliggende Uke rulles til 330 etter skjermankomst i testoppsettet. Eksisterende v108-lås-/fokus-/vindusbevaring forventes fortsatt. |
| workflows.test.mjs | Shell-testen åpner Handle før kontroll av brand-toppfelt, siden Lagre nå viser oppskriften. Forventet backup-appversjon v119; domene-/backupkontroller uendret. |
| access-startup.test.mjs | Blokkeringsfixture 120, over aktuell versjon. Minimum er uendret. |

### docs

| Fil | Status og endring |
|---|---|
| ARCHITECTURE.md | Modul, nøkkel/retning, tidspunkt, samspill med lås og editorens retur. |
| STATE_MODEL.md | Rulleminne, retning og mealEditorReturn som runtime, uten lagring/synk/backup. |
| RELEASE.md | Kontrollpunkter etter eiers publisering på PC/iPhone. |
| LEVERANSE_V119.md | Ny: denne rapporten. |

Eier tar med **11 endrede og 4 nye filer** i GitHub Desktop. Ingen slettede prosjektfiler. Den nye modulen må publiseres sammen med appen.

## Kontrollresultater

- Alle **54 testskript** under tests/ og functions/tests/ består uten nettverk.
- **45 kildefiler** består node --check: app.js, service-worker.js, alle src-moduler, functions/index.js og functions/lib. Functions er kontrollert, ikke endret.
- Oppstartstesten kontrollerer også det innebygde HTML-skriptets syntaks. CSS er uendret og har balanserte klammer.
- V108-testene for rullbare vinduer, fokus, tellere og middagsvelgerens lås består. De eksisterende domenesynk-/import-/backup-/tilgangstestene består.
- Begge asset-listene inneholder page-scroll.js. APP_VERSION/APP_VERSION_NUMBER, HTML-parametre og CACHE_NAME er v119/119. REQUIRED_MIN_APP_VERSION forblir 106.

### Faktiske posisjoner i lokal Chrome

En midlertidig lokal kontroll tegnet appfunksjonene med 60 syntetiske oppskrifter ved 1280 px, fra filer i prosjektet. Firebase-oppstart og service worker ble utelatt i denne kontrollkopien. Nettverk var blokkert og kontrollen registrerte **0 HTTP-forespørsler**. Ingen ekte data eller sky ble brukt.

| Handling | Målt scrollY |
|---|---:|
| Rullet oppskriftsliste | 1200 |
| Åpne oppskrift | 0 |
| Rull til 800 og re-tegn samme oppskrift | 800 |
| Tilbake til liste | 1200 |
| Åpne Rediger fra oppskrift rullet til 800 | 0 |
| Avbryt fra editor rullet til 350, med den faktiske Avbryt-knappen | 800 |
| Lagre fra editor rullet til 350, med den faktiske Lagre-knappen | 0 |

history.scrollRestoration var manual. Resultatene ble også kontrollert etter to animation frames, slik at en sen nettleserrestaurering ikke skulle skjules. Midlertidig kontrollskript, HTML/modulkopi og nettleserprofil er slettet.

Ekte iPhone/PWA/Safari, tilbake-sveip, skjermtastatur, touch og animasjon ved aktiv fane er ikke prøvd på telefon. Retning/popstate, smooth/auto-valg og fokus/lås er dekket av lokale tester; enhetskontrollene står i RELEASE.md.

## Rammer

Ingen nettverk, installasjon, publisering eller Git-kommandoer. Ingen endring i functions/, firestore.rules, datamodell, Firestore-struktur, src/sync/ eller skysynk. Hash-kontroll bekrefter at functions/, regler, synkmoduler og styles.css er uendret. Ingen andre mapper enn middagsplanlegger er endret. Lokal nettleser/runtime ble brukt uten installasjon.
