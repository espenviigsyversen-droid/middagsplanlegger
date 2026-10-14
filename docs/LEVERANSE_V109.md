# Leveranse v109 – tilbake, oppskrift og Kalender

Utgangspunkt: publisert v108. App, nummer, cache og query-parametre er v109/109. REQUIRED_MIN_APP_VERSION er fortsatt 106.

## Endrede filer

Alle filene nedenfor skal tas med i GitHub Desktop. Ingen filer er slettet.

| Mappe | Fil | Endring |
|---|---|---|
| Rot | app.js | Brukernavigasjon/historikknivåer, felles tilbake, oppskriftsmeny, Kalender/dagsark og felles stripe i inline-undersider. Dagsblokken fjernet, versjon v109. Eksisterende setState/synk bevares. |
| Rot | styles.css | Sticky stripe/safe-area, wake-bryter, hovedknapp, trykkbar dagsrad, dagens merke/notatellipsis og 44 px trykkflater. Dagsblokkens og gamle handlingsklyngers CSS fjernet. |
| Rot | index.html | Query-parametre 109. |
| Rot | service-worker.js | Cache v109 og to nye moduler i begge asset-listene; strategi uendret. |
| Rot | AGENTS.md | Toppstripe, historikk, editorvern og tilbake for nye vinduer. |
| src/render | subpage.js (ny) | Én felles toppstripe med valgfri høyrehandling. |
| src/render | meals.js | Ny oppskriftsrekkefølge, hovedknapp, switch, skjult gjentatt beskrivelse og ⋯-meny med rullenøkkel. Editorens Avbryt/Lagre beholdt. |
| src/render | calendar.js | Dagsblokk fjernet; én knapp per dag med kontekst, aria-label, merke og notat. |
| src/render | setup.js | Stripe i Familie, Oppdatering og versjon og generelle metadata-undersider. |
| src/render | account.js | Stripe på Konto og medlemmer. |
| src/render | ai-key.js | Stripe med retur til editor når siden ble åpnet derfra. |
| src/domain | meals.js | Ren sammenligning av tittel/beskrivelse, uten mutasjon av lagrede data. |
| src/ui | navigation.js (ny) | Avgrenset History-controller med asynkron konsumering, popstate og editorvern via appen. |
| tests/app | navigation.test.mjs (ny) | Faktiske apphandlinger med lokale DOM-/History-stubber: tilbake, vinduer, editor, AI-retur, historikklengde og Kalender. |
| tests/app | workflows.test.mjs | Forventet eksportversjon v109. |
| tests/app | access-startup.test.mjs | Blokkeringsfixturer til 110, over klientversjonen. |
| tests/render | meals.test.mjs | Menyvalg, hovedknapp, beskrivelsesskjuling og switch. |
| tests/render | calendar.test.mjs | Nye trykkbare rader, dag/notat/merke og fravær av dagsblokk. |
| tests/domain | meals.test.mjs | Beskrivelsesnormalisering. |
| docs | ARCHITECTURE.md | Toppstripe, UI-history, tilbakeprioritet og Kalender. |
| docs | RELEASE.md | Testkommando og manuell akseptanse for v109. |
| docs | LEVERANSE_V109.md (ny) | Denne rapporten. |

## Oppskrift ved 375 px

Øverst ligger en stripe med ‹ Tilbake til venstre og ⋯ til høyre. Den følger med ved rulling og bruker safe-area-padding. Tittelen står under, med beskrivelse bare når den ikke gjentar tittelen. Eksempelet CHEESY ALFREDO-PASTA MED SAFTIG KYLLING med emoji skjules uten at data endres. Porsjonstekst og −/+ kommer før en fremhevet hovedknapp i full bredde: Legg i handleliste med eksisterende ikon, eller Legg inn oppskrift når ingredienser mangler. Hold skjermen på er en bryter med fast tekst; manglende støtte gir deaktivert bryter og dagens forklaring.

