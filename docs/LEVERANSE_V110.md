# Leveranse v110 – fast ikonstørrelse i knapper

Utgangspunkt: publisert v109. Bare CSS og versjonsmerking er endret i appen. REQUIRED_MIN_APP_VERSION er fortsatt 106.

## Endrede filer

Alle filene nedenfor skal tas med i GitHub Desktop. Ingen filer er slettet, og ingen nye klientmoduler er lagt til.

| Mappe | Fil | Endring |
|---|---|---|
| Rot | styles.css | Felles .button svg med width/height 1.25em og flex-shrink:0. Oppskriftens hovedknapp minst 48 px høy, nowrap og sentrert via eksisterende button-stil. Mobilheaderens ikonavstand 8 px. |
| Rot | app.js | Bare APP_VERSION v110 og APP_VERSION_NUMBER 110. |
| Rot | index.html | Query-parametre 110. |
| Rot | service-worker.js | Bare CACHE_NAME middagsplan-v110; strategi og asset-lister uendret. |
| tests/render | meals.test.mjs | CSS-regresjonskontroll for ikonstørrelse, ingen SVG-overstyring fra recipe-primary, 48 px/nowrap, mobilbredde og bevarte spesialstørrelser. |
| tests/app | workflows.test.mjs | Forventet eksportversjon v110. |
| tests/app | access-startup.test.mjs | Blokkeringsfixturer 111, over aktuell appversjon. |
| docs | LEVERANSE_V110.md (ny) | Denne rapporten. |

## Gjennomgang av alle icon()-knapper

Alle kall til icon() og plasseringen av SVG i rendererene er gjennomgått mot CSS.

| Knapp | Kontroll/resultat |
|---|---|
| Legg i handleliste i oppskrift | Felles 1.25em-ikon krymper ikke. Ikon og tekst står sentrert på én linje. Minst 48 px høy; full bredde ved max-width:640px, ellers naturlig bredde. .button.recipe-primary har nok spesifisitet til å overstyre undersidenes 44 px-minimum. |
| Generer fra plan på Handleliste | Felles 1.25em på PC. Eksisterende mobilregel beholder 18×18 px. Ikonavstanden er 8 px også på mobil (tidligere 6 px). |
| Ny oppskrift | Felles 1.25em og eksisterende inline-flex/sentrering/8 px avstand. Ingen endring i handling eller plassering. |
| Foreslå uke, vanlig knapp i Planlegger | Felles 1.25em og eksisterende inline-flex/sentrering/8 px avstand. |
| Foreslå uke, flytende planner-fab | Har ikke .button og beholder egen 20×20 px-regel. |
| Handle/Kalender/Planlegger/Oppskrifter i bunnmenyen | Har .nav-button og beholder 20×20 px. |
| Innstillinger øverst | Har .topbar-settings-button og beholder 19×19 px. |

Det finnes ingen kombinasjon av .button og .icon-button i dagens markup. .icon-button rammes derfor ikke av den nye SVG-regelen. Ikondefinisjonene profile/swap brukes ikke i noen knapp i dagens app. icon()-funksjonen og all rendering/oppførsel er uendret.

Felles .button hadde allerede display:inline-flex, align-items:center, justify-content:center og gap:8px. Disse beholdes. Det er bare den manglende SVG-regelen, oppskriftens høyde/linjebryting og den eksplisitte mobilavstanden som rettes.

## Kontroller

- Alle 48 testskript under tests/ og functions/tests/ bestod.
- node --check bestod for alle 41 kildefiler: app.js, service-worker.js, src/**/*.js, functions/index.js og functions/lib/*.js. Oppstartstesten kontrollerer også HTML-oppstartsvernet.
- CSS-testen kontrollerer 1.25em/flex-shrink:0, ingen recipe-primary SVG-overstyring, 48 px og nowrap, fortsatt full mobilbredde, samt bunnmeny/innstilling/planner-fab/mobilheaderens egne ikonstørrelser.
- Versjonsmerking er v110/110, ?v=110 og middagsplan-v110. Minsteversjon er uendret 106.

Kontrollen er utført mot kildekode og CSS-regresjonstester. Ny visuell kontroll på ekte PC/iPhone er ikke utført og bør gjøres etter eiers publisering.

## Rammer

Ingen nettverk, installasjon, publisering eller Git-kommandoer er brukt. functions/, firestore.rules, datamodell, synk og oppførsel er urørt. Ingen mapper utenfor prosjektet er rørt. Eier håndterer commit og publisering i GitHub Desktop.
