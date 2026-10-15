# Leveranse v125 – Handle på Oda

Dato: 15. oktober 2026. Utgangspunkt: v124. App/cache og REQUIRED_MIN_APP_VERSION er 125.

## Resultat

Handleliste står alene over to like brede knapper, Generer fra plan og Handle på Oda. Oda-knappen har antallsmerke når uavhukede varer er valgt. På 375 px er raden målt til 339 px og knappene til 165,5 px hver, med 8 px mellomrom.

Varer med oda:true ligger bare i Til Oda-boksen, før avhukede varer. Boksen starter lukket og viser inntil fire navn med … ved flere. Åpning viser dagens vanlige varerader med kjøpt-avkrysning og redigeringsmeny. Om boksen er åpen, huskes bare i økten. Ingen boks ved null Oda-varer.

Undersiden Handle på Oda viser TIL ODA og RESTEN AV HANDLELISTEN. Valg flytter varen straks mellom seksjonene gjennom vanlig varesynk. Rekkefølgen følger butikkategoriene og den eksisterende stabile rekkefølgen innad. Fokus og hovedsidens posisjon beholdes ved veksling. Tilbake/popstate går til Handle og gjenoppretter posisjonen der; Handle-fanen er aktiv, og øvrige faner virker som på andre undersider.

Søk i Oda er en native lenke til den oppgitte søkeadressen, i ny fane med noopener noreferrer. Søkeordet er navnet før første komma, uten parentesinnhold og trimmet. Små bokstaver brukes slik den konkrete testadressen krever: Sammalt hvete, fin → q=sammalt%20hvete. Bare bokstavstørrelse gir ingen ekstra undertekst; Melk får derfor ingen «søker etter»-linje. Endret søkeord vises under varen. Klikket setter Søkt ✓ direkte på lenken, bare i øktminnet; lenken kan åpnes igjen.

Merk N som bestilt huker av de uavhukede Oda-varene, fjerner oda, går tilbake til Handle og viser toast. Null valgte gir deaktivert knapp; uten uavhukede varer vises Handlelisten er tom og ingen bestilt-knapp. Toast-systemet har ikke støtte for handlinger, så betingelsen for Angre-handling er ikke oppfylt. Vanlig angret avhuking virker og gir varen tilbake uten Oda-merke.

## Data, synk og kompatibilitet

- Handlevarer har bare det valgfrie tillegget oda:true. normalizeShoppingList utelater false, streng, tall, manglende verdi og oda på avhukede varer.
- Eksisterende merke beholdes ved mergeShoppingItems og mergeGeneratedShoppingItems. Nye varer får ingen automatisk Oda-merking basert på navn eller tidligere kjøp. Valget følger den aktuelle varen; det er ingen lagret butikkpreferanse.
- Dagens diff/updateDoc-synk er utvidet med feltet. Ved fjerning brukes oda:null kun internt i diffen, oversatt til Firebase deleteField før skriving. Det lagres aldri undefined/null/false som oda fra appen. Ingen nye samlinger, dokumentstier, batcher eller transaksjoner. Kø-/lytterflyt og øvrige synkscope er videreført.
- Backup bevarer oda i eksportformat 1. Restore avviser ikke-boolske oda-felt før skriving og bygger dokumenter med oda:true bare når varen er uavhuket.
- Minimum 125 hindrer v120–v124 i å normalisere bort merket. Administratorheving, restore og servings-defaults bruker samme minsteversjonskonstant. Ingen migrering og ingen endring av Firestore-regler.
- odaExpanded og odaSearched ligger utenfor state, lokal kopi, synk og backup; konto-/tilgangsstopp tømmer dem. Ny økt starter fortsatt på Handle. Appen lagrer ingen Oda-passord og har ingen Oda-innlogging, API-kall eller automatisk handling i kurven.

## Endrede filer – ta med i GitHub Desktop

| Mappe | Fil | Endring |
|---|---|---|
| Rot | app.js | Oda-underside, retur/fane, øktminne, valg/bestilt/søk, sammenslåingsvern og fokus/rulling; v125/125. |
| Rot | styles.css | To like brede knapper, Til Oda-boks, Oda-rader, søkelenker og bestilt-footer over bunnmenyen. |
| Rot | index.html | Alle versjonsparametre til 125. |
| Rot | service-worker.js | Cache v125 og begge nye klientmoduler i begge asset-listene. Strategien er uendret. |
| Rot | AGENTS.md | Datatillegg, synkfjerning, øktminne, navigasjon, sikkerhet og kontroller. |
| src/domain | shopping.js | Bevarer bare oda:true på uavhukede varer gjennom normalisering. |
| src/render | shopping.js | Ny handlingsrad, Oda-teller og separat sammenfoldet/utfoldet gruppe. |
| src/sync | shopping.js | Oda-diff og oversetting av feltfjerning til deleteField i dagens updateDoc. |
| src/sync | firebase.js | Eksponerer SDK deleteField til varesynken. Ingen nettverk kjørt i utviklingen. |
| src/sync | restore.js | Boolsk Oda-validering og bevaring i dokumentbygging. |
| src/sync | version.js | REQUIRED_MIN_APP_VERSION = 125. |
| tests/sync | shopping.test.mjs | Veksling, avhukingsdiff, faktisk deleteField-sentinel og skyinnlesing av oda. |
| tests/sync | firebase.test.mjs | Adapterens deleteField-funksjon med lokal SDK-stubb. |
| tests/sync | restore.test.mjs | Gjenoppretting krever minimum 125. |
| tests/sync | access.test.mjs | Administratorheving til 125, medlem og blokkering av v124. |
| tests/sync | servings-defaults.test.mjs | Overgangens eksisterende vern med minimum 125 og framtidig 126. |
| tests/app | navigation.test.mjs | Oda-Tilbake, faktisk simulert popstate og faneavgang. |
| tests/app | page-scroll.test.mjs | Handle → Oda starter på 0; tilbake gjenoppretter Handle-posisjonen. |
| tests/app | access-startup.test.mjs | Minimum 125 og testens framtidige blokkering ved 126. |
| tests/app | picker-note.test.mjs | Eksisterende restore-test forventer nå minimum 125. |
| tests/app | workflows.test.mjs | Eksportversjon v125. |
| docs | ARCHITECTURE.md | Oda-flyt, søkelenker, delte vareoppdateringer, minne og kompatibilitet. |
| docs | STATE_MODEL.md | oda:true, øktflagg, backup/restore og minsteversjon. |
| docs | RELEASE.md | Eiers utrulling og kontroller på ekte enhet/nett. |