Ingredienser og fremgangsmåte følger under. Rediger, Åpne lenke og eventuell Hent fra lenke finnes i ⋯-menyen. Menyen følger radmenymønsteret med Escape, fokuslås, bakgrunnslukking og data-scroll-key=recipe-menu. Nye knapper/bryter/rader, samt Kalenderens ukepiler, har minst 44 px trykkflate. Editorens Avbryt/Lagre er uendret.

## Kalender ved 375 px

Den store I dag-blokken er borte. Ukenavigasjon går direkte over i ukelisten. Dagsraden er én knapp med dag/dato til venstre, middag og eventuell notatlinje i midten og › til høyre. Notatlinjen kuttes med ellipsis. Dagens rad har farget kant/bakgrunn og I dag ved datoen; ingen markering i andre uker. Planlagt middag åpner oppskrift med dagen som kontekst. Manglende middag, rester eller spise borte åpner dagsarket i Planlegger.

Skjermbeskrivelsene bygger på rendering og CSS; det er ikke tatt nytt skjermbilde eller gjennomført visuell nettleserkontroll.

## Historikk

Eksisterende oppstartsoppføring merkes med replaceState, uten ny oppføring. navigate() brukes fra brukerhandlinger og beholder dagens setState. Aktive oppskrifter/undersider, editorvern og åpne vinduer får UI-nivåer. Historikken lagrer bare øktmerke og nivå-ID-er, ingen utkast eller domenekopi.

Appens tilbake og browserens popstate deler backInApp. Åpent vindu lukkes før foreldrevisningen. Oppskrift går til previousView; undersider til Innstillinger; AI fra editor tilbake til editor. Editorens tilbake avvises etter skjemaavlesning, og historikkoppføringen legges tilbake. Eksplisitt Avbryt/Lagre fungerer som før.

Ved lukking konsumeres gamle oppføringer med go. Nye nivåer legges først etter popstate; brukerhandlinger under ventingen bruker siste mål. Tilbake og ny åpning erstatter framoveroppføringer, så historikken vokser ikke for hver runde. Framover gjenåpner ikke forkastet UI. Konto-/synkstopp bytter merket med replaceState uten push. render, vanlig setState og sky-/statuscallbacks legger ikke til oppføringer.

## Kontroller

- Alle 48 testskript under tests/ og functions/tests/ består.
- node --check består for alle 41 kildefiler (app.js, service-worker.js, src/**/*.js, functions/index.js og functions/lib/*.js). Oppstartstest kontrollerer også det innebygde HTML-oppstartsvernet.
- Tolv Innstillinger-undersider har stripe og riktig retur. AI-retur fra editor er testet med både knapp og popstate.
- Oppskriftsmeny, gjennomgang, handledager, middagsvelger, dagsark/forslagsark og radmeny lukkes først ved tilbake. Editor beholder ulagret tittel, ingredienser og steg ved gjentatt tilbake.
- Åtte inn/ut-runder gir konstant historikklengde etter første åpning. Flere-nivå-tilbake, menu→editor, framover og ny handling mens go venter er testet. Render/skyoppdatering/synkstopp gir ingen push.
- Kalenderens dagkontekst, notater og dagens merke bare i inneværende uke er testet. Gjentatt beskrivelse skjules, ulik beskrivelse vises, switch har riktig aria-checked og kan slås av/på.
- Tidligere tester for synk, data, backup/restore, import, porsjoner og v108-rulling består.

Ekte iPhone-/Android-systemgester, PWA-tilbake, Safari/andre nettleseres fysiske historikk, safe-area ved rotering, visuell 375 px-kontroll og wake lock må prøves etter eiers publisering. Disse er ikke verifisert av DOM-/History-stubber.

## Rammer

Ingen funksjonelle avvik fra beskjeden. Ingen nettverk, installasjon, publisering eller Git-kommandoer er brukt. functions/, firestore.rules og src/sync/ er urørt. Ingen endring i datamodell eller synklogikk; bare brukerflyter går gjennom en UI-navigasjonswrapper til dagens setState. Ingen andre mapper utenfor prosjektet er rørt. Eier håndterer commit og publisering i GitHub Desktop.
