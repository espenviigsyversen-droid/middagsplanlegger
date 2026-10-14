# Leveranse v122 – Porsjonsvelgeren reagerer på hvert trykk

Dato: 14. oktober 2026. Utgangspunkt: v121.

## Resultat

Oppskriftens −/+ oppdaterer tallet, knappgrensene, porsjons-/kontekstteksten og ingrediensmengdene på stedet. Knappene og tallfeltet byttes ikke ut per trykk, og fokus/rulleposisjon beholdes. Mengdene bruker eksisterende scaleAmount og avrunding.

Begge knapper er 48 × 48 px med 8 px avstand. Tallfeltet har numeric inputmode, pattern [0-9]*, aria-label Antall porsjoner, 16 px skrift og fast bredde. Hele verdien markeres ved fokus. Enter eller blur godtar heltall 1–30; ugyldig verdi gjenopprettes. «Porsjoner» står etter feltet. På mobil reserveres to linjer for porsjonsteksten, slik at første justering ikke skyver knappene nedover.

Alle interaktive elementer bruker touch-action: manipulation. Viewport er uendret og knipe-zoom er ikke deaktivert. Dagsarkets −/+ er også 48 px.

## Buffer, avgang og synk

Fra oppskriftslisten er porsjonsvalget fortsatt bare i minnet. Fra en plandag bruker src/ui/recipe-servings.js et runtime-buffer som venter til 500 ms etter siste endring. Den siste verdien vinner over et innkommende ukebilde i visningen. Knappene blir stående under venting, også når render kalles av synk/status. Tallfelt under aktiv redigering beskyttes også mot utskifting.

Ved Tilbake/popstate, fanebytte, Rediger, Legg i handleliste, bytte av oppskrift/kontekst eller skjuling valideres feltet og bufferet tømmes straks. Handlelistegjennomgangen beregnes etter dette og bruker tallet som vises. Konto-/tilgangsstopp forkaster timer og buffer, slik at ingen gammel operasjon sendes under en ny konto.

Ukesynken hadde allerede et 500 ms-vindu. For å unngå dobbel ventetid bruker den ferdig samlede porsjonsverdien nå den valgfrie parameteren immediate:true i enqueue. Ved klar synk sendes én setDoc etter oppskriftsbufferets 500 ms, eller straks ved avgang/skjuling. Den samme flush-funksjonen, nested merge og konflikt-/kvitteringsvern brukes. Usendte felt i samme uke følger med i skrivingen; andre uker beholder sine timere. Før synkstart venter operasjonen på vanlig start. Frakoblet tilgang starter fortsatt ingen skriving.

Andre ukeendringer beholder sitt ordinære 500 ms-vindu. Ingen getDoc, batch, transaksjon, ny kø, varig offline-kø eller ny dokumentform er innført. Verdi lik gjeldende standard lagres fortsatt som null.

## Endrede og nye filer

| Mappe | Fil | Status og endring |
|---|---|---|
| Rot | app.js | Porsjonsbuffer, direkte deloppdatering, tallfelt-hendelser, flush før avgang/skjuling/handleliste, vern under synk og valgfri redraw/immediateWeeks ved state-patch. V122/122. |
| Rot | styles.css | Global touch-action, 48 px knapper i oppskrift/dagsark, fast tallfelt med 16 px skrift, 8 px mellomrom og stabil mobilhøyde for porsjonstekst. |
| Rot | index.html | Alle versjonsparametre til 122. Viewport uendret. |
| Rot | service-worker.js | Cache v122 og ny UI-modul i begge asset-listene; strategi uendret. |
| Rot | AGENTS.md | Regler om porsjonsbuffer, deloppdatering, flush, touch/zoom og umiddelbar innsending etter UI-venting. |
| src/ui | recipe-servings.js | Ny: ren tallvalidering og testbar minnebuffer med 500 ms timer, flush, cancel og generasjonsvern. |
| src/render | meals.js | Numerisk tallfelt, stabile mål for tekst/mengder og eksport av eksisterende ingrediensrenderer. |
| src/sync | weeks.js | Valgfri immediate i enqueue bruker eksisterende flush uten et ekstra ventevindu. Normal timing og øvrige synkvern beholdes. |
| tests/ui | recipe-servings.test.mjs | Ny: tallvalidering, pause fra siste trykk, flush/cancel/generasjon, CSS, viewport og asset-listene. |
| tests/app | recipe-servings.test.mjs | Ny: faktiske apphandlinger og ukesynk med DOM-/timer-/Firestore-stubber. Raske trykk, stabile elementer, alle mengdetrinn, tallfelt, konflikt, avgang, Enter, bakgrunn, handleliste, Rediger, fane og dagsark. |
| tests/app | workflows.test.mjs | V122 i eksportforventning; eksisterende porsjonstest flusher eksplisitt den nye ventingen. |
| tests/app | access-startup.test.mjs | Blokkeringsfixture 123, over aktuell appversjon. Minimum fortsatt 120. |
| tests/render | meals.test.mjs | Forventer tallfelt og separat porsjonstekst, med samme grenser og dagskontekst. |
| tests/sync | weeks.test.mjs | Umiddelbar innsending, samling med usendte felt, andre ukers ordinære timer, kvittering/serverbilde og kø før start. |
| docs | ARCHITECTURE.md | Deloppdatering, buffer, direkte innsending og videreførte synkvern. |
| docs | STATE_MODEL.md | Buffer/uferdig felttekst bare i minnet; eksisterende servings-celle/null-betydning. |
| docs | RELEASE.md | Kontrollpunkter på ekte telefon og mellom enheter etter eiers publisering. |
| docs | LEVERANSE_V122.md | Ny: denne rapporten. |

