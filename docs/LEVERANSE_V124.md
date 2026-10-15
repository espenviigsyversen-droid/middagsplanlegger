# Leveranse v124 – Grupperte filtre på mobil og PC

Dato: 15. oktober 2026. Utgangspunkt: v123. App/cache er v124/124. REQUIRED_MIN_APP_VERSION er fortsatt 120.

## Resultat

Oppskrifter har en kompakt filterrad på mobil, med Filtre, antallsmerke for valgte dagstype-/kategori-/annetfiltre, fjernbare grønne brikker og de tre faste flaggene. Uten valg får alle fire kontrollene plass på én rad ved 375 px: tilgjengelig bredde og innholdets rullebredde er begge målt til 339 px. Brikkene er 40 px høye med 13 px tekst. Flere valg gir vannrett rulling.

Mobilens filterark har fire navngitte grupper, umiddelbar filtrering, Nullstill, × og Vis N oppskrifter. Bare relevante grupper vises. Kategoriene sorteres med norsk localeCompare; dagstypene følger Innstillinger. PC fra og med 900 px får åpen ramme med venstre etikettkolonne og brikker som brytes. Mangler oppskrift står etter en skillestrek på EGENSKAPER-raden. Skjul/vis huskes lokalt sammen med sorteringen. Søk og brikker lagres fortsatt ikke.

Velg middag har samme kompakte rad på alle bredder. Filtre viser gruppene inne i vinduet, med egen rulling, maksimal høyde 45vh/45dvh og Ferdig nederst. Gruppen starter lukket ved hver åpning. Forslag, liste, søk, matching og Annen plan-footer er videreført.

## Historikk, fokus og rulling

mealFilterSheetOpen og pickerFilterGroupsOpen er bare runtime-flagg. navigationLevels har meal-filters og picker-filter-groups; tilbake/popstate lukker filterflaten før forelderen. Mobilarket lukkes også med ×, bakgrunn, Escape og resultatknappen, uten å endre valgene. Fokus går til Nullstill ved åpning og tilbake til Filtre ved lukking. Tab/Shift+Tab holdes innenfor dialogen.

Kompakt rad og vertikale grupper har hver sin data-scroll-key. Fokusidentitetene skiller mellom flagg i raden, fjernbare brikker og gruppeknapper; alle er unike. Fokus gjenopprettes med preventScroll, også i PC-rammen som ikke ruller selv. En fjernet brikke gir fokus tilbake til Filtre. Hovedsidens skjermnøkkel endres ikke, og render alene lager ingen historikk. Ved breddebytte 899/900 tegnes riktig variant; et åpent mobilark lukkes ved overgang til PC. Denne breddehendelsen tegner ikke en ulagret editor eller en annen skjerm på nytt.

## Endrede filer – ta med i GitHub Desktop

| Mappe | Fil | Endring |
|---|---|---|
| Rot | app.js | Runtime-flater, historikknivåer, tilbake/Escape/fokus, responsivt bruddpunkt, lokal rammepreferanse og v124/124. |
| Rot | styles.css | Kompakt rad, gruppetitler/brikker, selvstendig rulling, mobilark og PC-ramme. Arkets × har 44×44 px trykkflate. |
| Rot | index.html | Alle versjonsparametre til 124. |
| Rot | service-worker.js | CACHE_NAME til middagsplan-v124; strategi og fillister ellers uendret. |
| Rot | AGENTS.md | Regler for felles renderer, grupper, historikk, lokal preferanse og kontroller. |
| src/render | meal-filters.js | Felles rad, grupper, ark og ramme; norsk kategorisortering, valgt-teller og fjernbrikker. |
| src/render | meals.js | Sender bredde, åpneflagg og treffantall til filterrendereren. |
| src/sync | local-store.js | Lagrer bare sort og frameOpen fra filtre. Ingen endring i skysynk. |
| tests/render | meal-filters.test.mjs | Gruppe-/kategorirekkefølge, kompakt rad/teller/fjerning, arkantall, PC/picker, unike fokusnøkler og CSS-mål. |
| tests/render | meals.test.mjs | Oppdaterte forventninger for filtre inne i mobilarket. |
| tests/app | meal-filters.test.mjs | Umiddelbare valg, fokus/rulling, lukking, Escape/Tab, lagring, 899/900, editorvern og uavhengig picker. |
| tests/app | window-scroll.test.mjs | Eksisterende filtertester åpner nå gruppene; matching, rulling/fokus og metadatarekkefølge beholdes. |
| tests/app | navigation.test.mjs | Virkelig simulert historikk/popstate for begge filterflater, uten å miste valg. |
| tests/app | local-store.test.mjs | Forventer lokal rammepreferanse sammen med sort, uten søk/brikker. |
| tests/app | workflows.test.mjs | V124-eksport og separat matchMedia-stubb for bredde. |
| tests/app | access-startup.test.mjs | Testens framtidige blokkeringsversjon hevet til 125; minimum er uendret. |
| tests/sync | local-store.test.mjs | Oppdatert minimal lokal filterkopi. |
| docs | ARCHITECTURE.md | Presentasjoner, bruddpunkt, historikk, fokus/rulling og videreført filterlogikk. |
| docs | STATE_MODEL.md | frameOpen lokal; søk, brikker og åpneflagg i minnet. Ingen domenefelt endret. |
| docs | RELEASE.md | Leveranse og manuelle kontroller før eiers publisering. |

