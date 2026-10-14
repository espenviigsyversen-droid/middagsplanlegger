# Leveranse v111 – middagsvelger foran dagsarket

Utgangspunkt: publisert v110. App/nummer/cache/query-parametre er v111/111. REQUIRED_MIN_APP_VERSION er fortsatt 106.

## Endrede filer

Alle filene nedenfor skal tas med i GitHub Desktop. Ingen filer er slettet, og ingen nye klientmoduler er lagt til.

| Mappe | Fil | Endring |
|---|---|---|
| Rot | app.js | openMealPicker/closeMealPicker, midlertidig returdag og posisjon/fokus, logisk dagsarkforelder i historikken og samme retur for alle lukkeflyter. Versjon v111/111. |
| Rot | index.html | Query-parametre 111. |
| Rot | service-worker.js | Bare CACHE_NAME middagsplan-v111. Strategi og asset-lister er uendret. |
| Rot | AGENTS.md | Regel for ett vindu og retur/historikk fra dagsark. |
| tests/app | navigation.test.mjs | Retur fra Planlegger og Kalender, valg/tømt valg, ×/tilbake, samme dag, gjentatte runder og direkte radåpning. |
| tests/app | window-scroll.test.mjs | Ingen samtidig rendering av dagsark/velger. Valg/tømt valg/hurtigmiddag, ×/bakgrunn, rulleposisjon, fokus og sidelås. |
| tests/app | workflows.test.mjs | Forventet eksportversjon v111. |
| tests/app | access-startup.test.mjs | Blokkeringsfixturer 112, over aktuell appversjon. |
| docs | ARCHITECTURE.md | UI-returpunkt, skjult forelder og gjenoppretting av posisjon/fokus. |
| docs | LEVERANSE_V111.md (ny) | Denne rapporten. |

## Oppførsel

Velg middag inne i dagsarket lukker arket og åpner velgeren i én patch. Dagsarket ligger ikke bak velgeren. Valg av middag, Ingen middag, oppretting av hurtigmiddag, ×, trykk på bakgrunnen og tilbake bruker samme closeMealPicker. Den gjenåpner dagsarket for samme dag og viser den oppdaterte planen.

mealPickerReturn lagrer bare returdag og dagsarkets rulle-/fokusopplysninger i minnet. Historikkens nivåliste beholder dagen som logisk forelder mens arket er skjult. Derfor lukker tilbake fra velgeren bare velgeren og returnerer til arket; neste tilbake lukker arket til planen. Gjentatte åpninger bruker eksisterende historikkmønster uten vekst per runde. Direkte ⇄/+ på en rad har ingen retur til dagsark og virker som før.

Den eksisterende v108-koden bevarer velgerens rulleposisjon og fokus gjennom render. Ved retur gjenopprettes dagsarkets posisjon og fokus på Velg middag-knappen med preventScroll:true. Middagsvelgerens sidelås er uendret. Returpunktet slettes etter bruk, ved visnings-/tilgangsbytte og synkstopp; det går aldri inn i domenestate, lokal kopi eller backup.

## Kontroller

- Alle 48 testskript under tests/ og functions/tests/ bestod.
- node --check bestod for alle 41 kildefiler: app.js, service-worker.js, src/**/*.js, functions/index.js og functions/lib/*.js. Oppstartstesten kontrollerer også HTML-oppstartsvernet.
- Dagsark åpnet fra både Planlegger og Kalender: bare velgeren er åpen under valget; riktig dagsark kommer tilbake ved valg, tømt valg, × og tilbake.
- Bakgrunnstrykk lukker; et innvendig klikk gjør det ikke. Hurtigmiddag returnerer også til arket, med valgt ny middag.
- Historikk går velger → dagsark → plan. Fire gjentatte runder beholder samme historikklengde etter første åpning.
- En render-kontroll feiler dersom både dagsark og velger er åpne i testflytene.
- Dagsarkets scrollTop 250 og fokus på planner-meal:2 beholdes ved retur. Velgerens scrollTop 360 og søkefokus beholdes gjennom rerender. Sidelås og sideposisjon virker som før.
- Direkte radåpning starter velgeren øverst og åpner ikke dagsark ved valg/lukking.
- Versjon v111/111, ?v=111 og middagsplan-v111; minsteversjon 106.

Lokale DOM-/History-stubber er brukt. Ekte PC-/iPhone-rulling, trykk og tilbake bør kontrolleres etter eiers publisering.

## Rammer

Ingen nettverk, installasjon, publisering eller Git-kommandoer er brukt. functions/, firestore.rules, src/sync/, datamodell og synklogikk er urørt. CSS/z-index og History-controlleren er også uendret. Ingen mapper utenfor prosjektet er rørt. Eier håndterer commit og publisering i GitHub Desktop.