## Nye filer

| Fil | Innhold |
|---|---|
| src/domain/oda.js | Rene hjelpere for søkeord/URL, rekkefølge, valg og bestilt. |
| src/render/oda.js | Oda-underside med toppstripe, seksjoner, lenker og footer. |
| tests/domain/oda.test.mjs | Normalisering, kjøpt/angre, sammenslåing, søkeord, rekkefølge, backup og restore. |
| tests/render/oda.test.mjs | Til Oda-boks, teller/forhåndsvisning, lenker, undertekst, tomtilstand og asset-lister. |
| tests/app/oda.test.mjs | Apphandlinger med lokal DOM, synkdiffer, fokus/rulling, Søkt-minne og bestilt-toast. |
| docs/LEVERANSE_V125.md | Denne rapporten. |
| docs/screenshots/v125-shopping-375-collapsed.png | Handle med lukket Til Oda-boks. |
| docs/screenshots/v125-shopping-375-expanded.png | Handle med åpen Til Oda-boks. |
| docs/screenshots/v125-oda-375-selected.png | Oda-siden med to valgte varer. |

Totalt **24 endrede og 9 nye filer**, ingen slettede filer. Ta med alle over i GitHub Desktop. Skjermbildene er dokumentasjon og skal ikke inn i service worker.

## Testresultat

- **65 av 65 testskript** under tests/ og functions/tests/ består uten nettverk, inkludert alle tidligere tester.
- **53 av 53 syntakskontroller** består med node --check: app.js, service-worker.js, alle JS-kilder i src/ og functions/lib/, functions/index.js og den arkiverte v122-lagringsfixturen. Oppstartstesten kontrollerer også innebygd HTML-skript.
- Nye tester dekker oda true/false/streng/tall/manglende, avhuking og vanlig angre, bevaring ved sammenslåing, nye vanlige varer, normalisert skyinnlesing og slettesentinel i faktisk updateDoc-stubb.
- Rendering dekker skjult Oda-vare i vanlige grupper, teller, fire navn + …, ingen boks ved 0, riktige seksjoner/lenker/undertekster, Søkt, tomtilstand og deaktivert bestilt-knapp.
- App-test dekker umiddelbar per-vare-diff, ingen global tidsmarkørendring, fokus og scrollY 600, merking av bare de riktige varene, toast og rydding av minne ved synkstopp. Svar/søkestatus kommer ikke i lokal kopi, synk eller backup.
- Navigasjon og rulle-testene dekker både appens Tilbake, popstate, faneavgang og lagret Handle-posisjon. Tilgang-/restore-/overgangstester består med minimum 125.
- Lokal Chrome/Playwright på filbasert appkopi, Firebase-oppstart fjernet, offline-modus, HTTP(S) blokkert og bakgrunnsnett deaktivert: **0 HTTP(S)-forespørsler og 0 sidefeil**. Faktisk nettleser-tilbake, valg mellom seksjoner, uendret fokus/scrollY 250, søkehandler og bestilt-toast er kontrollert. Søkelinkens native navigering ble stoppet bare i denne testkopien; produksjonslenken er uendret. Ingen installasjon.

## Lokale 375 px-visninger

Alle tre er tegnet med syntetiske, anonyme varer ved 375×1000 px og visuelt kontrollert:

1. [Handle – Til Oda lukket](screenshots/v125-shopping-375-collapsed.png): overskrift, to like knapper, vanlige kategorier og grønn boks nederst med to navn.
2. [Handle – Til Oda åpen](screenshots/v125-shopping-375-expanded.png): samme liste med hvite standardrader for Oda-varene, kjøpt-hake og redigeringsmeny.
3. [Handle på Oda – to valgte](screenshots/v125-oda-375-selected.png): Tilbake/tittel, forklaring, Melk og Sammalt hvete valgt med egne søkelenker, øvrige varer under og bestilt-footer over appens vanlige faner.

Ekte iPhone/Safari/PWA, fysisk tilbake-sveip, faktisk Oda-søkeresultat/ny fane på telefon og synk mellom to enheter på nett er ikke testet. Dette krever eiers kontroll etter egen publisering; nettverk/publisering inngår ikke her. Ingen kjente avvik fra kravene. Den betingede toast-handlingen er utelatt fordi dagens toast ikke har handlingsstøtte.

## Bekreftelse

Ingen nettverk, installasjon, publisering eller Git-kommandoer brukt. Ingen endring i functions/ eller firestore.rules. Kun prosjektmappen middagsplanlegger er endret. Midlertidige testkopier, nettleserprofil og testskript i .local-tools/tmp er fjernet. Server/regler er kontrollert mot SHA-256-oversikten fra oppgavestart. Ingen Oda-passord eller innlogging er brukt eller lagret; ingen automatisk klikking hos Oda.
