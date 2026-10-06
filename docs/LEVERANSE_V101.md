# Leveranse v101 – ukeplan synkes per dag og felt

Dato: 2026-10-06. v100 er publisert og i bruk. v101 er ferdig lokalt; eier håndterer commit og apppublisering i GitHub Desktop.

## Resultat

- Ny src/sync/weeks.js med diffWeeks, weeksFromDocs og createWeeksSync. Differ sammenligner de seks standardutfylte kartene per uke/dag og gir bare endrede verdier i dokumentfeltene plan, lockedPlan, dayTypes, servings, dayModes og dayNotes.
- Én setDoc per berørt uke skriver bare endrede felt/dager og updatedAt med merge:true. Ingen getDoc, batch eller transaksjon. Manglende dokument opprettes. Tøm uke skriver bare endrede standardverdier og sletter ikke dokumentet. Dager med uendrede verdier sendes ikke.
- Første endring starter et fast vindu på 500 ms per uke. Flere endringer samles innen vinduet uten å skyve fristen; siste verdi per felt/dag gjelder. Køen venter på start, og utløpte vinduer sendes ved start. Timere og usendte operasjoner forkastes ved stopp.
- Lytteren bruker includeMetadataChanges og ignorerer cache før første serverbilde. weeksFromDocs fyller standardverdier for dager som mangler og ignorerer clientUpdatedAt/updatedAt. Uker uten serverdokument eller ventende lokal endring vises med standardverdier, uten opplasting av lokal cache.
- Lokale celleoperasjoner legges over hvert bilde per uke/felt/dag. De fjernes ved SDK-kvittering og et nyere serverbilde uten ventende skrivinger, ut fra løpenummer ved kølegging, uten innholdssammenligning. Kontrollen kjøres i begge hendelser og publiserer også ved kvittering etter bilde. Bare nyeste operasjon per celle gjelder. Ventende tirsdag og fjern fredag bevares samtidig; annen enhets nyere verdi for samme celle vises etter bekreftelse.
- setState køer alle ukeendringer ved ready/online-tilgang. Rene ukeendringer endrer ikke clientUpdatedAt/pendingLocalSync og utløser ingen profile/preferences/metadata-writes. onWeeks erstatter bare de seks domenekartene når resultatet endres; editorutkast, valgt uke, UI og ventende importvalg bevares.
- weeksSync starter sammen med shoppingSync/mealsSync etter tilgangsvern og stoppes i stopAllSync. Status inngår i dagens samlede visning: feil først, deretter Synker. SDK-venting, lokale operasjoner og manglende første serverbilde viser Synker. Feil gir Synk feilet og beholder lokale operasjoner. Generasjonsvern gjør gamle timere, lyttercallbacks og kvitteringer ugyldige etter stopp/kontobytte.
- Gammel weeks-scope, pendingWeekKeys, changedWeekKeys, weekPayload, whole-week-lytter og buildWeeksRemotePatch er fjernet. Hele src/sync/reads.js ble ubrukt og er slettet; testdekningen er flyttet til weeks-testene. Profil, preferanser og metadata beholder getDoc/skrivevern som før.
- APP_VERSION/HTML/cache er v101, numerisk versjon er 101 og REQUIRED_MIN_APP_VERSION er 101. Administratorheving og gjenoppretting bruker samme konstant. v100 må oppdateres. weeks.js er lagt i begge service worker-listene, reads.js er fjernet; strategien er uendret.
- Backup/restore beholder eksportformat 1, de seks ukekartene, unionen av ukenøkler, Firestore-stier og dokumentform. Restore bygger fulle ukedokumenter som før og skriver meta sist med minimum 101. Eldre clientUpdatedAt i ukedokumenter ignoreres og kan bli liggende etter merge-writes. Ingen migrering.

## Mutasjons- og oppstartskartlegging

Én direkte brukerendring ble funnet: replaceOpenWeek tilordnet state.plansByWeek før setCurrentPlan og under byggingen av forslag. Det ville gjort differansen tom eller ufullstendig. De to direkte tilordningene er fjernet. Planen bygges lokalt og sendes én gang gjennom setCurrentPlan/setState. pickSuggestion mottar fortsatt samme plan under bygging; historikkscorene leser tidligere uker, så denne rettelsen endrer ikke forslagreglene. Test bekrefter at nye åpne dager skrives og låst dag bevares.

Alle øvrige brukerendringer går gjennom setState: setCurrentPlan/Locks/DayTypes/Servings/DayModes/DayNotes, updatePlanDay/refreshPlanDay, togglePlanLock, updateDayType/Mode/Note/Servings, fillWeek, middagsvelger og hurtigmiddag, addMealToNextFreeDay, Tøm uke, deleteCurrentMeal (alle berørte uker) og removePlanMode (dagsmodusopprydding sammen med uttrykkelig metadataendring). Blandet metadata-/ukepatch skriver fortsatt metadata som bestilt; ukeendringen alene gjør det ikke.

Direkte tilordning av ukedata finnes fortsatt ved loadState/normalizeState (lokal innlasting og standardutfylling, inkludert historiske plan/lockedPlan-felter), applyRemoteStatePatch (øvrige sky-scopes normaliserer beholdte kart), den nye onWeeks (mottak av skydata) og restoreDatabase (lokal state etter eksplisitt dokumentinnlesing). emptySetupBackup lager tomme kart for eksplisitt oppsett. Disse veiene er innlasting/sky/oppsett og skal ikke sende nye ukeoperasjoner. Det ble ikke funnet andre direkte brukerendringer av ukekartene.

