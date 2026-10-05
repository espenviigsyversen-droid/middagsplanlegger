# Leveranse v92

Retting etter utviklerbeskjeden v91 → v92. Ingen funksjonelle avvik fra beskjeden.

## Endringer

- Sikkerhetskopi bruker lenkenedlasting ved fin peker, selv om `navigator.canShare` er sann.
- Ved grov peker brukes fil-deling hvis støttet. `AbortError` avslutter stille. Andre delingsfeil faller tilbake til lenkenedlasting og vanlig suksess-toast.
- Feil ved lenkenedlasting logges med `console.error` og gir feil-toast. En egen hjelper rydder opp i nedlastingslenken og frigjør Blob-URL-en etterpå.
- Et vanlig innebygd skript før appmodulen viser oppstartsfeil ved script-/window-feil før første render, eller ved tom appflate etter 12 sekunder. Reload-knappen laster bare siden på nytt. Ved sen render fjernes lasteskjermen som tidligere.
- Appversjon, alle tre HTML-versjonsparametre og cache-navn er v92.

## Kontroller

- `node --check app.js` og `node --check service-worker.js`: bestått.
- Alle 16 testskript: bestått, inkludert oppstartsvernets innebygde JavaScript.
- Testene dekker fin peker med fil-deling tilgjengelig, grov peker med `NotAllowedError`, grov peker med `AbortError`, nedlastingsfeil og logging, oppstartsfeil, 12-sekundersgrense, reload og sen render.
- Lokale versjons-/filkontroller: bestått. Beskyttede state-/synkseksjoner, alle `src/`-moduler og service worker-koden utenom versjonsnavnet er uendret fra v91.
- Ingen git-kommandoer eller eksterne nettverkskall er brukt. LocalStorage og cacher slettes ikke av rettingene.
- Testene bruker lokale DOM-stubber. Ekte Windows-/iPhone-test gjenstår etter publisering; se `docs/RELEASE.md`.

## Filer per mappe

Last opp disse ti filene til samme mapper på GitHub. Bare de første fire er nødvendige for kjøring av v92; instruksjoner, tester og dokumentasjon bør følge leveransen.

### Rot

```text
app.js
index.html
styles.css
service-worker.js
AGENTS.md
```

### src/domain

Ingen endringer.

### src/render

Ingen endringer.

### src/sync

Ingen endringer.

### tests/app

```text
workflows.test.mjs
startup.test.mjs    (ny)
```

### docs

```text
ARCHITECTURE.md
RELEASE.md
LEVERANSE_V92.md    (ny)
```

Andre filer, inkludert v91-rapporten, manifest og ikoner, er uendret.
