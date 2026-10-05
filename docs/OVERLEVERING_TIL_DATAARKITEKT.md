# Middagsplanlegger: overlevering til dataarkitekt og utvikler

**Dato:** 5. oktober 2026  
**Gjennomgått kodeversjon:** v90  
**Målgruppe:** dataarkitekt, løsningsarkitekt og utvikler som skal bidra til videreutvikling.

Dokumentet beskriver den lokale prosjektkopien slik den foreligger på datoen over. Det bygger på kildekode, eksisterende dokumentasjon og lokale tester. Produksjonsdata, Firebase-konsollen, sikkerhetsregler og den publiserte appen er ikke kontrollert. Forslagene nedenfor er anbefalinger, ikke allerede implementerte løsninger.

## 1. Formål og bakgrunn

Middagsplanlegger er en familieapp som knytter sammen middagsplanlegging, familiens egne oppskrifter og en felles handleliste. Den skal gjøre det enklere å velge middager, få oversikt over uken og handle riktige varer i riktige mengder.

Appen brukes på telefon og PC og kan installeres som en PWA (Progressive Web App). Den er utviklet gradvis ut fra praktiske behov og tilbakemeldinger, uten en fullstendig arkitekturplan fra starten. Deler av hovedkoden er senere flyttet til egne moduler og fått automatiserte tester.

Eieren ønsker å involvere en dataarkitekt for å ta gode valg om data, synkronisering og videre struktur. Codex skal fortsette å implementere endringene i samarbeid med eieren. Målet er en trygg, forståelig og vedlikeholdbar app som kan videreutvikles i små steg.

Den viktigste brukerforventningen er at planlegging og oppskrifter ikke forsvinner eller blir overskrevet når en annen enhet åpner appen med gamle lokale data.

## 2. Funksjoner og brukerflyter

| Område | Dagens funksjon |
| --- | --- |
| Kalender | Forside med dagens middag, alle ukens dager og navigering mellom uker. Dagens middag vises også i ukelisten. |
| Planlegger | Kompakt ukeoversikt. Brukeren velger middag, låser dager og angir middag hjemme, rester eller spise borte. Detaljer for en dag redigeres i et panel som åpnes fra bunnen. |
| Middagsforslag | Regelbaserte forslag fra familiens egne middager. Kan fylle ledige dager eller erstatte forslag på åpne, ulåste dager. Refresh for en enkelt dag ekskluderer middagen som allerede er valgt. |
| Oppskrifter | Egen oppskriftsdatabase med søk mens brukeren skriver, filtre, gruppering, detaljvisning og redigering. Kompakte lister på mobil. |
| Handleliste | Manuell innlegging med vareforslag, butikkategorier, avhuking og redigering. Kan hente ingredienser fra én oppskrift eller flere planlagte dager. |
| Ingrediensgjennomgang | Alle ingredienser er valgt i utgangspunktet. Brukeren kan fjerne varer som allerede finnes hjemme før listen oppdateres. Ukegjennomgangen grupperer ingredienser per middag. Bekreftelse vises etter tillegging. |
| Porsjoner | Personantall lagres per dag og brukes til skalering. Det vises i dagredigeringen, men er fjernet fra den kompakte ukeoversikten. |
| Innstillinger | Åpnes via tannhjul i toppbaren. Familie, middagspreferanser, kategorier, enheter, planvalg, vareoppslag og appoppdatering administreres her. |
| PWA og synk | Lokale data, installasjon på hjemskjerm, cache av appfiler, Firestore-synk og synkstatus. Appversjonen vises ved oppdateringsknappen. |

Ny oppstart viser Kalender. En ny innlasting nullstiller blant annet åpne modaler og aktiv oppskriftsvisning. Dette er ikke en egen håndtering av enhver gjenopptakelse av en allerede åpen app.

