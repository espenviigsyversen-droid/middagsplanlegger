# Leveranse v91

Utviklet etter «Middagsapp leveranse 1 (v90 → v91)».

## Vurdering og resultat

Planen er fulgt. Endringene er avgrenset til hurtigmiddag, butikkategorirekkefølge, lokal sikkerhetskopi og de to småfiksene. Ingen endringer i synkmoduler, Firestore-stier, `setState`, synkplanlegging, snapshot-lyttere, forslagmotor, startvisning eller bunnmeny. Service worker har bare fått nytt cache-navn og sikkerhetskopimodulen i de to asset-listene.

- Hurtigmiddag opprettes fra middagsvelgerens søk og plasseres på valgt dag i valgt uke. Eksakte tittelduplikater hindres. Enter oppretter bare ved null søketreff, og søket beholder direkte oppdatering uten full render per tastetrykk.
- Avledet «Mangler oppskrift» vises på kort, i typefilter og i oppskriftsdetalj. Ukehandlelisten varsler om middager uten ingredienser.
- Butikkategorier kan flyttes opp/ned, også Annet. Knapper har minst 44 px trykkflate, tilgjengelige navn og deaktiverte yttergrenser. Scrollposisjon beholdes. Nye egne kategorier legges sist; slettede nøkler fjernes fra rekkefølgen.
- Sikkerhetskopi eksporterer lokal domenestate som JSON med versjonert format. Filstøttet deling brukes når tilgjengelig, ellers nedlastingslenke. Avbrutt deling gir ikke feilmelding. Import/gjenoppretting er ikke bygget.
- Familienavnet escapes i toppbaren. Manifest, CSS, app og cache bruker v91.

## Presiseringer til utviklerbeskjeden

1. Editoren har fått «Ikke angitt» for tilberedningstid, og lagring beholder tom verdi. Uten dette ville en hurtigmiddag feilaktig blitt «Rask» ved lagring. Dette støtter hensikten i A2/A5.
2. Ved ny butikkategori lagres hele den nåværende rekkefølgen med ny nøkkel sist. Dette oppfyller akseptansepunktet også når Annet er flyttet eller rekkefølgen tidligere var tom.
3. Ekstra lokale flyttester er lagt til for appkoblingene, nedlasting, fil-deling, avbrudd, feil og HTML-escaping. Testene bruker DOM-stubber og gjør ingen nettverkskall.
4. Meldingen «Sikkerhetskopi lagret.» er beholdt som bestilt. Nettleseren kan likevel bare bekrefte startet nedlasting/fullført deling, ikke faktisk lagring på disk. Eksporten er fra denne enheten, ikke en bekreftet fersk Firestore-kopi. Dette er dokumentert.

## Kontroller

- `node --check app.js`: bestått.
- `node --check service-worker.js`: bestått.
- Alle 15 testskript: bestått.
- Lokale filkontroller: ny modul finnes i begge service worker-lister; alle tre HTML-versjonsparametre, appversjon og cache-navn er v91.
- Synkmodulenes filhash, `setState` og synkdelen fra `initFirebaseSync` er uendret fra før leveransen.
- Ingen git-kommandoer, pakkeinstallasjoner eller eksterne nettverkskall er brukt.

Testskript:

```text
tests/app/workflows.test.mjs
tests/domain/backup.test.mjs
tests/domain/meals.test.mjs
tests/domain/shopping.test.mjs
tests/domain/suggestions.test.mjs
tests/domain/weeks.test.mjs
tests/render/calendar.test.mjs
tests/render/meals.test.mjs
tests/render/planner.test.mjs
tests/render/setup.test.mjs
tests/render/shopping.test.mjs
tests/sync/firebase.test.mjs
tests/sync/reads.test.mjs
tests/sync/state.test.mjs
tests/sync/writes.test.mjs
```

## Endrede og nye filer

Last opp alle de 22 filene nedenfor til de samme mappene i GitHub. Filer merket «ny» er nye; de øvrige er endret. Bare de første ti er nødvendige for at v91 skal kjøre. Dokumentasjon og tester bør også følge leveransen.

### Appfiler

```text
app.js
index.html
styles.css
service-worker.js
src/domain/backup.js                 (ny)
src/domain/meals.js
src/domain/shopping.js
src/render/meals.js
src/render/setup.js
src/render/shopping.js
```

### Dokumentasjon

```text
AGENTS.md
docs/ARCHITECTURE.md
docs/STATE_MODEL.md
docs/RELEASE.md
docs/LEVERANSE_V91.md                 (ny)
```

### Tester

```text
tests/app/workflows.test.mjs          (ny)
tests/domain/backup.test.mjs          (ny)
tests/domain/meals.test.mjs
tests/domain/shopping.test.mjs
tests/render/meals.test.mjs
tests/render/setup.test.mjs
tests/render/shopping.test.mjs
```

`manifest.json`, ikoner, Firebase-konfigurasjon og alle andre filer er uendret.

## Gjenstående akseptanse

Manuell test i ekte PC-nettleser, på iPhone og mellom to Firestore-tilkoblede enheter er ikke utført i denne leveransen. Kjør sjekklisten i `docs/RELEASE.md` etter publisering, spesielt synk av hurtigmiddag/kategorirekkefølge og faktisk lagring via iPhone-delingsarket. Kontroller v91 på begge enheter før testing.
