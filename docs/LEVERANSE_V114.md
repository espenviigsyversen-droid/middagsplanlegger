# Leveranse v114 – ukevalg, planvalg, forslag og velgerfiltre

Dato: 14. oktober 2026. Utgangspunkt: v113. Eiers svar om nye poengtall, fast plass i velgeren og 52-lørdagstesten er tatt inn og går foran opprinnelige krav 6, 7 og 9.

## Resultat

Appen starter fortsatt på Handle, med denne uka valgt. weekOffset lagres ikke og leses ikke tilbake fra eldre lokale kopier. Etter mer enn 30 minutter i bakgrunnen, eller ved skifte av faktisk uke, nullstilles ukevalget uten ny historikk og uten å lukke vinduer.

Åpne dagsark, middagsvelger, ukemeny og tømmingsbekreftelse beholder uka de ble åpnet for i planningWindowWeekKey. Underliggende Uke-visning går til denne uka, men middagsvalg, notater, porsjoner, forslag og tømming i vinduet gjelder fortsatt riktig opprinnelig uke. Konteksten beholdes ved retur mellom vinduer og forkastes ved siste lukking/tilgangsstopp. Dette er den presiseringen eier godkjente under arbeidet.

Ikke middag hjemme-knappen erstattes etter trykk av en tydelig overskrift, planvalg med lys bakgrunn/grønn ramme og pil, samt Avbryt. Panelet ligger i samme faste footer og kan rulles. Tastaturaktivering fokuserer første valg; berøring åpner ikke søket/tastaturet automatisk.

Velgeren har kombinerbare Rask, Barnevennlig og Favoritter, pluss én kategori om gangen. Filtre gjelder forslag og resultatliste sammen med søket. Tomt resultat gir Ingen middager passer filtrene og Fjern filtre. Filtrene er bare i minnet og nullstilles ved lukking. Raden ruller vannrett uten synlig rullefelt; scrollLeft bevares ved render i tillegg til eksisterende scrollTop/fokus.

## Endelig poengmodell

| Del | Poeng |
|---|---|
| Dagstype samsvarer / ingen merker / andre merker | +22 / +10 / −20 |
| Favoritt / barnevennlig | +10 / +6 |
| Rask på raske dager / ønskede rester | +25 / +6, uendret |
| Nærmeste planavstand 0–7 / 8–14 / 15–21 / 22–28 dager | −95 / −58 / −30 / −14, uendret |
| Over 28 dager | +2 per hel uke siden planlagt, maks +30 |
| Aldri planlagt | +25 |
| Variasjon | Stabil hash av uke, dag og middag: 0–15 |
| Kategorimål / nylig kategoribruk / minimum dager mellom | Tidligere regler beholdes |

Alle uker i plansByWeek undersøkes, både tidligere og framtidige. Nærmeste absolutte kalenderdagsavstand brukes; datoene normaliseres til samme klokkeslett. En middag om tre dager straffes derfor som en for tre dager siden. Den aktuelle plancellen utelates ved vurdering av bytte. Ingen Math.random brukes.

Bare velgeren har fast plass: de to beste etter poeng beholdes, og blant de øvrige prioriteres først beste aldri planlagte, deretter beste med nærmeste planavstand minst 56 dager, ellers nummer tre etter poeng. De to første får også Aldri i planen/Ikke i planen på lenge når de kvalifiserer; de hindrer ikke utvelgelse blant de øvrige. Filtrering skjer før valget. En nyere fallback får ingen egen linje. Øvrige Foreslå-handlinger bruker bare poengrangeringen. Dette er den korrigerte regelen før v114-publisering.

suggestionScoreBreakdown returnerer delpoeng som en ren test-/feilsøkingsfunksjon. Delpoeng vises aldri i appen og lagres ikke.

## Simulering: 52 lørdager

Testdataene i tests/domain/suggestions.test.mjs har 30 middager:

- Tre gamle med Helg, favoritt og barnevennlig, sist i planen fem uker før den aktuelle lørdagen.
- Fem merket bare Hverdag.
- 22 nye uten merker og uten planhistorikk.

Simuleringen begynner lørdag 17. oktober 2026 og kjører 52 lørdager. Kategori-, rask- og resterpoeng er nøytrale, slik at testen sammenligner de avtalte delene. Historikkavstanden på fem uker er samme grunnlag hver lørdag; hash endres med uka.