Gammel oppstart var avhengig av weeks-lytteren i startSplitSyncListeners, maxClientUpdatedAtFromDocs, global pendingLocalSync/pendingRemoteScopes, pendingWeekKeys og automatisk opplasting ved tom samling. Disse ukeavhengighetene er fjernet. Oppstart har fortsatt sju lyttere: meta, shoppingItems, meals, weeks og tre scopes (profil/preferanser/metadata). refs.weeks og medlems-/oppsettsvern beholdes. Lokal normalisering kan lage standarduke i cache uten at den sendes til skyen.

## Filer per mappe – tas med i GitHub Desktop

- Rot, endret: AGENTS.md, app.js, index.html, service-worker.js.
- src/sync, endret: state.js, writes.js, version.js. Ny: weeks.js. Slettet: reads.js.
- tests/app, endret: access-startup.test.mjs, meals-sync.test.mjs, workflows.test.mjs. Ny: weeks-sync.test.mjs.
- tests/sync, endret: access.test.mjs, restore.test.mjs, state.test.mjs, writes.test.mjs. Ny: weeks.test.mjs. Slettet: reads.test.mjs.
- docs, endret: ARCHITECTURE.md, STATE_MODEL.md, RELEASE.md. Ny: LEVERANSE_V101.md.

17 eksisterende filer endret, fire nye og to slettet: 23 berørte filstier. Ingen endring i CSS, domenemoduler, innlogging, functions, firestore.rules eller Firebase-konfigurasjon. Ingen nye avhengigheter.

## Kontroller

Alle 39 lokale testskript under tests/ og functions/tests/ bestod, med DOM-/SDK-stubber og syntetiske data uten nettverk. Antallet er 38 fra v100 minus den slettede reads-testen pluss to nye weeks-testskript. node --check av alle 35 kildefiler bestod; oppstartstesten kontrollerer også innebygd HTML-skript. Ingen kildefiler under functions er endret.

- diffWeeks: én dag/ett felt, flere felt, flere uker, alle seks felter ved Tøm uke, standardverdier og ingen endring. Lesing fyller alle dagsnøkler og ignorerer tidsmarkører.
- Faktisk middagsvalg: én setDoc med merge og bare den aktuelle dagen, ingen getDoc. Lås, type, porsjoner, modus og notat har egne dag/felt-kontroller. To endringer innen 500 ms gir én skriveoperasjon med siste verdier; fristen flyttes ikke.
- Fyll uke gir én skriveoperasjon. Bytt uke inkluderer alle endrede åpne dager og bevarer låst dag. Sletting av oppskrift brukt i tre uker gir tre plan-writes pluss én oppskriftssletting. Hurtigmiddag gir én oppskrift-write og én uke-write.
- Lokal tirsdag/fjern fredag finnes under venting og etterpå. Samme dag/felt overskrevet av annen enhet vises med Synket i begge kvitterings-/bilderekkefølger. Gammelt serverbilde, cache og hasPendingWrites fjerner ikke operasjonen. Nyere operasjon erstatter gammel celle; andre felt bekreftes uavhengig.
- Åpent editorutkast, gruppeoverskrift, valgt uke og ventende importvalg bevares gjennom faktisk render ved ukesynk. Ukeendring og tomt serverbilde bevarer global tidsmarkør/pending-flagget og sender ingen øvrige scopes. Manglende dokument gir standardverdier og ingen opplasting.
- Feil beholder lokal verdi med Synk feilet. Kø før start, stopp/ny start, gammelt timerkall/lytter/kvittering og offline-oppstart testes. Ingen gamle usendte operasjoner sendes etter kontobytte.
- Administrator hever til 101, eksisterende minimum 101 skrives ikke på nytt, medlem skriver ikke meta, v100 blokkeres, v101 slipper inn og minimum 102 stopper lyttere/app. Restore skriver 101 sist. Backup og gjenoppretting kontrollerer alle seks ukefeltene og flere uker. Alle øvrige scope-, handleliste-, oppskrifts-, import- og servertester består.

## Begrensninger og utrulling

Ingen funksjonelle avvik fra utviklerbeskjeden. Fast 500 ms vindu fra første endring er brukt for å overholde maks forsinkelse ved flere klikk. Samtidig endring i samme uke/felt/dag bruker siste sky-skriving; ulike celler flettes. Ingen varig kø eller automatisk retry. Offline-oppstart starter ingen lyttere/skriving og køer ikke endringer; første serverbilde etter ny oppstart kan erstatte usynkede lokale uker. Allerede sendte SDK-operasjoner kan ikke trekkes tilbake ved stopp.

Eier publiserer appfilene samlet. La alle enheter vise Synket og ta fersk PC-backup, lukk gamle klienter, publiser og åpne administratorens v101 på nett først. Kontroller minimum 101 før øvrige enheter brukes. Minimumsheving er best effort; stille feil prøves igjen ved neste administratoroppstart. PC-/iPhone- og to-enhetsakseptanse gjenstår etter publisering; se RELEASE.md.

Ingen nettverk, publisering eller Git-kommandoer. Functions og firestore.rules er urørt, og ingen hemmelighetsoperasjoner er utført.