Det finnes en loading screen ved oppstart. Den fjernes etter første rendering, før Firebase-synk nødvendigvis er ferdig. Den er derfor ikke en garanti for at remote data er hentet før brukeren begynner å arbeide.

En fremtidig ambisjon er å oppdage/importere oppskrifter fra nettet ved hjelp av AI. Dagens forslagmotor er regelbasert; AI og automatisk nettimport er ikke implementert. Valget «Oppdag nye middager» er foreløpig deaktivert.

## 3. Teknologi og kjøring

| Del | Teknologi og ansvar |
| --- | --- |
| Frontend | Vanlig HTML, CSS og JavaScript med ES-moduler. Ingen frontendrammeverk. |
| Bygg og pakker | Ingen byggprosess, bundler eller lokal npm-avhengighetskonfigurasjon i prosjektkopien. |
| Lokal lagring | `localStorage`, nøkkel `middagsapp-state`. Hele app-state serialiseres til JSON. |
| Backend | Firebase Authentication med anonym innlogging og Cloud Firestore. Ingen egen server i prosjektet. |
| Firebase SDK | Versjon `12.13.0`, dynamisk importert fra Google CDN i `src/sync/firebase.js`. |
| PWA | `manifest.json`, ikoner og service worker. |
| Tester | Node-skript med `node:assert/strict`; ingen separat testrunner. |
| Publisering | Statiske filer. Tidligere bruk og publiseringsrutiner er basert på GitHub Pages og manuell filopplasting. |

Appen må serveres via HTTP lokalt for ES-modulene. PWA-funksjoner krever en støttet, sikker nettleserkontekst, som HTTPS eller localhost. Et eksempel ved installert Python er `python -m http.server 8765 --bind 127.0.0.1` fra prosjektroten, og deretter `http://127.0.0.1:8765/`.

Den lokale kopien behandles som en prosjektmappe uten Git-arbeidsflyt. Arbeidsreglene tillater ikke Git-kommandoer her. Nettverkstilgang og arbeid utenfor prosjektmappen skal avklares med eieren.

## 4. Kodestruktur og ansvarsdeling

```text
index.html                 Inngangspunkt, loading screen og asset-versjoner
app.js                     State, brukerflyter, hendelser og synkorkestrering
styles.css                 Felles styling og responsive regler
service-worker.js          Cache, offline appfiler og oppdatering
manifest.json              PWA-navn, startadresse, farger og ikoner
icons/                     Appikoner
src/
  domain/
    meals.js               Oppskriftshjelpere og normalisering
    shopping.js            Mengder, skalering og sammenslåing av varer
    suggestions.js         Rene poengregler for middagsforslag
    weeks.js               Ukedatoer, ukenøkler og standardverdier
  render/
    calendar.js            Kalender og dagens middag
    planner.js             Ukeoversikt og planleggingspaneler
    meals.js               Oppskriftsliste, søk, detaljer og editor
    shopping.js            Handleliste og ingrediensgjennomgang
    setup.js               Innstillinger og administrasjonssider
  sync/
    firebase.js            SDK, innlogging og Firestore-referanser
    reads.js               Snapshots til lokale state-patches
    state.js               Synkscopes og konfliktbeslutninger
    writes.js              Remote kontroll og writes/slettinger
tests/
  domain/                  Tester av rene domenehjelpere
  render/                  Tester av generert HTML
  sync/                    Tester med simulerte Firebase-API-er
docs/                      Teknisk dokumentasjon
AGENTS.md                  Arbeidsinstruks for Codex
```

Modulariseringen er påbegynt, men `app.js` er fortsatt omtrent 3 500 linjer og eier mange ansvarsområder. Den styrer blant annet normalisering, lokal persistens, planmutasjoner, forslagutvelgelse, event-binding, Firebase-listeners og lagringstiming.

