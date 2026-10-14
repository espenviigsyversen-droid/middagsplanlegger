# Leveranse v117 – oppskriftsskjema og nytt importkort

Dato: 14. oktober 2026. Utgangspunkt: publisert v116.

## Resultat

Mens editoren er åpen, skjules Oppskrifter, Ny oppskrift og oppskriftslisten. Øverst står en sticky stripe med Avbryt, Ny oppskrift/Rediger og Lagre. Stripen tar hensyn til safe-area. Lagre sender samme native skjema og samme handler som Lagre middag nederst; feltvalideringen beholdes. Nederst er Avbryt fjernet, mens Slett beholdes for eksisterende oppskrifter.

Avbryt og tilbake sammenligner skjemaet med oppskriften slik den var da redigeringen startet. Felt, ingredienser, overskrifter, steg, importresultat og uferdig importarbeid beskyttes. Uendret editor lukkes direkte. Ved endringer vises Forkaste endringene som alertdialog nedenfra. Fortsett beholder arbeidet; Forkast lukker uten lagring. Tilbake/Escape mens arket er åpent lukker bare arket. Tastaturfokus starter på Fortsett og holdes mellom handlingene. Historikkoppføringer håndteres av eksisterende kontroller, ikke av render eller skydata.

Fyll ut automatisk er et hvitt kort med Lenke/Bilde/Tekst. Bare valgt modus vises; innholdet i de andre modusene beholdes ved bytte og ved lukking av kortet. Ny oppskrift starter åpent. Eksisterende starter lukket, unntatt en kilde uten både ingredienser og steg. Kortets status, utfylling, erstatningsvalg, advarsler, kvote og nøkkelstatus bruker eksisterende importflyt.

Instagram, Facebook, fb.watch og TikTok med underdomener gjenkjennes lokalt. Forklaring og Bruk tekst/Bruk bilde vises straks; Hent skjules, og et direkte forsøk sendes ikke til serveren. Tom Kilde (lenke) fylles i utkastet, mens en annen kilde beholdes. Vanlig vellykket lenkeimport fyller også tom kilde. Oppskriften lagres fortsatt bare med Lagre.

## Skjermbeskrivelse ved 375 px

Beskrivelsene er kontrollert mot HTML, CSS og lokale DOM-stubber, ikke en faktisk telefonrendering. Safe-area, rulling og native kontroller må prøves etter eiers publisering.

| Skjerm fra skissen | Utforming |
|---|---|
| Ny oppskrift, tom lenke | Fast stripe over et hvitt importkort med tre like modusknapper. Lenke er grønn/valgt. Beige lenkefelt, forklaring og grå deaktivert Hent oppskrift. Skillelinjen eller fyll ut selv leder videre til skjemaet. |
| Sosial lenke | Samme stripe og Lenke-modus. En lys varm infoboks med plattformnavn og to hvite Bruk tekst/Bruk bilde-knapper erstatter Hent. SVG-hake og kildelinje vises når lenken også står som kilde. |
| Bilde med to valgte bilder | Bilde er grønn/valgt. Firekolonners område har Bilde 1, Bilde 2 og stiplet pluss-rute i 3:4-format. Rund fjern-knapp, egen kamera-/velg-knapp og fullbredde Hent fra 2 bilder. Filvelgerens rå tekst er visuelt skjult. |
| Eksisterende oppskrift | Rediger i stripen. En 52 px høy knapp Fyll ut fra lenke, bilde eller tekst erstatter importkortet. Navn, porsjoner og andre felt følger under; kilden heter Kilde (lenke). Åpning velger Lenke og bruker kilden når importlenken er tom. |
| Forkastingsark | Mørk hinne, avrundet hvitt ark nedenfra med håndtak, Forkaste endringene og aktuell tittel. Fullbreddes Fortsett å redigere i grønt, deretter Forkast endringene med rød tekst. Underliggende arbeid beholdes til eksplisitt forkasting. |

Det tillatte alternativet **Bilde N-ruter** er brukt fremfor miniatyrer. Dermed introduseres ingen ekstra bildekopier eller bildedata i markup. De faktiske forminskede bildene og sendingen er uendret og finnes bare i minnet.

## Endrede filer per mappe

### Roten

| Fil | Endring |
|---|---|
| app.js | Editorens åpning/baseline, Avbryt/Fortsett/Forkast og tilbakehåndtering. Modusbytte, kortets åpning/lukking, lokale sosial-hint og utfylling av tom kilde. Egen stripe erstatter toppfelt under redigering. Versjon v117/117. |
| styles.css | Sticky stripe, importkort/modusknapper, sosial infoboks, bilde-/pluss-ruter og skjult filfelt. Forkastingsark med safe-area og rulleområde. |
| index.html | Alle versjonsparametre til 117. |
| service-worker.js | CACHE_NAME middagsplan-v117 og de to nye klientmodulene i begge asset-listene. Strategien er uendret. |
| AGENTS.md | Regler om stripe, samme submit-skjema, ulagrede endringer, historikk og klientens sosial-gjenkjenning. Nye moduler/testkommandoer og minnelagring. |

