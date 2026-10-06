# Firebase-oppsett fra v95

Appen bruker det egne prosjektet `middagsplanlegger-6db4e`, med familie-ID `familien`. Konfigurasjonen i app.js er offentlig Firebase-klientkonfigurasjon. Tilgang beskyttes av Authentication og `firestore.rules`. Det gamle prosjektet er arkiv; v95 kontakter det ikke, og ingen data overføres automatisk derfra.

## Prosjekt og innlogging

1. Åpne prosjektet `middagsplanlegger-6db4e` i Firebase-konsollen og opprett Cloud Firestore om den ikke finnes. Velg region før data legges inn.
2. Aktiver Google under Authentication → Sign-in method, med korrekt support-e-post.
3. Legg det faktiske domenet til den publiserte appen under Authentication → Settings → Authorized domains. For GitHub Pages er dette vertsnavnet, ikke prosjektets URL-sti. Kontroller også autorisert localhost hvis innlogging skal testes på lokal webserver.
4. Appen åpner Google-popup fra brukerens knappetrykk, med `prompt: select_account`, og bruker Firebase standard innloggingspersistens. Test dette på ekte PC og iPhone-hjemskjermapp før utrullingen regnes som godkjent.

## Publiser regler

`firestore.rules` i repoet er fasit. Åpne Firestore → Rules, erstatt innholdet med hele filen og publiser reglene i det nye prosjektet. `firebase.json` peker bare på denne regelfilen og `.firebaserc` velger riktig prosjekt for eventuell senere bruk av Firebase-verktøy. Ingen slike verktøy eller publisering er kjørt av agenten. GitHub Pages publiserer appfiler, ikke Firestore-regler.

Reglene krever verifisert e-post og medlemsdokument. Alle medlemmer kan lese og skrive domenedata. Bare administratorer kan skrive app/meta og legge til, endre eller fjerne andre medlemmer; egen medlemsrad kan ikke oppdateres eller fjernes fra appen. Den første administratoren opprettes derfor manuelt. Medlemsreglene bruker dokumentoppslag; appen bruker enkeltstående writes, og ingen batch/transaksjon med mange dokumenter. Historisk handlelistemigrering kjøres ikke i v95.

## Første administrator

Opprett manuelt dokumentet:

```text
families/familien/members/din-google-epost@example.com
```

Dokument-ID må være hele Google-kontoens e-postadresse i små bokstaver. Legg til feltet `role` som string med verdien `admin`. Første dokument trenger ikke addedAt/addedBy. Konsollen brukes av prosjektets eier og trenger ikke appens medlemsrettigheter for å opprette dette.

Ikke opprett app/meta ennå. Åpne v95 på PC, logg inn med den samme Google-kontoen og bruk oppsettflyten. Uten medlemskap får kontoen «Du har ikke tilgang ennå» og ser ikke appinnhold. Et vanlig medlem kan bare vente til administrator har satt opp databasen.

## Sett opp databasen

Før overgangen må alle v94-enheter vise «Synket», og en ny JSON-sikkerhetskopi må lastes ned på PC. I v95 velges «Les inn sikkerhetskopi», oppsummeringen kontrolleres og innlesingen bekreftes. Alternativet «Start med tom database» krever egen bekreftelse og tomme meals, weeks og shoppingItems.

Appen kontrollerer format og alle eksisterende dokument-ID-er før den skriver. Fremmede ID-er avbryter forsøket uten writes og ber om manuell tømming i konsollen. ID-er som finnes i filen overskrives, slik at en delvis innlesing av samme fil kan kjøres på nytt. Medlemslisten beholdes alltid. Dokumentene skrives enkeltvis; `app/shopping.migratedToItemsAt` settes, og `app/meta` kommer helt til slutt med:

```text
schemaVersion: 1
initializedAt: serverTimestamp
initializedBy: administratorens e-post
minAppVersion: 95
```

Bare initializedAt gjør databasen klar for vanlig synk. Oppsett gjennomføres fra én administratorenhet om gangen. Etterpå kan den andre voksne legges til som administrator under Konto og medlemmer. Nye medlemmer trenger ikke logge inn før de legges til.

## Gjenoppretting på nytt

Lukk andre appøkter. Slett `families/familien/app/meta` og tøm de tre samlingene meals, weeks og shoppingItems manuelt i konsollen. Behold members. Åpne administratorens app på nytt og les inn sikkerhetskopien. Profile, preferences og metadata overskrives av oppsettet; ingen automatisk sletting utføres av appen.

Sletting av bare meta åpner oppsettflyten, men fremmede dokument-ID-er vil fortsatt blokkere innlesing. Ved retry av en avbrutt innlesing med samme fil trenger de delvis innleste dokumentene ikke fjernes.

## Versjon og offline

Meta kan bare endres av administratorer. minAppVersion over 95 blokkerer v95 og stopper lyttere, timere og usendte operasjoner. Knappen «Oppdater app» bruker eksisterende oppdateringsflyt. V95-oppsett skriver aldri et minimum høyere enn 95.

Offline-medlemsflagget gjelder riktig prosjekt, familie og bruker, etter tidligere godkjent oppsett. Det gir lokal tilgang uten nett, med «Lokal lagring». Utlogging eller avvist medlemskap fjerner flagget og skjuler appinnhold, men sletter ikke lokal state. Last appen inn igjen når nettet er tilbake for ny tilgangskontroll og synk. Det er fortsatt ingen varig handlelistekø; offline-endringer kan erstattes av skylisten.

Se «Utrulling av v95» i RELEASE.md for enhetsrekkefølge og kontrollpunkter.