Render-modulene returnerer HTML-strenger. `renderShell()` setter `app.innerHTML`, og `bindEvents()` knytter nye hendelser til elementene etter rendering. Domene-modulene har rene funksjoner som er enklere å teste. Synkmodulene er delvis frikoblet, men appen eksponerer fortsatt Firebase-funksjoner på `window` for bruk i lagringsflyten.

## 5. State og datamodell

Det finnes tre logiske grupper data: domenedata som deles mellom enheter, lokal UI-state og synkstatus. De ligger i dag samlet i ett lokalt state-objekt.

| Entitet | Viktige felter og betydning |
| --- | --- |
| Familie | `name`, `familySize`, `kidFriendlyPerWeek`, `leftovers`, `reuseIngredients`, `quickDays`. |
| Middagspreferanser | `categoryGoals` med minimum/maksimum per uke og ønsket intervall mellom kategorier. |
| Oppskrift/middag | `id`, `title`, `description`, `recipeUrl`, `baseServings`, `ingredients`, `steps`, `categories`, `prepTime`, `favorite`, `kidFriendly`, `leftovers`, `suitability`, `minDaysBetween`, `keyIngredients`, `excludeFromSuggestions`. |
| Ingrediens | `name`, `amount`, `unit`. Mengde og enhet lagres som tekst. Ingrediensen har ingen referanse til et sentralt ingrediensregister. |
| Ukeplan | Seks maps per uke: middag, lås, dagstype, porsjoner, planstatus og notat. |
| Handleliste | `items` og `generatedForWeek`. Varer har `id`, `name`, `amount`, `unit`, `category`, `checked`, `custom`. |
| Metadata | Oppskriftskategorier, enheter, tilberedningstid, egnethet, planvalg, ingrediensoppslag og butikkategorier. |

En ukenøkkel er mandagens lokale dato, eksempelvis `2026-10-05`. Dagene bruker indeks `0` til `6`, mandag til søndag. Lokalt ligger ukeinformasjonen i `plansByWeek`, `lockedPlansByWeek`, `dayTypesByWeek`, `servingsByWeek`, `dayModesByWeek` og `dayNotesByWeek`.

Middagsnavn og metadata er menneskelesbare tekster. Kategori- og oppskriftsreferanser bruker nøkler/ID-er. Ukeplanen peker på oppskriftens ID og lagrer ikke en historisk kopi av oppskriften. Endringer i oppskriften kan derfor påvirke visning og senere handlelistegenerering for tidligere planlagte uker.

Handlevarer slås sammen på normalisert navn og enhet. Numeriske mengder kan legges sammen; enheter som gram og kilo konverteres ikke automatisk til hverandre. Tekstmengder som «etter smak» skaleres ikke numerisk.

UI-state inkluderer aktiv fane, valgt uke, filtre, editorutkast og åpne paneler. Synkstatus inkluderer `clientUpdatedAt` og `pendingLocalSync`. Det finnes ingen eksplisitt `schemaVersion` i dagens dataformat.

### Firestore-struktur

`FAMILY_ID` er hardkodet til `familien` i `app.js`.

```text
families/{familyId}/
  app/profile              family, clientUpdatedAt, updatedAt
  app/preferences          mealPreferences, clientUpdatedAt, updatedAt
  app/metadata             metadata, clientUpdatedAt, updatedAt
  app/shopping             shoppingList, clientUpdatedAt, updatedAt
  meals/{mealId}           Oppskriftsfelter, clientUpdatedAt, updatedAt
  weeks/{weekKey}          plan, lockedPlan, dayTypes, servings,
                           dayModes, dayNotes, clientUpdatedAt, updatedAt
  app/state                Legacy-dokument for eldre samlet state
```

Oppskrifter og uker er egne dokumenter. Handlelisten ligger fortsatt samlet i ett dokument, og alle endringer på samme uke skriver ukens samlede innhold. `merge: true` gjør ikke disse writes til en konfliktbevisst sammenslåing av to brukeres endringer.

