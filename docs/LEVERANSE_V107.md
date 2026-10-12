# Leveranse v107 – flytting av ingredienser og steg

Fra publisert v106. App/cache er v107/107; REQUIRED_MIN_APP_VERSION er fortsatt 106. Ingen endring i datamodell, Firestore-stier, synk eller service worker-strategi.

## Endrede filer

Alle filene under skal tas med i GitHub Desktop. Ingen filer er slettet.

| Mappe | Fil | Endring |
|---|---|---|
| Rot | app.js | Radmeny i separat minnetilstand, hendelser for flytting/fjerning/gruppeinnsetting, full skjemaavlesning før handling, fokus/rulling og livsløpsvern. Versjon v107/107. |
| Rot | styles.css | 44×44 px radknapp, uendret plass til ingrediensnavn/stegetekst, gruppeknapp og rullbar radmeny nederst på mobil. |
| Rot | index.html | Versjonsparametre 107. |
| Rot | service-worker.js | CACHE_NAME middagsplan-v107. Asset-lister og strategi er uendret. |
| Rot | AGENTS.md | Regler for editorgrupper, skjemaavlesning, radmeny, minnetilstand og tester. |
| src/domain | meals.js | Rene gruppeoppslag, flytting til gruppe, gruppeinnsetting og flytting/fjerning av steg. |
| src/render | meals.js | ⋯ på ingredienser/steg, radmeny, gruppeknapper og deaktivert ↓ på siste overskriftsrad. |
| tests/domain | meals.test.mjs | Gruppegrenser, tom overskrift, ugruppeområde, eierens eksempel, uendrede øvrige rader, innsetting og steg. |
| tests/render | meals.test.mjs | Tilgjengelige radknapper, menytekster/gruppemål, deaktivering, nummerering, gruppeknapper og mobilbredder/trykkflater. |
| tests/app | editor-rows.test.mjs (ny) | Faktisk editorflyt med DOM-stubber: ulagret tekst, flytting, fjerning, innsetting, fokus/rulling, lukking, menybytte, lagring og minnegrenser. |
| tests/app | workflows.test.mjs | Forventet eksportversjon v107. |
| tests/app | access-startup.test.mjs | Blokkeringsfixturer økt til 108, over aktuell appversjon. |
| docs | ARCHITECTURE.md | Radmeny, gruppeidentitet, fokus, skjema og uendret lagring/synk. |
| docs | RELEASE.md | Testkommando og manuell klientkontroll for v107. |
| docs | LEVERANSE_V107.md (ny) | Denne rapporten. |

## Oppførsel

Ingrediensmenyen inneholder Flytt opp, Flytt ned, Flytt til og Fjern. Flytt til utelater den aktuelle gruppen, tilbyr øvrige overskriftsrader og eventuelt Uten overskrift. Like overskriftstekster identifiseres med radindeks; tomme vises som Overskrift uten navn. Flytting til en gruppe legger ingrediensen nederst før neste overskrift. Flytting opp/ned forbi en overskrift skifter gruppe. Overskrifter beholder ↑/↓/×, med deaktivering ved listegrensene.

Under hver overskriftsgruppe, også en tom gruppe, finnes + Ingrediens. Ny rad får fokus i mengdefeltet. Stegmenyen har Flytt opp/ned og Fjern; stegnummeret følger rekkefølgen. Fjerning av siste ingrediens/steg etterlater en tom rad.

Åpning/lukking og alle radhandlinger leser hele skjemaet før render. Tekst som er skrevet, men ikke lagret, i ingredienser, overskrifter, steg og øvrige oppskriftsfelt bevares. Bare Lagre skriver oppskriften. editorRowMenu er separat minnetilstand, utenfor lokal kopi, synket state og sikkerhetskopi, og forkastes ved lukket/byttet editor, visningsbytte eller endret konto/tilgang. Valg, bakgrunnstrykk og Escape lukker menyen. Flyttet rad får fokus på ⋯ og rulles inn i synsfeltet.

Eierens eksempel er testet: etter flytting fra Chilimajones til Mat lagres fiskepinner, kapteinens fylte, ris, gulrot, soyasaus i den rekkefølgen med group Mat.

## Skjermbeskrivelse ved 375 px

Radmenyen er et ark nederst over en mørk bakgrunn. Overskriften viser Valg for gulrot eller Valg for steg 1, med lukkeknapp til høyre. Handlingene står på hver sin linje; ingrediensmenyen viser deretter Flytt til med gruppenavn. Fjern står nederst. Arket bruker skjermbredden, har 14 px sidepadding og maks 75 % av skjermhøyden; mange grupper kan rulles inne i arket. Lange navn kan bryte over flere linjer. Knapper er minst 44 px høye.

Ingrediensraden har kolonnene 64 px mengde, 72 px enhet, fleksibelt navn og 44 px ⋯, med tre mellomrom på 6 px. Summen av faste kolonner/mellomrom er 198 px, lik v106, så navnefeltet beholder bredden. Stegnummeret bruker 20 px og ⋯ 44 px; stegeteksten beholder også bredden. Gruppeknappen står på egen linje under gruppen.

Beskrivelsen er kontrollert mot rendering og CSS med lokale tester. Det er ikke tatt skjermbilde eller utført visuell kontroll i en ekte nettleser/iPhone; den manuelle kontrollen står i RELEASE.md.

## Kontroller

- Alle 46 testskript under tests/ og functions/tests/ bestod, inkludert det nye editor-rows.test.mjs.
- node --check bestod for alle 39 kildefiler: app.js, service-worker.js, src/**/*.js, functions/index.js og functions/lib/*.js. Oppstarts-testen kontrollerer også syntaksen i HTML-oppstartsvernet.
- Versjonene er v107/107, ?v=107 og middagsplan-v107. Minsteversjonen er uendret 106.
- Ingen filer i functions/ eller firestore.rules er endret.

Ingen funksjonelle avvik fra beskjeden. Ingen nettverk, installasjon, publisering eller Git-kommandoer er brukt. Hemmeligheter og regler er urørt, og ingen andre mapper er endret. Eier håndterer commit og publisering i GitHub Desktop.