## Nye filer

- docs/LEVERANSE_V124.md: denne rapporten.
- docs/screenshots/v124-meals-375-empty.png
- docs/screenshots/v124-meals-375-selected.png
- docs/screenshots/v124-meals-375-sheet.png
- docs/screenshots/v124-meals-1280-frame.png
- docs/screenshots/v124-meals-1280-compact.png
- docs/screenshots/v124-picker-375-closed.png
- docs/screenshots/v124-picker-375-groups.png

Totalt 20 endrede og 8 nye filer. Ingen slettede filer. Ingen nye produksjonsmoduler; meal-filters.js er kontrollert i begge eksisterende asset-listene. Dokumentasjonsbildene er ikke PWA-assets. Ta med alle filene over i GitHub Desktop.

## Kontroller

- Alle **62 testskript** under tests/ og functions/tests/ består, uten nettverk.
- Alle **51 syntakskontroller** med node --check består: app.js, service-worker.js, alle JS-filer under src/ og functions/lib/, functions/index.js og den arkiverte v122-lagringsfixturen. Oppstarts-testen kontrollerer også det innebygde HTML-skriptet.
- Testet: norsk kategoriorden Bønner, Fisk, Ærter, Ørret, Ål; dagstyper i innstillingsrekkefølge; teller for flere valgte grupper; fjerning; umiddelbare treff og entall/flertall/0; eksisterende kombinasjonsregler og søk.
- Testet: åpent/lukket mobilark, ×/bakgrunn/tilbake/popstate/Escape, Tab-fokusvern, retur til Filtre, stabile fokusnøkler og vertikal/vannrett rulling. Historikk/popstate testes også gjennom eksisterende historikksimulator.
- Testet: åpen PC-standard, lokal Skjul/vis, fortsatt tomme søk/brikker etter ny innlasting, faktisk bruddpunkt 899/900 og at en ulagret editor ikke tegnes på nytt av breddehendelsen.
- Testet: picker-grupper lukket ved åpning, Filtre/Ferdig og tilbake før selve vinduet. Eksisterende forslag-, filter-, import-, porsjons-, backup-, restore- og synktester består.
- Lokalt Chrome/Playwright med filbasert appkopi, Firebase-oppstart fjernet, offline-modus, blokkerte HTTP(S)-forespørsler og deaktivert bakgrunnsnettverk. **0 HTTP(S)-forespørsler, 0 sidefeil.** 7 skjermbilder er generert og visuelt gjennomgått. Dette krevde ingen installasjon. Midlertidige appkopier, kjøringsskript og nettleserprofiler er fjernet fra prosjektets .local-tools/tmp.

## Lokale visninger

Syntetiske, anonyme oppskrifter; ingen familiens oppskriftsdata er brukt.

1. Mobil uten filter: søk, fire kompakte kontroller, antall/sortering og kategorigruppert liste.
   [375 px uten filter](screenshots/v124-meals-375-empty.png)
2. Mobil med Fisk og Rask: Filtre viser 1 (Rask inngår ikke i merket), Fisk kan fjernes, Rask er grønn, trefflinjen har Nullstill.
   [375 px med Fisk og Rask](screenshots/v124-meals-375-selected.png)
3. Mobil med ark: håndtak, Filtre/Nullstill/×, fire grupper og fast Vis 1 oppskrift. Gruppene ruller ved behov.
   [375 px med filterark](screenshots/v124-meals-375-sheet.png)
4. PC åpen ramme: tre tydelige rader, 110 px etikettkolonne og Mangler oppskrift etter skillestrek.
   [1280 px åpen ramme](screenshots/v124-meals-1280-frame.png)
5. PC lukket ramme: samme kompakte rad som på mobil; treff/sortering og liste følger under.
   [1280 px lukket ramme](screenshots/v124-meals-1280-compact.png)
6. Velg middag lukket: kompakt rad, forslag og kategoriliste, med Annen plan fast nederst.
   [375 px grupper lukket](screenshots/v124-picker-375-closed.png)
7. Velg middag åpent: navngitte grupper i egen rullbar ramme, Ferdig nederst; forslag og plan-footer er fortsatt i samme vindu.
   [375 px grupper åpne](screenshots/v124-picker-375-groups.png)

Ekte iPhone/Safari/PWA, fingerstyrt rulling og telefonens tilbake-sveip er ikke kontrollert på fysisk enhet. Tilsvarende tilbakeflyt er kontrollert med faktisk lokal nettleserhistorikk og simulert popstate. Ingen avvik fra kravene er kjent.

## Bekreftelse

Ingen nettverk, installasjon, publisering eller Git-kommandoer er brukt. Ingen endringer i functions/, firestore.rules, datamodell eller skysynk. REQUIRED_MIN_APP_VERSION er fortsatt 120. Alle oppgavefiler og midlertidige skriveoperasjoner har vært innenfor middagsplanlegger; ingen andre prosjektmapper er rørt. Uendrede server-/regel-/domenefiler er kontrollert mot SHA-256-oversikten fra oppgavestart.
