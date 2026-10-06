# Leveranse v95

Implementert etter utviklerbeskjeden og arkitektens tillegg for leveranse 3. Koden er klar for lokal gjennomgang og publisering fra GitHub Desktop. Firebase-konsollen og produksjonsdata er ikke endret.

## Resultat

- Nytt prosjekt: `middagsplanlegger-6db4e`, fortsatt familie `familien`. Ingen appkode kontakter det gamle prosjektet. Manglende/ulik prosjekt-ID nullstiller lokal domenecache før synk; tomme standarder har ingen eksempeloppskrifter eller eksempelplan.
- Google-popup fra knappetrykk, med kontovalg og Firebase standard persistens. Fullskjerm før innlogging, ved avvist medlemskap, uferdig oppsett og for høy minimumsversjon. Popup-avbrudd er stille; blokkering og nettverksfeil gir norsk melding.
- Konto og medlemmer viser e-post, utlogging og medlemsliste. Administratorer kan legge til, endre og fjerne andre medlemmer. Egen rad beskyttes i UI, skrivehjelper og regler.
- Repoets regler følger nøyaktig arkitektens reviderte regelinnhold, inkludert administratorvern av app/meta. Firebase-konfigurasjonsfilene peker på riktig prosjekt og regelfil.
- Eksplisitt administratoroppsett fra validert sikkerhetskopi med oppsummering/bekreftelse, eller bekreftet tom database. Serverens dokument-ID-er kontrolleres før første write. Fremmede ID-er blokkerer innlesing; delvis innlest samme fil kan prøves igjen. Members røres aldri.
- Gjenoppretting skriver enkeltstående dokumenter med eksisterende format, unionen av seks ukekart og stabil handlevarerekkefølge. Handlemarkør skrives før meta; meta skrives helt til slutt og bare hvis resten lyktes. Automatisk opplasting fra lokal cache og legacy app/state-migrering er fjernet.
- Meta-lytter blokkerer v95 ved minAppVersion over 95. Utlogging, kontobytte og versjonsblokkering stopper lyttere, timere og usendte operasjoner. Lokal state beholdes. Sene async-svar kan ikke sende nye writes etter stopp.
- Offline-medlemsflagget gjelder prosjekt, familie og bruker. Godkjent enhet kan starte med lokale data og «Lokal lagring». Flagget slettes ved utlogging og avvist medlemskap.
- Versjon 95 i APP_VERSION, HTML-parametre og CACHE_NAME. Nye moduler er i begge service worker-assetlistene. Cache-strategien, domenemodellen, forslagmotoren og hovednavigasjonen er beholdt.

## Kontroller

- Skrivetilgang bekreftet med en midlertidig fil, som er slettet.
- Alle 21 testskript: bestått, med lokale stubber og uten nettverk.
- `node --check` for app.js, service-worker.js og alle 18 src-moduler: bestått (20 filer). Testen av oppstartsvernet kontrollerer også syntaksen i det innebygde HTML-skriptet.
- Nye tester dekker validering, oppsummering, dokumentformat, meta sist, feil uten meta, fremmede dokumenter, retry, roller, prosjektcache, offline-flagg og full oppstartsflyt.
- Integrasjonstester kjører de faktiske appfunksjonene og bekrefter at en vanlig medlemssynk bare skriver domenedokumenter, aldri meta; utlogging/versjonsblokkering avslutter lyttere; gamle timer- og lesesvar ikke sender writes; lokale data beholdes.
- Handlelistetestene bekrefter direkte start uten arkivmigrering og at stopp ignorerer sene snapshots, feil og write-bekreftelser og forkaster usendt kø.
- Versjoner og assetlister kontrollert lokalt. Ingen anonymous-login, writeBatch, gamle prosjektkoblinger eller legacy-opplasting i appens oppkoblingskode.
- Ingen Git-kommandoer, nettverkskall, installasjoner, publisering eller full access brukt.

## Avvik og gjenstående akseptanse

Ingen funksjonelle avvik fra den reviderte beskjeden. Den historiske handlelistemigreringshjelperen beholdes med tester, men kjøres ikke ved v95-oppstart eller oppsett. Ingen nye batcher eller transaksjoner med mange dokumenter introduseres.

Firebase-oppsett, publisering av regler, første administrator og sikkerhetskopi-innlesing må gjennomføres av eier etter FIREBASE_OPPSETT.md og «Utrulling av v95» i RELEASE.md. Regler er ikke prøvd mot Firestore/emulator. Faktisk Google-popup og persistens på PC/iPhone, synk mellom enheter, flymodus, avvist konto og endring av minimumsversjon i konsollen er ikke kontrollert mot Firebase.

Offline-oppstart starter ingen synk før en ny innlasting på nett. Handlelisteendringer har fortsatt ingen varig kø og kan erstattes av skylisten. Allerede sendte SDK-operasjoner kan ikke trekkes tilbake. Gjenoppretting gjennomføres fra én administratorenhet om gangen. Ny innlesing krever manuell sletting av app/meta og tømming av meals/weeks/shoppingItems; members beholdes.

## Filer som skal med i GitHub Desktop

Alle nedenstående filer skal inngå i leveransen: 15 endrede og 13 nye, totalt 28. Ingen filer er slettet.

| Mappe | Endrede filer | Nye filer |
| --- | --- | --- |
| Rot | app.js, index.html, styles.css, service-worker.js, AGENTS.md, README.md | firestore.rules, firebase.json, .firebaserc |
| src/sync | firebase.js, shopping.js | access.js, restore.js |
| src/render | setup.js | account.js |
| tests/app | workflows.test.mjs | access-startup.test.mjs |
| tests/sync | firebase.test.mjs, shopping.test.mjs | access.test.mjs, restore.test.mjs |
| tests/render | — | account.test.mjs |
| tests/helpers | — | backup-fixture.mjs |
| docs | ARCHITECTURE.md, STATE_MODEL.md, RELEASE.md | FIREBASE_OPPSETT.md, LEVERANSE_V95.md |

Appkode, moduler og assets må publiseres sammen. Firestore-regler publiseres separat i Firebase-konsollen; GitHub Pages gjør ikke dette.
