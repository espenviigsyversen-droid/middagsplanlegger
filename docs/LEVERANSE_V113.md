# Leveranse v113 – middagsvelger på telefon og anonyme eksempler

Dato: 14. oktober 2026. Utgangspunkt: v112.

## Resultat

Middagsvelgeren åpnes uten automatisk søkefokus på berøringsskjerm. Mus/styreflate får søkefokus ved åpning med matchMedia("(pointer: fine)"). Autofocus-attributtet og det ubetingede fokuskallet ved hver hendelsesbinding er fjernet. Ved senere render bevares bare faktisk brukerfokus gjennom eksisterende v108-flyt. Brukeren kan derfor selv åpne tastaturet ved å trykke i søket, og PC-render stjeler ikke fokus fra footerknappene.

Knappen Ikke middag hjemme ligger fortsatt fast i footeren. Kort og forslagstitler har eksplisitt --text. Knappene i dagsark og ukemeny er gjennomgått: week-outline/week-menu-option bruker --text, modal-close/search-clear bruker --muted, text-action bruker --brand-dark, hovedknapper hvit tekst og fjerning rød tekst. Wake-switch arver tekstfargen. Disse eksisterende fargene er beholdt.

## Årsaken til grønn ramme

I v112 satte den ubetingede regelen `.meal-picker-item:hover` border-color til --brand, selv uten .selected. Den kunne derfor markere et uvalgt kort. Det var ingen feil i valgt-klassen: kortene sammenlignes allerede med dagens valgte mealId.

Hover endrer nå bare bakgrunn, begrenset til enheter med hover og fin peker. Quick-meal-kortets permanente grønne ramme er også fjernet, slik at uvalgte kort ikke bruker valgt-rammen. Bare .selected gir grønn valgt-ramme. Tastaturfokus har en separat kontur med :focus-visible; annet fokus fjerner konturen via :focus:not(:focus-visible).

Dette er årsaken som er påvist i koden. Det konkrete iPhone-forløpet og eventuell vedvarende hover i Safari er ikke gjenskapt på ekte enhet i denne leveransen.

## Navnesøk og endringer

Synlige tekster, plassholdere og eksempler i app.js, src/ og index.html er gjennomgått. Navnesøket inkluderte Espen, Line, Floan, Syversen og Viig. Kun ett treff i apptekstene:

| Fil | Tidligere tekst | Ny tekst |
|---|---|---|
| src/render/week.js, notatplassholder | F.eks. Line på trening – spiser kl. 16 | F.eks. spiser tidlig, trening eller gjester |

I tests/app/week.test.mjs var `Line på trening` brukt to ganger på samme testlinje: som feltverdi og forventet resultat. Begge er erstattet med `Trening – spiser tidlig`, siden testdataene rendres i appen under testen.

Ingen andre navn ble funnet i apptekster eller eksempler. Tekniske identifikatorer som checkbox-line, splitLines og navigator.onLine er ikke personnavn og er beholdt. Familiens eget navn fra state.family.name og andre brukerdata er ikke endret. Historiske leveranserapporter er ikke apptekster og er beholdt.

AGENTS.md har fått den påkrevde regelen: «Eksempeltekster, plassholdere og testdata som vises i appen skal aldri inneholde ekte navn på familiemedlemmer.»

## Endrede filer

### Roten

| Fil | Endring |
|---|---|
| app.js | Fokus bare ved fine-pointer-åpning av velgeren, ingen autofocus eller fokus i bindEvents. APP_VERSION/APP_VERSION_NUMBER er v113/113. |
| styles.css | Eksplisitte kort-/forslagfarger, hover uten valgt-ramme, egen :focus-visible-kontur og fjernet permanent grønn hurtigmiddag-ramme. Footer er uendret. |
| index.html | Alle tre ?v-parametre er 113. |
| service-worker.js | CACHE_NAME er middagsplan-v113. Asset-lister og strategi er uendret. |
| AGENTS.md | Anonyme eksempeltekster/testdata og regler for fokus/farger i velgeren. |

### src/render

| Fil | Endring |
|---|---|
| src/render/week.js | Anonym notatplassholder. |

### tests/app og tests/render

| Fil | Endring |
|---|---|
| tests/app/window-scroll.test.mjs | Fine-pointer-åpning gir fokus; berøringsåpning og første render gir ingen fokus; fokus på gammelt notat gir ikke fokus i ny velger; bevaring av manuelt søkefokus og footerfokus. |
| tests/app/week.test.mjs | Ingen valgt-klasse uten valgt middag, bare riktig kort valgt med middag, anonyme notat-testdata. |
| tests/render/week.test.mjs | Ny plassholder, kortfarger, hover/fokusregler og kontroll av navn i app.js/src/index.html. |
| tests/app/workflows.test.mjs | Forventet appversjon i sikkerhetskopien er v113. Eksportformatet er uendret. |
| tests/app/access-startup.test.mjs | Blokkeringsfixture hevet til 114, over aktuell appversjon. |

### docs

| Fil | Status og endring |
|---|---|
| docs/ARCHITECTURE.md | Fokus ved åpning kontra render, farger/valgt-markering og anonyme eksempler. |
| docs/RELEASE.md | Kontrollpunkter etter eiers publisering av v113. |
| docs/LEVERANSE_V113.md | Ny: denne rapporten. |

Eier tar med disse 13 endrede filene og den nye rapporten i GitHub Desktop. Ingen slettede filer.

## Kontrollresultater

- Alle **49 testskript** under tests/ og functions/tests/ består uten nettverk.
- **41 kildefiler** består node --check: app.js, service-worker.js, alle src-moduler, functions/index.js og functions/lib. Functions er kun kontrollert, ikke endret.
- Oppstartstesten kontrollerer også det innebygde HTML-skriptets syntaks.
- Velgerens markup har ikke autofocus. Tester kjører faktisk openMealPicker/render/hendelsesbinding med lokale DOM-stubber for begge pekerforhold.
- Uten valgt middag finnes ingen valgt-klasser; med valgt middag har bare riktig kort klassen. Fokus, rulleposisjon og footer testes videre.
- Navnekontrollen for app.js, src/ og index.html består. Ingen brukerdata anonymiseres.
- Versjonsnumrene er v113/113 og minsteversjonen er fortsatt 106.

Ekte iPhone-tastatur, Safari-knappfarger og fysisk rulling er ikke testet. De lokale fokus-/CSS-kontrollene erstatter ikke dette; kontrollpunktene står i RELEASE.md. Ingen avvik fra beskjeden.

## Rammer

Ingen nettverk, installasjon, publisering eller Git-kommandoer. Ingen endring i functions/, firestore.rules, datamodell, synkmoduler, Firestore-struktur eller REQUIRED_MIN_APP_VERSION. Ingen filer utenfor prosjektmappen er endret.
