# Leveranse v115 – Passer til i middagsvelgerens filtre

Dato: 14. oktober 2026. Utgangspunkt: v114, inkludert rettingen av den faste plassen.

## Resultat

Filterraden har tre grupper, i denne rekkefølgen:

1. Rask, Barnevennlig og Favoritter.
2. Alle Passer til-valg fra suitabilityEntries(), med samme navn og rekkefølge som Innstillinger.
3. Kategoriene.

To tynne skillelinjer mellom gruppene er 1 px brede, 24 px høye og bruker --line. De er aria-hidden. Raden er fortsatt én linje med vannrett rulling uten synlig rullefelt.

Bare ett Passer til-valg er aktivt. Et annet erstatter det forrige; trykk på aktivt valg slår det av. Det kombineres med øvrige filtre og søket, for både forslag og resultatliste. Middager uten det aktuelle suitability-merket vises ikke. Den faste plassen velges etter filtrering som før.

Valget er bare i minnet. Lukking, tilgangsbytte og Fjern filtre nullstiller det. Aria-pressed, farger, tomtilstand, fokus og vannrett rulleposisjon bruker eksisterende filterflyt. Nye Passer til-valg fra Innstillinger får automatisk en knapp. Ingen endring i oppskriftens lagrede suitability, poengmodellen eller synk.

## Endrede filer per mappe

### Roten

| Fil | Endring |
|---|---|
| app.js | Runtime-filteret suitability, tre filtergrupper med skillelinjer, dynamiske knapper fra suitabilityEntries og bytte/av/på. APP_VERSION/APP_VERSION_NUMBER v115/115. |
| styles.css | Den tynne loddrette skillelinjen, uten å endre énlinje-rulling eller eksisterende knappestil. |
| index.html | Alle tre ?v-parametre er 115. |
| service-worker.js | CACHE_NAME middagsplan-v115. Asset-lister og strategi er uendret. |
| AGENTS.md | Regler og kontroller for Passer til-filteret. |

### src/domain

| Fil | Endring |
|---|---|
| src/domain/suggestions.js | mealMatchesPickerFilters krever at meal.suitability inneholder valgt nøkkel. Øvrig poengberegning og utvalg er uendret. |

### tests

| Fil | Endring |
|---|---|
| tests/domain/suggestions.test.mjs | Helg, Hverdag, tomme/manglende merker, avskrudd filter, egne valg og kombinasjoner med andre filtre. |
| tests/app/window-scroll.test.mjs | Faktisk filterflyt: rekkefølge/skillelinjer, Helg/Hverdag-bytte og av/på, kombinasjon med Rask/kategori/søk, tomtilstand, Fjern filtre, nytt valg fra metadata, fokus/scrollLeft og nullstilling ved lukking. |
| tests/render/week.test.mjs | Skillelinjens mål, farge og vern mot krymping. Eksisterende rad-/knapperegler testes videre. |
| tests/app/workflows.test.mjs | Forventet appversjon i sikkerhetskopien er v115. Formatet er uendret. |
| tests/app/access-startup.test.mjs | Blokkeringsfixture 116, over aktuell appversjon. |

### docs

| Fil | Status og endring |
|---|---|
| docs/ARCHITECTURE.md | Tre filtergrupper, dynamiske valg og samme filtrering før fast plass. |
| docs/STATE_MODEL.md | suitability som runtime-filter, uten ny lagring eller modellendring. |
| docs/RELEASE.md | Kontrollpunkter etter eiers publisering. |
| docs/LEVERANSE_V115.md | Ny: denne rapporten. |

Eier tar med **14 endrede filer og den nye rapporten** i GitHub Desktop. Ingen slettede filer.

## Kontrollresultater

- Alle **49 testskript** under tests/ og functions/tests/ består uten nettverk.
- **41 kildefiler** består node --check: app.js, service-worker.js, alle src-moduler samt functions/index.js/functions/lib. Functions er kun kontrollert, ikke endret.
- Oppstartstesten kontrollerer også det innebygde HTML-skriptet. CSS har balanserte klammer.
- Helg viser bare merkede middager; uten merker utelates de. Hverdag erstatter Helg og nytt trykk slår det av.
- Helg + Rask + Fisk + søket helge gir kun den riktige middagen i testen. Forslagslisten bruker også kombinasjonen.
- Et nytt Turdag-valg lagt i samme metadata som Innstillinger gir egen knapp, riktig navn og rekkefølge; bare merkede middager vises.
- Valg/nullstilling, aria-pressed, skillelinjer, scrollLeft og fokus er kontrollert med lokale DOM-stubber. De øvrige v114-simuleringene består fortsatt.
- App, HTML og cache er v115/115. REQUIRED_MIN_APP_VERSION er fortsatt 106.

Ekte telefonkontroll av touch-rulling og visuell plassering gjenstår. Kontrollpunkter står i RELEASE.md. Ingen avvik fra beskjeden.

## Rammer

Ingen nettverk, installasjon, publisering eller Git-kommandoer. Ingen endringer i functions/, firestore.rules, datamodell, skysynk eller synkmoduler. Ingen filer utenfor prosjektmappen er endret.