## 6. Synkronisering: dagens flyt og begrensninger

1. Appen leser lokal state og viser Kalender.
2. Firebase SDK lastes, og klienten logger inn anonymt.
3. Legacy-data vurderes for migrering. Ved tom remote struktur finnes en førstegangsinitialisering fra lokal state.
4. Firestore-listeners følger profil, preferanser, metadata, handleliste, oppskrifter og uker.
5. En lokal domeneendring gjennom `setState()` setter `clientUpdatedAt = Date.now()` og `pendingLocalSync = true`, lagrer lokalt og renderer.
6. Berørte områder markeres for lagring. Vanlig forsinkelse før remote write er 700 ms.
7. Write-laget leser remote `clientUpdatedAt` før det kaller `setDoc()` eller `deleteDoc()`.
8. Remote snapshots kan patche lokal state og oppdatere skjermen.

Det finnes eksisterende beskyttelse mot eldre data: enkelte eldre snapshots utsettes ved ventende lokale endringer, og dokument-writes hoppes over hvis remote tidsstempel er nyere. Manglende dokumenter skrives bare når `pendingLocalSync` eller eksplisitt initialisering/migrering tillater det.

**Denne beskyttelsen er ikke en full garanti mot tap ved samtidig eller frakoblet bruk.** Følgende forhold er synlige i koden og bør vurderes før vesentlig videreutvikling:

| Observasjon | Konsekvens og anbefalt vurdering |
| --- | --- |
| `getDoc()` og write er separate operasjoner i `src/sync/writes.js`. | En annen enhet kan skrive mellom kontroll og lagring. Vurder atomisk revisjonskontroll i en transaksjon. |
| Konfliktbeslutninger bruker klientklokke, og lokal state har ett felles `clientUpdatedAt`. | Ulike klokker og endringer i ulike entiteter kan gi feil prioritering. Vurder revisjon per dokument og baserevisjon for hver lokal operasjon. Serverens `updatedAt` brukes i dag ikke som konfliktrevisjon. |
| Endring av `meals` skriver alle lokale oppskrifter med samme endringstid. | Redigering av én oppskrift kan føre til at gamle kopier av andre oppskrifter skrives. Registrer bare oppskriftene som faktisk er endret. |
| `pendingRemoteScopes`, `pendingWeekKeys` og `pendingMealDeleteIds` finnes bare i minnet. | Presis informasjon om ventende endringer og slettinger overlever ikke en omlasting. En generell `pendingLocalSync` erstatter ikke en varig operasjonskø. |
| Køer for uker og oppskriftslettinger tømmes før `Promise.all(writes)` er bekreftet. | Feil kan miste informasjon som trengs for retry. Kvitter bare operasjoner som er bekreftet, med beskyttelse mot nye endringer underveis. |
| En write kan hoppes over som stale uten at lagringsflyten får et eksplisitt konfliktresultat. | «Synket» kan vises uten at den lokale endringen ble lagret. Returner lagret/konflikt/feilet per operasjon. |
| Flere listeners oppdaterer samme synkstatus og globale pending-flagg. | Ett snapshot er ikke nødvendigvis en bekreftelse på alle ventende endringer. Synkstatus bør avledes fra samlet kø og bekreftelser. |
| Sletting skjer med `deleteDoc()`, uten tombstone i appmodellen. | En gammel klient kan gjenopprette et slettet dokument når den har andre lokale endringer. Vurder slettemarkør med revisjon og senere opprydding. |

Det brukes ikke eksplisitt konfigurert vedvarende Firestore-cache i denne prosjektkopien. Appens egen `localStorage` og service worker-cache må skilles fra Firebase SDK-ens interne cache. Offline tilgang til appfiler og lokale data betyr heller ikke at førstegangsinnlasting av SDK eller remote synk kan gjøres uten nett.

## 7. Forslagmotor og forretningsregler