Eier tar med **14 endrede og 4 nye filer** i GitHub Desktop. Ingen slettede prosjektfiler. Den nye klientmodulen må følge appen ved publisering.

## Testresultat

- Alle **60 testskript** under tests/ og functions/tests/ består uten nettverk.
- **48 kildefiler** består node --check: app.js, service-worker.js, alle src-moduler, functions/index.js og functions/lib. Functions er kontrollert, ikke endret.
- Oppstartstesten kontrollerer også syntaksen til det innebygde HTML-skriptet. CSS-klammene er balanserte.
- 11 raske + fra 4 gir 15. De samme −/+-elementene beholdes, med fokus og scrollY 600 uendret.
- Ingrediensen 500 g i en oppskrift på 4 gir ved hvert +: 625, 750, 875, 1000, 1125, 1250, 1375, 1500, 1625, 1750 og 1875 g. Eksisterende mengde-/avrundingstester består.
- I dagskontekst gir trykkrekken ingen mellomskriving, så én enqueue og én setDoc med 15 etter 500 ms ro. Det kommer ingen ekstra skriving ved et nytt 500 ms-tick.
- En serververdi 7 under venting overstyrer ikke den viste lokale verdien 15 eller bytter knappene. Andre skyverdier tas inn før sluttpatchen bygges.
- Tilbake før fristen, popstate, fanebytte, Rediger, handleliste og visibilitychange flusher. Handlelisten bruker vist porsjonstall. Tilgangsstopp canceller timeren uten senere innsending.
- Innskrevet 15 + Enter godtas. 0, 31, abc, tom tekst og øvrige ugyldige former gjenopprettes. 1 og 30 deaktiverer henholdsvis − og +. Fokus markerer hele feltet.
- 11 raske trykk i dagsarket fra 10 gir 21. Knappstørrelsene kontrolleres i CSS-testen.
- Ukesynkens eksisterende 500 ms-samling, sequence ved sending, ventende verdier, kvitteringer, nyere serverbilder, stopp og feilhåndtering består fortsatt. Minimum, backup og restore er uendret.
- Appversjon/nummer, HTML-parametre og cache er v122/122. REQUIRED_MIN_APP_VERSION er uendret, 120. Den nye modulen står i begge asset-listene.

## Lokal nettleserkontroll

Chrome tegnet de faktiske appfunksjonene ved 375 × 812 px med en syntetisk oppskrift. Firebase-oppstart og service worker ble utelatt i kontrollkopien. Nettverk var blokkert, med **0 HTTP-forespørsler**.

| Kontroll | Målt resultat |
|---|---|
| 11 raske + fra 4 | 15 |
| Samme − og + etter trykkrekken | Ja |
| Fokus fortsatt på + | Ja |
| Synlig knapp og trykkflate | 48 × 48 px |
| Knappens topp før/etter justering | 181,25 / 181,25 px |
| touch-action på knappen | manipulation |
| Tallfeltets skrift | 16 px |
| Mengde ved 15 porsjoner | 1875 g |
| Dagskontekst + serververdi under venting | Viser 15, samme +-element |
| Sluttoppdatering til dagens porsjoner | Én oppdatering med 15 |

Midlertidig kontrollskript, HTML/modulkopi og nettleserprofil er slettet. Ekte Safari/PWA, fingertrykk, skjermtastatur, tilbake-sveip, knipe-zoom og faktisk nett-synk mellom to enheter er ikke prøvd. Funksjon, DOM-identitet og timing er kontrollert lokalt; enhetskontrollene står i RELEASE.md.

## Rammer

Ingen nettverk, installasjon, publisering eller Git-kommandoer. Functions, firestore.rules, Firestore-struktur og lagret datamodell er urørt. Minsteversjonskonstanten er urørt. Synkendringen er avgrenset til den dokumenterte valgfrie umiddelbare innsendingen for allerede ventede porsjonsvalg; eksisterende synkvern beholdes. Ingen andre mapper enn middagsplanlegger er endret.
