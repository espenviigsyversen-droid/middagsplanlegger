# Leveranse v112 – samlet Uke-visning

Dato: 14. oktober 2026. Utgangspunkt: v111. De fem godkjente presiseringene er fulgt, inkludert manuelle valg på låste dager og Handle som startside.

## Resultat

Kalender og Planlegger er erstattet av én Uke-visning. Den har ISO-ukenummer, faste navigasjonspiler, dagsliste med separate hovedhandlinger og blyanter, dagsark, middagsvelger med inntil tre forslag, ukemeny og tømmingsbekreftelse i appen. Den eksisterende forslagberegningen er trukket ut til en rangert liste og brukes fortsatt av pickSuggestion. Ingen nye poengregler er innført.

Gamle calendar/planner-navn tolkes som week ved normalisering, navigasjon og retur. En ny økt starter fortsatt på Handleliste. Minimumsversjonen er fortsatt 106; appversjon, numerisk versjonsvakt, HTML-parametre og cache er v112/112.

## Endrede filer per mappe

### Roten

| Fil | Endring |
|---|---|
| app.js | Tre faner, samlet Uke-rendering, vindusåpning/-retur, inline planvalg, historikk for ukemeny/bekreftelse, sveip og rangert forslagliste. Gamle Kalender-/Planlegger-renderfunksjoner fjernet. Versjon 112. |
| styles.css | Ukehodet, dagskort, dagsark, forslagkort, ukemeny og bekreftelse etter skissene. Tre like brede faner. Gammel Kalender-/Planlegger-CSS fjernet. |
| index.html | Versjonsparametre satt til 112. |
| service-worker.js | Cache-navn v112; begge asset-listene bruker de to nye modulene og fjerner de to gamle render-modulene. Strategien er uendret. |
| AGENTS.md | Gjeldende filer/testkommandoer og regler for Uke, lås, historikk, vinduer, rulling og sveip. |

### src/domain og src/render

| Fil | Status og endring |
|---|---|
| src/domain/week-view.js | Ny: visningsaliaser, ISO-ukenummer, datointervaller, forslagstelling, historikktekst og sveipeterskler. |
| src/render/week.js | Ny: Uke, dagsrader, dagsark, ukemeny og tømmingsbekreftelse. SVG-ikoner, aria-tekster og stabile rulle-/fokusnøkler. |
| src/render/calendar.js | Slettet; erstattet av week.js. |
| src/render/planner.js | Slettet; erstattet av week.js. |

### tests/domain og tests/render

| Fil | Status og endring |
|---|---|
| tests/domain/week-view.test.mjs | Ny: visningsaliaser, ISO-ukenummer/årsskifte, datointervaller, telling, historikk og sveip. |
| tests/render/week.test.mjs | Ny: Uke-rader, overskrift, lås, porsjoner/notat, dagsark, ukemeny, bekreftelse og CSS-rammer. |
| tests/render/meals.test.mjs | Oppdatert: fjernet kontroll av den gamle flytende planleggerknappens ikonregel. |
| tests/render/calendar.test.mjs | Slettet; erstattet av den samlede week-testen. |
| tests/render/planner.test.mjs | Slettet; erstattet av den samlede week-testen. |

### tests/app

| Fil | Status og endring |
|---|---|
| tests/app/week.test.mjs | Ny: reell appflyt med lokale stubber for forslag, manuelle låste valg, dagskontekst, porsjoner, notat, fjerning, vinduer/historikk, tømming og sveip. |
| tests/app/navigation.test.mjs | Oppdatert til Uke og de nye radene. Eksisterende tilbake-/editor-/velgervern testes videre. |
| tests/app/window-scroll.test.mjs | Oppdatert dagsark og fokusnøkler; ny kontroll av ukemeny → bekreftelse → ukemeny med bevart rulleposisjon/fokus. |
| tests/app/workflows.test.mjs | Tre faner, nye Uke-tekster og v112 i sikkerhetskopiens appversjon. |
| tests/app/weeks-sync.test.mjs | Tømming gjennom ukemeny og appbekreftelse; samme seks domenekart og skrivepayload som før. |
| tests/app/local-store.test.mjs | Navigasjonstesten bruker Uke i stedet for Planlegger. |
| tests/app/access-startup.test.mjs | Blokkeringsfixture over v112, slik at numerisk versjonsvakt fortsatt testes. |

### docs

| Fil | Status og endring |
|---|---|
| docs/ARCHITECTURE.md | Oppdatert moduloversikt, Uke-flyt, forslag, vindushierarki, rullebeholdere og historikk. |
| docs/STATE_MODEL.md | UI-visningen week, kompatibilitet med gamle navn og runtime-tilstand for vinduer; domenefelter er uendret. |
| docs/RELEASE.md | Gjeldende testkommandoer og manuell kontroll etter eiers publisering. |
| docs/LEVERANSE_V112.md | Ny: denne rapporten. |

Eier må ta med alle nye og endrede filer samt de fire slettingene i GitHub Desktop. Ingen installasjon eller serverpublisering trengs for leveransen.

## Skjermbeskrivelse ved 375 px

