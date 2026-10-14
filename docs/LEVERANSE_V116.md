# Leveranse v116 – oppskriftskort og felles blyant

Dato: 14. oktober 2026. Utgangspunkt: v115.

## Resultat

Oppskriftskortet har én hovedknapp med tittel og eventuell Mangler oppskrift, og én separat blyantknapp til høyre. Hovedknappen åpner oppskriften og har aria-label «{tittel}, åpne oppskrift». Blyanten åpner redigeringen og har aria-label «Rediger {tittel}».

Begge er native button-elementer som kan nås med tastatur. Knappene er søsken i kortets rad, aldri inni hverandre. Article er bare kortbeholder, uten data-view-meal. Eksisterende hendelsesbindinger brukes videre, også når søk oppdaterer kortlisten.

pencilIcon er flyttet til src/render/icons.js og brukes direkte av både Uke og Oppskrifter. weekIcon("pencil") delegerer også til samme funksjon. SVG-banene er de samme som Uke hadde. En felles .pencil-button-regel gir begge 44×44 px trykkflate, SVG 18 px, --muted, gjennomsiktig bakgrunn og ingen ramme. Uke beholder sin eksisterende ytre marg.

Kortets bakgrunn, ramme, radius, tittelstil og Mangler oppskrift-merke beholdes. Tittelen får bredden frem til den ene blyanten. Hovedknappen har minimum 44 px høyde; innhold og trykkflater bestemmer kortets naturlige høyde. De oransje ikonknappene er erstattet av den felles blyanten. Fokusmarkering bruker focus-visible.

## Treff fra ikonsøket

Søket fant bare disse to bruksstedene som ikoner i appkoden:

| Fil og opprinnelig sted | Treff | Endring |
|---|---|---|
| src/render/meals.js, renderMealCardView, tidligere linje 48 | □ på meal-open-btn | Knappen fjernet. Tittel/merker er nå den eneste hovedknappen som åpner oppskriften. |
| src/render/meals.js, renderMealCardView, tidligere linje 49 | ✎ på meal-edit-btn | Erstattet med pencilIcon og felles .pencil-button. |

Ingen andre steder brukte symbolene som ikoner. Et nytt søk i app.js, src/ og index.html gir ingen treff. Symbolene kan fortsatt finnes som omtale i dokumentasjon eller som negative testuttrykk; de tegnes ikke i appen.

## Endrede filer per mappe

### Roten

| Fil | Endring |
|---|---|
| app.js | Kun APP_VERSION/APP_VERSION_NUMBER til v116/116. Hendelsesflyt, domenedata og synk er uendret. |
| styles.css | Hovedknappens layout/farge/fokus og felles blyantregel. Uke har bare egen marg. Kortets eksisterende ramme/radius/tittel-/merkestil beholdt. |
| index.html | Alle tre ?v-parametre til 116. |
| service-worker.js | Cache-navn middagsplan-v116 og icons.js i begge asset-listene. Strategien er uendret. |
| AGENTS.md | Regler om søskenknapper, tastaturtilgang, felles ikon/stil og offline-assets. |

### src/render

| Fil | Status og endring |
|---|---|
| src/render/icons.js | Ny: eneste kilde til pencilIcon. |
| src/render/meals.js | Article uten åpningshandling, hovedknapp med tittel/merke og separat felles blyant. |
| src/render/week.js | Importerer samme pencilIcon, fjerner lokal blyantbane og bruker felles knappestil. weekIcon-API beholdes. |

### tests

| Fil | Endring |
|---|---|
| tests/render/meals.test.mjs | Nye aria-labels, to knapper uten nesting, ingen tekstsymboler, ingen handling på article, samme SVG/funksjon i begge visninger, felles størrelse/stil og begge asset-listene. |
| tests/app/window-scroll.test.mjs | Faktisk DOM/hendelsesbinding: hovedknapp og blyant er søsken, kan fokuseres og åpner henholdsvis oppskrift og redigering uten å utløse den andre handlingen. |
| tests/app/workflows.test.mjs | Forventet sikkerhetskopi-appversjon v116. Eksportformatet er uendret. |
| tests/app/access-startup.test.mjs | Blokkeringsfixture 117, over aktuell appversjon. |

### docs

| Fil | Status og endring |
|---|---|
| docs/ARCHITECTURE.md | Felles ikonmodul, kortets native søskenknapper og uendret hendelsesflyt. |
| docs/RELEASE.md | Kontrollpunkter etter eiers publisering. |
| docs/LEVERANSE_V116.md | Ny: denne rapporten. |

Eier tar med **13 endrede filer og de to nye filene** i GitHub Desktop. Ingen slettede filer.

## Kontrollresultater

- Alle **49 testskript** under tests/ og functions/tests/ består uten nettverk.
- **42 kildefiler** består node --check, inkludert den nye ikonmodulen. Functions er kun kontrollert, ikke endret.
- Oppstartstesten kontrollerer også det innebygde HTML-skriptets syntaks. CSS har balanserte klammer.
- Tests viser én hovedknapp og én blyant, ingen nesting, samme SVG fra samme importerte funksjon og riktig åpning/redigering.
- Den nye ikonmodulen står i både ASSETS og NETWORK_FIRST_ASSETS.
- Versjon, HTML og cache er v116/116. REQUIRED_MIN_APP_VERSION forblir 106.

Ekte tastatur, skjermleser og telefonvisning er ikke prøvd. Native button-semantikk, DOM-struktur og handlingene er verifisert med lokale stubber; kontrollpunkter etter publisering står i RELEASE.md. Ingen avvik fra beskjeden.

## Rammer

Ingen nettverk, installasjon, publisering eller Git-kommandoer. Ingen endring i functions/, firestore.rules, datamodell, Firestore-struktur, synkmoduler eller skysynk. Ingen filer utenfor prosjektmappen er endret.
