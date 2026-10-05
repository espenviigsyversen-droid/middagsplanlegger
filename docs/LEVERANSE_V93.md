# Leveranse v93

Implementert etter «Middagsapp leveranse 2 (v92 → v93)» og arkitektens tillegg. Migreringen bruker fortsatt kun skydokumentet; ingen overføring av usynkede v92-endringer er bygget.

## Resultat

- Handlelisten bruker `families/{familyId}/shoppingItems/{itemId}` med ett dokument per vare. Nye varer skrives enkeltvis med `setDoc`, endrede felt med `updateDoc`, slettinger med `deleteDoc`. Ingen debounce, `getDoc` før varewrites eller `writeBatch`.
- Migrering leser `app/shopping` i én transaksjon. Eksisterende ID-er og rekkefølge beholdes, `createdAt` settes til fast starttid 0 + indeks. Arkivets `shoppingList` forblir urørt; bare `migratedToItemsAt` skrives med merge. Markøren hindrer ny migrering ved retry eller ny oppstart.
- Operasjoner før klar lagres i minnet og sendes etter migrering, før collection-lytteren startes. Writes sendes uten å vente på bekreftelse før lytteren kobles til. Cache-snapshots ignoreres fram til første serversnapshot; metadataendringer er inkludert for at serverbekreftelsen skal mottas også ved uendret innhold.
- Lokal `generatedForWeek` og global `clientUpdatedAt`/`pendingLocalSync` berøres ikke av remote handlelistepatcher. Sikkerhetskopien inneholder fortsatt lokal `shoppingList`. Det gamle shopping-scopet, write-byggingen og dokumentlytteren er fjernet.
- `updateDoc` med `not-found` avsluttes stille. Andre feil vises som «Synk feilet». Ventende handlelisteoperasjoner eller migrerings-/lytterfeil kan ikke skjules av «Synket» fra de øvrige scopene.
- Remote rendering og synkstatus bevarer manuelt varefelts tekst, markering og fokus. Identisk remote innhold skriver ikke state eller renderer innholdet på nytt.
- Nye økter starter på Handleliste. Menyen er Handle, Kalender, Planlegger, Oppskrifter.
- Versjon, HTML-parametre og cache-navn er v93. Ny modul er i begge service worker-assetlister. Service worker-strategien er uendret.
- De sju avtalte rotfilene er slettet. `.gitattributes` og `.gitignore` er lagt til, og arbeidsmappe/publisering er oppdatert til Git-klonen og eiers GitHub Desktop-flyt.

## Kontroller

- `node --check app.js`: bestått.
- `node --check service-worker.js`: bestått.
- Syntakskontroll av alle 15 JavaScript-moduler under `src/`: bestått.
- Alle 17 testskript: bestått. Oppstartstesten kontrollerer også det innebygde HTML-skriptet.
- Lokal versjonskontroll: v93 på alle relevante steder, alle importer og oppførte offline-assets finnes, ny modul finnes i begge assetlister, gamle rotfiler er borte, gammel handlelistelytter og archive-write-scope er fjernet.
- Ingen Git-kommandoer, pakkeinstallasjoner, eksterne nettverkskall eller full access er brukt. Ingen produksjonsdata, nettleserlagring eller cacher er endret under arbeidet.

Testskript:

```text
tests/app/startup.test.mjs
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
tests/sync/shopping.test.mjs
tests/sync/state.test.mjs
tests/sync/writes.test.mjs
```

Nye lokale tester dekker feltdiff, sortering, serverfeltfjerning, migreringsmarkør, tom migrering, transaksjonsretry, arkivets merge-payload, kørekkefølge, ubekreftede offline-writes, cachevern, `not-found`, øvrige feil, separat avhuking/mengde og sletting etterfulgt av sen oppdatering. App-testene dekker startvisning/meny, stabile opprettingstidspunkter, uendrede globale synkflagg, bevart lokal uke, identiske snapshots uten render/writes og tekst/markering/fokus etter reell app-rendering med DOM-stubber. Firebase-testen kjører klientkoblingen med lokale SDK-stubber, inkludert `updateDoc` og databasebundet transaksjon.

## Tekniske presiseringer

Ingen funksjonelle avvik fra den presiserte beskjeden. `firestoreApi.runTransaction` er en liten adapter som binder eksisterende database, slik at handlelistemodulen får API og referanser uten nye funksjoner på `window`. `createdAt` for migrering bruker epoch 0 som fast starttid, slik at eksisterende rekkefølge er deterministisk og nye varer kommer etter de migrerte.

Handlelisten er også fjernet fra innlesingen av eldre samlet legacy-state; den separate migreringen fra `app/shopping` er eneste migreringskilde. Feil i eksisterende legacy-oppstart fanges rundt det gamle oppstartskallet, slik at handlelistens egen migrering fortsatt forsøkes og kan vise riktig feilstatus. Lyttere, konfliktregler og write-bygging for profile/preferences/metadata/meals/weeks er ellers beholdt.

## Begrensninger og gjenstående akseptanse

Minnekøen er ikke varig. Offline-endringer kan sendes når nettet kommer tilbake mens appen fortsatt er åpen og synken er startet. Lukking eller omlasting kan miste usynkede endringer. Migreringsfeil beholder lokal liste og blokkerer handlelistelytteren til neste oppstart. Usynkede v92-endringer overføres ikke. Samtidige endringer av samme felt har siste write som vinner.

Alle enheter må være på nett, vise «Synket» og ha lik handleliste før publisering. Deretter må alle appvinduer lukkes helt og åpnes med bekreftet v93. En v92-klient som fortsetter å kjøre, bruker bare arkivet. Ved tilbakerulling følger v93-endringene ikke tilbake til v92. Full utrullingsplan og ni akseptansepunkter finnes i `docs/RELEASE.md`.

PC-/iPhone-test, samtidig bruk mot ekte Firestore, faktisk produksjonstilgang og offline-retilkobling i nettleser er ikke utført. Arkitektens opplysning om gjeldende Firestore-regler er dokumentert, ikke kontrollert via nettverk.

## Filer for eiers commit og publisering

17 eksisterende filer er endret, 5 filer er nye og 7 gamle filer er slettet. Ta med alle i GitHub Desktop. De tre endrede appfilene i roten og alle berørte `src/`-filer må være med i publiseringen; dokumentasjon, tester og arbeidsinstrukser følger samme commit. Slettingene må også registreres.

### Rot – endret

```text
AGENTS.md
README.md
app.js
index.html
service-worker.js
```

### Rot – ny

```text
.gitattributes
.gitignore
```

### Rot – slettet

```text
ARCHITECTURE.md
RELEASE.md
STATE_MODEL.md
shopping.js
shopping.test.mjs
weeks.js
weeks.test.mjs
```

### src/domain – endret

```text
shopping.js
```

### src/sync – endret og ny

```text
firebase.js
state.js
writes.js
shopping.js                         (ny)
```

### tests/domain – endret

```text
shopping.test.mjs
```

### tests/app – endret

```text
workflows.test.mjs
```

### tests/sync – endret og ny

```text
firebase.test.mjs
state.test.mjs
writes.test.mjs
shopping.test.mjs                   (ny)
```

### docs – endret og ny

```text
ARCHITECTURE.md
STATE_MODEL.md
RELEASE.md
LEVERANSE_V93.md                    (ny)
```

`styles.css`, `manifest.json`, ikoner, render-moduler, forslagmotor og øvrige filer er ikke endret i denne leveransen.