Beskrivelsene nedenfor bygger på HTML/CSS og renderingstester, sammenlignet med de godkjente skissene. De er ikke målinger fra en virkelig telefon eller nettleserskjerm.

- **Uke:** kompakt ukehodet med 44 px piler i faste kolonner, 22 px tittel og mindre dato/ukenummer. Forslag til venstre og I dag/meny til høyre. Dagskortet er hvitt med avrundede hjørner og delestreker. Dagens rad har lys bakgrunn, grønn venstrekant og I dag under datoen. Andre linje viser eget porsjonstall og notat med ellipsis; lås er et grått ikon, uten farget låsekant. Tre like brede faner nederst.
- **Dagsark:** et avrundet ark nedenfra med håndtak, dag/dato og lukkeknapp. Middagskortet er lyst, fulgt av Bytt middag/Foreslå annen. Plan/type er valg inne i arket. Porsjoner har −/+, lås er en bryter og notat er et tekstfelt. Fjern middag er rød tekst nederst. Låst dag beholder aktiv Bytt middag, men deaktivert Foreslå annen med godkjent forklaring.
- **Middagsvelger:** dag/dato/type under Velg middag, søk øverst, 0–3 lyse forslagkort før kategoriene og en fast Ikke middag hjemme-knapp nederst. Alternative planer vises inne i samme vindu. Ingen middag planlagt-valget er fjernet. Søket bruker eksisterende flyt uten full render per tastetrykk.
- **Ukemeny:** ark nedenfra med ukenummer/dato og to forklarende forslagkort. Tøm uka står i rødt under en skillelinje, og Avbryt er nederst. Tomme/erstattbare dager telles som ulåste hjemmedager; valgene deaktiveres når antallet er null.
- **Bekreftelse:** erstatter ukemenyen med Tømme uke N?, datointervall og tydelig opplisting av middag, lås, planvalg, dagstype, porsjoner og notat. Avbryt returnerer til menyen; Tøm uka lukker begge. Ingen nettleserdialog brukes.

Innholdet sentreres med maks 720 px på PC. Nye trykkflater har minst 44 px høyde/bredde der relevant. Plan/type bruker native select inne i arket, i tråd med presiseringen.

## Historikk, rulling og fokus

Den eksisterende History-controlleren er beholdt. Brukerhandlinger går gjennom navigate; render, skydata og synkstatus legger aldri til oppføringer. Visningen heter week også ved retur fra gamle visningsnavn. Oppskrift fra Uke beholder samme weekOffset og dagskontekst.

Middagsvelgeren erstatter dagsarket, men mealPickerReturn beholder dagsarket som logisk forelder. Tilbake gir velger → dagsark → Uke. Tømmingsbekreftelsen erstatter ukemenyen; weekClearConfirmation beholder menyens logiske foreldrenivå og rulle-/fokusposisjon. Tilbake/Avbryt gir bekreftelse → ukemeny → Uke. Bekreftet tømming lukker begge.

Rulling bruker planner-day på dagsarkets .week-sheet-body, week-menu og week-clear på deres .week-sheet-body, meal-picker på den eksisterende listen og picker-plans på den høydebegrensede alternative planlisten. Stabile data-focus-key bevarer kontroller ved render. Bekreftelsesretur og velgerretur gjenoppretter skjult forelders posisjon/fokus. Runtime-tilstand lagres aldri i lokal kopi, synk eller sikkerhetskopi.

## Kontroller og begrensninger

- Alle **49 testskript** under tests/ og functions/tests/ består, uten nettverk.
- **41 kildefiler** består node --check: app.js, service-worker.js, alle src-moduler samt functions/index.js og functions/lib. Functions-filer er kun kontrollert, ikke endret.
- Oppstartstesten kontrollerer også syntaksen i det innebygde HTML-skriptet.
- CSS har balanserte klammer. Nye klientmoduler står i begge asset-listene; gamle render-moduler er fjernet fra begge. REQUIRED_MIN_APP_VERSION er fortsatt 106.
- Tester dekker årsskifte (28. desember 2026–3. januar 2027, ISO-uke 53), uke over to måneder, 80 px vannrett sveip, blokkering av kantsveip/loddrett bevegelse og ett synlig Uke-vindu om gangen.
- Ekte iPhone/Android, systemets tilbake-sveip, faktisk touch-rulling, skjermtastatur, safe-area, store skrifter og fysisk plassering ved 375 px er ikke testet. Se RELEASE.md for kontroll etter eiers publisering.

Ingen funksjonelle avvik fra beskjeden eller de godkjente presiseringene. Interne UI-navn plannerDaySheet/plannerActionsOpen og historikk-ID-er beholdes for å videreføre eksisterende vindusvern; synlige faner og navigasjon bruker Uke.

## Rammer

Ingen nettverk, installasjon, publisering eller Git-kommandoer er brukt. Ingen endringer i functions/, firestore.rules, synkmodulene, datamodellen eller Firestore-strukturen. REQUIRED_MIN_APP_VERSION og service worker-strategien er uendret. Ingen filer utenfor prosjektmappen er endret.