### src/domain

| Fil | Status og endring |
|---|---|
| meal-editor.js | Ny: rent fingeravtrykk av editorens redigerbare innhold og lokal sosial-vertsgjenkjenning. |

### src/render

| Fil | Status og endring |
|---|---|
| meals.js | Skjuler liste/overskrift under redigering. Stripe, kildeetikett, importkort, skillelinje og alertdialog; bunnknapper tilpasset. |
| recipe-import.js | Ny: separat rendering av importkortets tre moduser, eksisterende status/valg, sosial-hint og bildevalg med egne ikoner. |

### tests/domain

| Fil | Status og endring |
|---|---|
| meal-editor.test.mjs | Ny: endret/uendret skjema, ingredienser/overskrifter/steg, merker og sosial-verter, underdomener og feilaktige vertsnavn. |

### tests/render

| Fil | Status og endring |
|---|---|
| recipe-import.test.mjs | Ny: én synlig modus, aria-pressed, tomknapper, bildetekster og skjult filfelt, kollapset/åpen editor, lokale sosial-hint, stripe/form og forkastingsark/CSS. |
| meals.test.mjs | Oppdaterte forventninger for editorstripe og nye importmoduser. Eksisterende oppskrift-/gruppe-/importvalgkontroller beholdes. |
| ai-key.test.mjs | Tilpasset åpne importkort og deaktiverte handlinger ved manglende oppsett; eksisterende nøkkelstatus og tilgangstekster kontrolleres fortsatt. |

### tests/app

| Fil | Status og endring |
|---|---|
| meal-editor.test.mjs | Ny: Avbryt/tilbake, Fortsett/Forkast, import som ulagret endring, sosial-hint uten forespørsel, kildebevaring, modus-/kortbytte, retur fra AI-innstillinger og begge Lagre-knappers felles skjema. |
| navigation.test.mjs | Tilbake fra endret editor forventer nå forkastingsark; tilbake i arket bevarer editor. Historikken skal fortsatt stabilisere seg. |
| meals-sync.test.mjs | Ventende importvalg-fixture har eksplisitt åpent kort. Synk-/utkastbevaringskontroller beholdes. |
| weeks-sync.test.mjs | Samme justering av åpent importkort i fixture; øvrige synkkontroller beholdes. |
| access-startup.test.mjs | Blokkeringsfixture 118, over aktuell appversjon. |
| workflows.test.mjs | Forventet eksport-appversjon v117; format og lagring uendret. |

### docs

| Fil | Status og endring |
|---|---|
| ARCHITECTURE.md | Editorstripe, fingeravtrykk, historikk/ark, importkort og lokal sosial-gjenkjenning. |
| STATE_MODEL.md | Runtime-baseline, forkastingsark og tab/expanded, med uendret domene-/lagringsformat. |
| RELEASE.md | Kontrollpunkter for PC/iPhone etter eiers publisering. |
| LEVERANSE_V117.md | Ny: denne rapporten. |

Eier tar med **16 endrede og 6 nye filer** i GitHub Desktop. Ingen slettede filer. De nye modulene må publiseres sammen med appen.

## Kontrollresultater

- Alle **52 testskript** under tests/ og functions/tests/ består uten nettverk.
- **44 kildefiler** består node --check: app.js, service-worker.js, alle src-moduler, functions/index.js og functions/lib. Functions er bare kontrollert, ikke endret.
- Oppstartstesten kontrollerer også det innebygde HTML-skriptets syntaks. CSS har balanserte klammer.
- Den eksisterende tests/app/recipe-import.test.mjs er uendret og består med url, tekst, bilde, erstatningsvalg, kvote, nøkkelstatus og vern mot sene svar. Rene domene-/sync-importtester består også uendret.
- Lokale app-/History-stubber bekrefter at uendret editor lukkes, mens endret editor åpner arket. Fortsett og tilbake i arket bevarer felt/rader; Forkast lagrer ingenting. Importarbeid, kortbytte og AI-retur beholder innhold bare i minnet.
- Sosiale lenker gir ingen importforespørsel. Vanlig lenkeimport fyller tom kilde og beholder en annen valgt kilde.
- Appversjon, numerisk versjon, HTML-parametre og cache er v117/117. REQUIRED_MIN_APP_VERSION er fortsatt 106. Begge nye moduler finnes i ASSETS og NETWORK_FIRST_ASSETS.

Ekte 375 px-telefonvisning, Safari safe-area/skjermtastatur, native filvelger/kamera, toppknappens nettleservalidering og telefonens tilbake-sveip er ikke prøvd. Strukturen og samme submit-handler er kontrollert lokalt; enhetskontrollene står i RELEASE.md.

## Rammer

Ingen nettverk, installasjon, publisering eller Git-kommandoer er brukt. Ingen endring i functions/, firestore.rules, datamodell, Firestore-struktur, synkmoduler eller skysynk. Hash-sammenligning med filene ved oppstart bekrefter at functions/, firestore.rules og src/sync/ er uendret. Ingen filer utenfor middagsplanlegger er endret.
