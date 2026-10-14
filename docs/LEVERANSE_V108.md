# Leveranse v108 – rulleposisjon og fokus i vinduer

Utgangspunkt: publisert v107. Klientversjon, versjonsnummer, query-parametre og cache er v108/108. REQUIRED_MIN_APP_VERSION er uendret 106. Ingen datamodell-, synk-, regel- eller service worker-strategiendring.

## Rullende elementer

Nøklene er plassert etter gjennomgang av CSS, foreldreelementer og mobiloverstyringer, ikke ut fra klassenavnet alene.

| data-scroll-key | Element | Hvorfor |
|---|---|---|
| shopping-review | .shopping-review-backdrop | overflow-y:auto på PC og mobil. Modal/body har overflow:visible; bakgrunnen bærer den lange gjennomgangen, med klebrig topp og bunn. |
| generate-days | .gen-modal-list | overflow-y:auto/flex:1 inne i høydebegrenset modal. |
| planner-day | .planner-sheet-body | overflow-y:auto overstyrer skjult overflow i modal-body; flex:1/min-height:0 gir egen rulling. |
| meal-picker | .meal-picker-list | overflow-y:auto, max-height:60vh på PC; flex:1/min-height:0 i mobilens 100dvh-vindu. Bakgrunn/utsiden har skjult overflow på mobil. |
| editor-row-menu | .editor-row-menu-actions | overflow-y:auto inni radmenyen, med max-height:75vh og skjult overflow på utsiden. |

captureWindowPositions/restoreWindowPositions i app.js er koblet inn i render(). Før utskifting leses scrollTop og fokusidentitet. Etter render og hendelsesbinding får samme kontroll fokus med preventScroll:true, og scrollTop settes tilbake synkront. Ingen timer, animasjon eller render-omskriving. Identitetene sammenlignes som tekst, også når en ID inneholder anførselstegn. Fokus håndteres innenfor samme vindu, også for knapper over/under rullelisten.

Kopien lever bare i ett render-kall. Lukking fjerner nøkkelen, og ny åpning begynner øverst. Forsvunne fokuskontroller ignoreres. Middagsvelgerens syncMealPickerScrollLock er beholdt uendret. Tellere, gruppetellere og knappetekster rendres som før.

## Endrede filer

Alle filene under skal tas med i GitHub Desktop. Ingen filer er slettet, og ingen nye klientmoduler er lagt til.

| Mappe | Fil | Endring |
|---|---|---|
| Rot | app.js | Lokal bevaring/gjenoppretting i render, rullenøkler for handledager/middagsvelger og stabile fokusnøkler. v108/108. |
| Rot | index.html | Alle query-parametre til 108. |
| Rot | service-worker.js | CACHE_NAME middagsplan-v108. Asset-lister og strategi er uendret. |
| Rot | AGENTS.md | Regler for nye rullende vinduer, fokusidentitet og lokale kontroller. |
| src/render | shopping.js | Rullenøkkel på gjennomgangens bakgrunn; fokusnøkler på varer, Alle/Ingen og topp-/bunnknapper. |
| src/render | planner.js | Rullenøkkel på dagsarkets body; fokusnøkler på felt og knapper. |
| src/render | meals.js | Rullenøkkel på radmenyens handlingsliste og fokusnøkler på handlinger/lukkeknapp. |
| tests/app | window-scroll.test.mjs (ny) | Ekte render og hendelser med DOM-stubber: posisjon, fokus, tellere, lukking/ny åpning, flere vinduer og sidelås. |
| tests/app | workflows.test.mjs | Forventet eksportversjon v108. |
| tests/app | access-startup.test.mjs | Blokkeringsfixturer 109, over aktuell klientversjon. |
| docs | ARCHITECTURE.md | CSS-grunnlag for nøkkelplassering, render-flyt og fokus. |
| docs | RELEASE.md | Testkommando og manuell akseptanse for v108. |
| docs | LEVERANSE_V108.md (ny) | Denne rapporten. |

## Testresultat

- Alle 47 testskript under tests/ og functions/tests/ bestod.
- node --check bestod for alle 39 kildefiler (app.js, service-worker.js, src/**/*.js, functions/index.js og functions/lib/*.js). Oppstarts-testen kontrollerer også HTML-oppstartsvernets syntaks.
- Gjennomgang med 23 varer: scrollTop 860 beholdes ved avhuk og Alle/Ingen. Fokus går tilbake til samme vare/gruppeknapp med preventScroll:true. Tellere og knappetekster kontrolleres for 22, 21, 0 og 23 valgte varer.
- Handledager: scrollTop 430 beholdes, samme avkrysningsboks har fokus, og Generer-knappens antall oppdateres.
- Dagsark: scrollTop 250 beholdes ved endret porsjonsfelt og låsing. Felt og bunnknapp får fokus tilbake.
- Middagsvelger: scrollTop 360 beholdes gjennom render, uten å endre siden under. Sidelåsen bruker fortsatt -330px og returnerer til siden ved 330px etter lukking.
- Radmeny: scrollTop 140 og gruppeknappens fokus beholdes. Forsvunnet kontroll eller fokus utenfor vinduet gjenopprettes ikke.
- Lukking/ny åpning gir scrollTop 0. Flere åpne vinduer bevarer hver sin posisjon. Rulle-/fokusdata forekommer ikke i lokal kopi eller syncPayload.

## Rammer og gjenstående kontroll

Ingen funksjonelle avvik fra beskjeden. Ingen nettverk, installasjon, publisering eller Git-kommandoer er brukt. functions/, firestore.rules, synkmoduler, datamodell og andre mapper er urørt. Versjonsminimumet er fortsatt 106.

Oppførselen er kontrollert lokalt med DOM-stubber; faktisk rulling/tegning på iPhone og tastaturbruk i PC-nettleser må kontrolleres etter eiers publisering, som beskrevet i RELEASE.md. Ingen ytelsesmåling i ekte nettleser er utført.