Forslagmotoren filtrerer bort middager som er ekskludert fra forslag, allerede brukes på andre dager i uken eller bryter `minDaysBetween`. Den rangerer deretter kandidater ut fra blant annet favoritt, barnevennlighet, rask tilberedning på raske dager, egnethet for dagstype, restpreferanse, kategoriønsker og tidligere planlagte middager.

Utvelgelsen tar kandidaten med høyest poengsum; den er ikke tilfeldig. Refresh ekskluderer nåværende middag. Dette gjør gjentatte trykk mulig, men kan veksle mellom de samme høyt rangerte alternativene. Hvis ingen kandidat finnes, beholder refresh dagens middag uten en særskilt melding.

Arkitekten bør avklare hvilke regler som er harde begrensninger og hvilke som er myke preferanser. Familieinnstillingene inneholder `kidFriendlyPerWeek` og `reuseIngredients`, men dagens utvelgelse håndhever ikke et ukentlig barnevennlig mål og har ingen synlig poengregel for ingrediensgjenbruk. Innstillingene bør kobles til testbare regler eller justeres slik at de ikke lover mer enn motoren leverer.

Et senere forbedringspunkt er å huske forslag brukeren nettopp har forkastet i den aktuelle økten, slik at refresh gir bedre variasjon. Dette bør ikke kreve endring av familiens faktiske middaghistorikk.

## 8. PWA, oppdatering og brukergrensesnitt

Service workeren forhåndscacher lokale appfiler og bruker network-first for hovedfiler og JavaScript-modulene. Den håndterer bare HTTP(S) GET fra samme origin. Ved aktivering fjernes cacher med andre navn, og ny worker tar over klientene.

«Oppdater app» forsøker oppdatering av service worker, avregistrerer registreringer, sletter Cache Storage-cacher og laster `index.html` med en tidsstemplet query. Den sletter ikke `localStorage`. Full sletting av nettleserens site data er en annen handling og kan fjerne usynkede brukerdata.

Versjon styres manuelt gjennom `APP_VERSION`, query-parametere i `index.html` og `CACHE_NAME`. Kode/CSS/cache er v90; manifest-lenken i `index.html` har fortsatt query `v=87`. Det er en versjonsinkonsistens som bør ryddes i ved neste release. Ingen versjoner er endret som del av denne dokumentasjonen.

Network-first per fil gjør at en klient kan laste filer fra forskjellige publiseringstidspunkter. Det bør vurderes en sammenhengende release-/assetmodell og en oppdateringsflyt som også fungerer ved nettverksfeil.

Viktige UI-erfaringer fra prosjektet er kompakte oversikter, få knapper, tekst som kan brytes over flere linjer og egne detaljpaneler. Scroll i modaler, mobilens tastatur og PWA-oppdatering har tidligere gitt problemer og bør inngå i regresjonstesting.

## 9. Sikkerhet og driftsforhold som må avklares

Det finnes ingen Firestore-regelfil, familie-/medlemskapsadministrasjon eller egen backend i den gjennomgåtte prosjektkopien. Det betyr at tilgangssikkerheten i produksjon ikke kan vurderes ferdig fra disse filene alene.

Anonym innlogging identifiserer en Firebase-klient, men etablerer ikke i seg selv at klienten har tilgang til riktig familie. Den hardkodede familie-ID-en er heller ikke tilgangskontroll. Arkitekten bør undersøke de faktiske Firestore-reglene og foreslå en modell for autentisering, familiemedlemskap og eventuelle invitasjoner før appen gjøres tilgjengelig for flere familier.

Firebase-konfigurasjon ligger i klientkoden. Sikkerheten må bygge på autorisasjon og regler, ikke på at klientkonfigurasjonen er skjult. Eventuelle fremtidige AI-tjenestenøkler skal ligge på en server, ikke i PWA-koden.