| Måling | Faktisk resultat | Krav |
|---|---:|---:|
| Ny middag i velgerens topp tre | **52 av 52** | 52 av 52 |
| Ny middag i ren poengrangering, topp tre | **17 av 52** | Minst 15 |
| Minst én gammel favoritt i ren poengrangering, topp tre | **52 av 52** | Minst 30 |

### Topp fem før og etter – lørdag 17. oktober 2026

Dette er ren poengrangering for samme testdata. Like poeng i v113 beholder testdataenes rekkefølge, slik den gamle sorteringen gjorde.

| Plass | Før, v113 | Poeng | Etter, v114 | Poeng |
|---:|---|---:|---|---:|
| 1 | Merket middag 1 | 70 | Merket middag 1 | 59 |
| 2 | Merket middag 2 | 70 | Merket middag 3 | 57 |
| 3 | Merket middag 3 | 70 | Merket middag 2 | 50 |
| 4 | Hverdagsmiddag 1 | 18 | Ny middag 14 | 49 |
| 5 | Hverdagsmiddag 2 | 18 | Ny middag 2 | 48 |

Velgeren viser denne lørdagen **Merket middag 1**, **Merket middag 3** og **Ny middag 14**, med Aldri i planen på den siste. Den faste plassen endrer utvalget, uten å endre poengene. Testene kontrollerer også fallback når ingen kandidat kvalifiserer, at filtrene gjelder plassen, og stabil rangering for samme uke/dag.

## Endrede filer per mappe

### Roten

| Fil | Endring |
|---|---|
| app.js | Oppstart/retur til denne uka, bundet vindusuke, tydelig planpanel, filterflyt, all-plan-recency, hash og fast plass kun i velgeren. scrollLeft-bevaring. Versjon 114. |
| styles.css | Filterrad, aria-pressed-stil og kontrasterende planvalg/Avbryt. Footerens faste plassering beholdt. |
| index.html | Alle ?v-parametre er 114. |
| service-worker.js | CACHE_NAME er middagsplan-v114. Asset-lister og strategi er uendret. |
| AGENTS.md | Regler for ukevalg, vinduskontekst, endelige poeng, fast plass og runtime-filtre. |

### src/domain og src/sync

| Fil | Endring |
|---|---|
| src/domain/suggestions.js | Nye poeng, stabil hash, ren delpoengfunksjon, filterpredikat og picker-only utvalg. scoreCategoryPreference er uendret. |
| src/sync/local-store.js | Fjernet weekOffset fra den lokale oppstartskopien. Dette er cache/persistens, ingen endring i skysynk. |

### tests

| Fil | Endring |
|---|---|
| tests/domain/suggestions.test.mjs | Nye poeng/hasher, delpoeng, filtre, fast plass/fallback, 52-lørdagssimulering og før/etter-data. Eksisterende kategorimål testes videre. |
| tests/app/week.test.mjs | Bakgrunn/ukeskifte uten historikk, hele planhistorikken og symmetrisk framtid/past, variasjon, minimumsavstand og fast plass bare i velgeren. |
| tests/app/window-scroll.test.mjs | Filterkombinasjoner/kategoribytte/søk, tomtilstand/nullstilling, scrollLeft/fokus, keyboard-planvalg og bevart vindusuke ved bakgrunnsretur, inkludert bekreftelsesretur. |
| tests/render/week.test.mjs | Filterradens énlinje-rulling, trykkflater/valgt-stil og planvalgenes kontrast. |
| tests/sync/local-store.test.mjs | Kompakt lokal kopi inneholder ikke weekOffset. |
| tests/app/local-store.test.mjs | Eldre lagret offset 1 og 2 åpner på 0; data/filtre beholdes. |
| tests/app/workflows.test.mjs | Forventet appversjon i sikkerhetskopien er v114. Formatet er uendret. |
| tests/app/access-startup.test.mjs | Blokkeringsfixture 115, over aktuell appversjon. |

### docs

| Fil | Status og endring |
|---|---|
| docs/ARCHITECTURE.md | Endelige tall, oppstart/bakgrunn, vinduskontekst, fast plass, filter-/planpanel og simulering. |
| docs/STATE_MODEL.md | weekOffset fjernet fra lokal lagring; runtime-uke/filtre og uendrede domenefelter beskrevet. |
| docs/RELEASE.md | Manuelle kontrollpunkter etter eiers publisering. |
| docs/LEVERANSE_V114.md | Ny: denne rapporten. |

