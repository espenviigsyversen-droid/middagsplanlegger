# Leveranse v94

Visningsendring etter utviklerbeskjeden v93 → v94: mer plass til handlelisten på mobil. Ingen endringer i synk, dataformat, navigasjon eller brukerflyter.

## Resultat

- Tellelinjen «gjenstår · avhuket» er fjernet på alle skjermstørrelser. Kategorier, I kurven og Fjern avhukede varer beholdes.
- Ved bredde opptil 640 px skjules undertittelen. Familienavnet vises på én linje med ellipsis, mindre skrift og et 32 px merke. Mobilens grid-kolonne kan krympe, slik at lange familienavn ikke utvider appen horisontalt.
- Toppfeltets padding er 6 px vertikalt og 14 px horisontalt. Innstillingsknappen er 44 × 44 px, som gir 56 px innvendig toppfelt og 57 px inkludert eksisterende kantlinje.
- Den effektive statusen «Synket» gir egen klasse på sync-pill. Bare på mobil er statusteksten visuelt skjult; den finnes fortsatt i tilgjengelighetstreet. Alle andre statuser beholder synlig tekst. PC beholder hele teksten.
- Handlelistens overskrift og Generer fra plan beholdes på samme rad. Avstander er redusert, og mobilknappens ikon er begrenset til 18 px for å unngå at SVG-en gjør raden høy. Innholdet har mindre topp-padding og varefeltet mindre avstand under seg.
- APP_VERSION, de tre HTML-parametrene og CACHE_NAME er v94. Service worker-strategi og asset-lister er uendret.

## Kontroller

- `node --check app.js` og `node --check service-worker.js`: bestått.
- Alle 17 eksisterende testskript: bestått.
- Oppdatert render-test bekrefter at tellelinjen er borte, mens kategorier og I kurven beholdes.
- Appflyttest bekrefter v94 i sikkerhetskopien og at kompakt statusklasse bare brukes ved Synket; statusenes lesbare tekst er fortsatt i HTML.
- Lokal versjonskontroll: app, HTML og cache bruker v94.
- Lokal nettleserkontroll av HTML fra de ekte render-funksjonene og appens CSS, med faste testvarer og uten Firebase-oppstart eller eksterne ressurser:
  - Ved 390 px bredde: første kategorioverskrift flyttet fra 314,42 px i v93 til 168 px i v94, en forbedring på 146,42 px.
  - Toppfelt: 57 px inklusive kantlinje. Innstillingsknapp: 44 × 44 px.
  - Langt familienavn: én linje, synlig ellipsis og ingen horisontal overflyt.
  - Synket: bare prikk visuelt, teksten finnes i tilgjengelighetstreet. Synker: synlig tekst.
  - Ved 1280 px bredde var toppfeltet identisk i høyde (75,73 px) og innstillingsknappen fortsatt 38 × 38 px i begge versjoner. Tellelinjen er fjernet.
- Midlertidige layoutfiler og nettleserprofiler er slettet, lokal testserver er stoppet og nettleserens midlertidige viewport er tilbakestilt.
- Ingen Git-kommandoer, eksterne nettverkskall, installasjoner eller full access er brukt.

## Avvik og gjenstående akseptanse

Ingen funksjonelle avvik. Den vertikale toppfelt-paddingen er 6 px, slik at en 44 px trykkflate får plass innenfor ønsket høyde på omtrent 56 px. Den eksisterende kantlinjen gir totalhøyden 57 px.

Målingen er en lokal nettlesermåling, ikke en test i iPhone-hjemskjermappen. Etter publisering må v94 bekreftes på PC og iPhone. Kontroller alle hovedvisninger og Innstillinger på mobil, lange familienavn, faktisk listeplass og status under flymodus. Synklogikken er uendret; flymodus er ikke simulert mot produksjon.

## Filer som skal med i GitHub Desktop

### Rot – endret

```text
app.js
styles.css
index.html
service-worker.js
```

### src/render – endret

```text
shopping.js
```

### tests/render – endret

```text
shopping.test.mjs
```

### tests/app – endret

```text
workflows.test.mjs
```

### docs – endret og ny

```text
RELEASE.md
LEVERANSE_V94.md                  (ny)
```

Ta med alle ni filer i eiers commit. De fire rotfilene og src/render/shopping.js må være med i publiseringen. Ingen eksisterende filer er slettet i denne leveransen. AGENTS.md, domene-/synkmoduler, manifest og ikoner er uendret.