Avklar også backup og gjenoppretting, hvem som eier Firebase-prosjektet, logging av synkfeil, lagringskostnader og hvilke data som skal beholdes over tid. Oppskrifter, familienavn, handlelister og fritekstnotater bør tas med i vurderingen av personvern og tilgang.

## 10. Anbefalt forbedringsrekkefølge

### Prioritet 1: trygg deling av data og gjenoppretting

Avtal forventet konfliktatferd før ny synkmodell implementeres. Skill mellom endringer på forskjellige dager, samme dag, samme handlelistevare og samme oppskrift. Definer hva som kan slås sammen automatisk, og når brukeren må velge.

Anbefalt retning er en varig kø av eksplisitte operasjoner, med operasjons-ID, entitets-ID, baserevisjon og kvittering. En klient som har gammel cache skal ikke kunne skrive hele cacheinnholdet som om alt var nylig endret. Atomisk revisjonskontroll må kombineres med en merge-/konfliktstrategi; en transaksjon alene løser ikke dette.

Lag først en enkel sikkerhetskopi-/eksport- og gjenopprettingsflyt. Verifiser autorisasjon og test synk mot et isolert Firebase-testmiljø eller emulator før eventuell datamigrering.

### Prioritet 2: tydelig datamodell og kontrakter

Definer skjema, validering, stabile ID-er, referanser, `schemaVersion`, migreringer og slettesemantikk. Vurder om uken skal lagres samlet eller per dag, og om handlelistevarer skal være egne dokumenter. Velg granularitet ut fra konfliktbehov, lese-/skrivekostnad og forventet bruk.

Et fremtidig ingrediensregister med stabile ID-er og strukturerte enheter kan forbedre vareforslag og sammenslåing. Bevar også original tekstmengde, slik at «etter smak» og andre naturlige oppskriftsangivelser fortsatt kan brukes. Ikke krev et fullstendig ingrediensregister før appens viktigste synkbehov er løst.

### Prioritet 3: videre modularisering og målrettede tester

Flytt state/persistens, synkorkestrering og event-binding gradvis ut av `app.js`. Innfør tydelige operasjoner, for eksempel «sett middag for dag» og «endre handlelistevare», som kan testes uten DOM eller Firebase. Skill UI-state fra domenedata og synkkø.

Bygg videre på de eksisterende modulene. En total omskriving eller overgang til React er ikke et nødvendig første steg. Et lite byggsystem eller TypeScript kan vurderes senere hvis det gir konkrete fordeler for skjema, imports, release og vedlikehold.

### Prioritet 4: stabil release og frontendkvalitet

Automatiser versjonskontroll, samlet testkjøring og validering av service worker-assets. Etabler mobil-/PC-tester for de viktigste brukerflytene. Samle typografi, ikonbruk og komponentstiler slik at UI ikke gradvis får nye lokale varianter.

### Prioritet 5: nye funksjoner og AI

Etter at data og synk er stabile, forbedres forslagvariasjon og sammenhengen mellom familieinnstillinger og forslagregler. For AI/nettimport bør arkitekten foreslå en serverbasert tjeneste med kildeinformasjon, validering, brukerbekreftelse og kontrollert lagring. Importerte forslag bør ikke overskrive eksisterende oppskrifter automatisk.

## 11. Tester og verifikasjon

På dokumentdatoen bestod `node --check app.js`, `node --check service-worker.js` og alle 13 testskriptene under `tests/domain`, `tests/render` og `tests/sync`.

Testene dekker rene hjelpefunksjoner, HTML-generering og deler av synkbeslutningene med simulerte API-er. De dokumenterer ikke full korrekthet ved samtidige Firestore-writes, gjenoppstart med offline-endringer, faktisk tilgangskontroll eller rendering i mobilnettlesere. Ingen produksjonssynk eller nettlesertest ble kjørt i denne gjennomgangen.

Anbefalte nye akseptansetester:

1. Enhet A endrer ukeplanen; enhet B åpner med flere dager gammel cache. Endringene fra A beholdes.
2. A og B endrer forskjellige dager i samme uke. Begge endringene beholdes.
3. A og B endrer samme dag fra samme baserevisjon. Konflikten håndteres slik det er avtalt.
4. En offline-endring overlever omlasting og synkes én gang når forbindelsen kommer tilbake.
5. En slettet oppskrift gjenopprettes ikke av en gammel klient. Referanser fra ukeplaner håndteres eksplisitt.
6. En avvist write vises som konflikt eller feil, ikke som vellykket synk.
7. En lagring feiler midt i flere operasjoner; bekreftede og ubekreftede operasjoner håndteres hver for seg.
8. To familiers data er isolert av autorisasjon, ikke bare av klientens valgte ID.
9. Appoppdatering, tastatur og scrolling fungerer i de sentrale flytene på telefon og PC.

## 12. Forslag til mandat for arkitekten

Be om følgende konkrete leveranser før en større refaktor:

- En vurdering av dagens datamodell og synk med prioriterte risikoer.
- Et forslag til entiteter, ID-er, relasjoner og dokumentgrenser i Firestore.
- En beslutning om revisjoner, varig kø, konflikter og sletting, med eksempler fra familiebruk.
- Et forslag til innlogging, familiemedlemskap og sikkerhetsregler.
- En migreringsplan med backup, testmiljø, rollback og kriterier for godkjenning.
- En etappevis implementeringsplan som Codex kan utføre, med akseptansetester per etappe.
- Korte beslutningsnotater under `docs/`, slik at begrunnelse og alternativer bevares.

Spørsmål som eieren og arkitekten bør avklare sammen:

- Skal dette fortsatt være én familieapp, eller etter hvert en tjeneste for flere familier?
- Skal brukerne kunne endre alt offline, eller skal bestemte endringer vente til nett er tilgjengelig?
- Skal en konflikt gi et eksplisitt valg, eller finnes det en akseptabel automatisk regel?
- Skal historiske ukeplaner vise dagens oppskrift eller oppskriften slik den var da middagen ble planlagt?
- Skal handlelisten være én løpende liste eller separate lister per uke/handletur?
- Hvilke behov er viktigst først: datatrygghet, flere brukere/familier, raskere planlegging eller AI-import?

## 13. Praktisk samarbeid og dokumentasjon

Eieren prioriterer brukerbehov. Arkitekten konkretiserer datamodell og beslutninger. Codex implementerer avtalte etapper, tester dem og oppsummerer nøyaktig hvilke filer som skal lastes opp.

Arbeid i denne prosjektkopien følger `AGENTS.md`: ingen Git-kommandoer, arbeid innenfor prosjektmappen, relevante lokale tester og dokumenterte konsekvenser av endringer i dataformat, Firebase-struktur eller service worker. Appkode som publiseres krever samordnet versjonsbump; rene dokumentendringer gjør ikke det.

Supplerende dokumenter i prosjektet:

- `README.md`: formål, kjøring og publisering.
- `AGENTS.md`: arbeidsregler for utvikling med Codex.
- `docs/ARCHITECTURE.md`: eksisterende arkitekturbeskrivelse.
- `docs/STATE_MODEL.md`: state og Firestore-felter.
- `docs/RELEASE.md`: kontroller og publiseringsrutiner.

Eldre dokumentasjon kan være mindre presis enn dagens kode. Eksempelvis ligger Firebase SDK-lastingen nå i `src/sync/firebase.js`, og service workerens network-first-liste inkluderer også modulene under `src/`. Bruk kildekoden som fasit når detaljer avviker, og oppdater dokumentene etter avtalte arkitekturendringer.

**Anbefalt første etappe:** avklar og test en modell for trygg synk, backup og tilgang. Videre produktutvikling kan deretter skje på et mer forutsigbart fundament.