Eier tar med **18 endrede filer og denne nye rapporten** i GitHub Desktop. Ingen slettede filer.

## Kontrollresultater og begrensninger

- Alle **49 testskript** under tests/ og functions/tests/ består uten nettverk.
- **41 kildefiler** består node --check: app.js, service-worker.js, alle src-moduler samt functions/index.js/functions/lib. Functions er kun kontrollert, ikke endret.
- Oppstartstesten kontrollerer også det innebygde HTML-skriptets syntaks. CSS har balanserte klammer.
- Lagret ukevalg, 5/31 minutter i bakgrunnen, ukeskifte, uendret historikk og måluke i fortsatt åpne vinduer er dekket av lokale stubber.
- Poeng, planavstand, minimumsavstand, filtre, fast plass og 52 lørdager er dekket med syntetiske data. Kategori- og minimumsreglene er beholdt.
- Versjon/cache/HTML er v114/114. REQUIRED_MIN_APP_VERSION forblir 106.

Ekte iPhone-bakgrunn/ukeskifte, systemets suspendering, skjermtastatur og vannrett touch-rulling er ikke prøvd. Det står kontrollpunkter i RELEASE.md. Ingen avvik fra beskjeden med eiers tillegg; konteksten for åpne vinduer følger eiers uttrykkelige godkjenning.

## Rammer

Ingen nettverk, installasjon, publisering eller Git-kommandoer. Ingen endring i functions/, firestore.rules, datamodell, Firestore-struktur eller skysynk. local-store-endringen fjerner bare det lokale UI-ukevalget fra cache. Ingen filer utenfor prosjektmappen er endret.

## Retting før publisering – prioritet i den faste plassen

Den tidligere funksjonen fant første kandidat som enten var aldri planlagt eller borte i minst åtte uker. En høyt rangert gammel favoritt kunne dermed vinne foran alle aldri planlagte. Funksjonen så dessuten først i hele listen, og kunne slutte å lete når kandidaten allerede var blant de to beste.

selectPickerSuggestions beholder nå de to beste, utelater dem fra søket etter tredje kandidat, og prioriterer aldri planlagte foran lenge fraværende. Begge første kandidater beholder sine kvalifiserende linjer; utvalget av den faste plassen skjer likevel blant øvrige. Rene poeng, hash, filtre, andre forslagkommandoer og versjon v114/114 er uendret.

### Nye regresjonssimuleringer

Hvert tilfelle bruker tre helg/favoritt/barnevennlige middager og 22 aldri planlagte middager, gjennom de samme 52 lørdagene som ovenfor.

| Favorittenes siste plan | Lørdager med aldri planlagt middag i topp tre |
|---|---:|
| 12 uker siden | **52 av 52** |
| 5 uker siden | **52 av 52** |
| 2 uker siden | **52 av 52** |

Uten aldri planlagte velges kandidaten som er borte i 10 uker foran en høyere rangert, nyere kandidat, med linjen **Ikke i planen på lenge**. Tester dekker også kvalifiserte middager blant de to første, riktig fallback uten egen linje, uendret rekkefølge/innhold i poenglisten, ingen doble middager og filtre før utvelgelse. Den opprinnelige 52-lørdagstesten og før/etter-tabellen består fortsatt uendret.

### Filer endret i denne rettingen

| Mappe | Fil | Endring |
|---|---|---|
| src/domain | suggestions.js | Riktig prioritet blant øvrige og linjer på alle kvalifiserte i utvalget. |
| tests/domain | suggestions.test.mjs | 52 lørdager for 12/5/2 uker, 10-ukers kandidat, første-to-regler, fallback og uendret input. |
| tests/app | week.test.mjs | 12-ukers favoritter, linjer i faktisk velger-rendering og filtrert utvalg. |
| Roten | AGENTS.md | Korrigert regel for den faste plassen. |
| docs | ARCHITECTURE.md | Korrigert utvalg og nye regresjonsresultater. |
| docs | LEVERANSE_V114.md | Oppdatert regel og denne rettingsrapporten. |

Alle **49 testskript** og **41 kildefilers syntakskontroller** består. Ingen nye eller slettede filer, ingen versjonsbump. Eier tar med disse seks filendringene sammen med resten av v114 i GitHub Desktop.

Ingen nettverk, installasjon, publisering eller Git-kommandoer er brukt. Functions, firestore.rules, datamodell og skysynk er uendret. Ingen filer utenfor prosjektmappen er endret.
