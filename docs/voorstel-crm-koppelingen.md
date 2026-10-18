# Stuurhut — Voorstel: CRM met mail- en agendakoppeling

Status: fase 1 (klanten en contacten) is gebouwd; de rest is voorstel. Zie §8 voor de
keuzes die inmiddels gemaakt zijn.
Uitgangspunt: zo min mogelijk handwerk. Wat je al doet (mailen vanuit
info@bataviadigital.nl, afspraken in Apple Agenda) komt vanzelf in Stuurhut terecht,
in plaats van dat je het daar nog een keer intypt.

---

## 1. Waar het CRM nu staat

Wat er al is en goed werkt:

- **Klantdossier** (`/trajecten/[id]`): route van haltes, takenbord, logboek, één
  contactpersoon (naam, telefoon, e-mail, voorkeur), bedragen afgesproken/gefactureerd.
- **"Aan zet"**: `status = 'wachtend'` + `wachtOp` bepaalt of een traject bij jou of
  bij de klant ligt.
- **Afspraken** (`afspraken`-tabel, `/agenda`): handmatig ingevoerd, gekoppeld aan een
  traject, verschijnen in het logboek.
- **Logboek**: afgeleid uit journal, afgeronde taken, bereikte haltes en afspraken.
- **Snelle invoer**: ⌘K, Telegram, "traject uit één zin".

Wat ontbreekt, en waarom dat nu handwerk kost:

| Gat | Gevolg vandaag |
|-----|----------------|
| Geen koppeling met mail | Elke klantmail moet je zelf als notitie overtypen, anders zie je hem niet in het logboek. "Aan zet" klopt alleen als je hem zelf bijwerkt. |
| Geen koppeling met Apple Agenda | Afspraken staan dubbel (of alleen in Apple), en de AI-weekplanning weet niet wanneer je al bezet bent. |
| Eén contactpersoon per traject, geen klant/organisatie | Mail van een collega van je contactpersoon herkent niets. Een terugkerende klant met een tweede traject begint opnieuw. |
| Geen "volgend contactmoment" | Niemand houdt bij dat je een klant al twee weken niets hebt laten horen, of dat een offerte onbeantwoord blijft. |
| Geen leads vóór een traject | Een nieuwe aanvraag in je mailbox bestaat pas in Stuurhut als je zelf een traject aanmaakt. |

---

## 2. Agendakoppeling (Apple Agenda / iCloud)

Apple heeft geen "echte" API voor de agenda, maar iCloud spreekt **CalDAV** — een open
standaard. Daarmee kan Stuurhut je agenda lezen én er afspraken in zetten. Inloggen gaat
met je Apple ID plus een **app-specifiek wachtwoord** (aanmaken op
account.apple.com → Inloggen en beveiliging), nooit je echte wachtwoord.

### Stap A1 — Stuurhut-agenda abonneren in Apple Agenda (klein, snel resultaat)

Stuurhut publiceert een `.ics`-feed (`/api/agenda/feed.ics?token=…`, een lange geheime
token in de URL omdat Apple Agenda geen login meestuurt). Daarin: je geplande taken uit
de weekplanning, streefdatums van haltes en (optioneel) de afspraken die alleen in
Stuurhut staan. In Apple Agenda: *Archief → Nieuw agenda-abonnement*. Werkt meteen op
Mac, iPhone en Watch.

- Alleen-lezen vanuit Apple gezien; Apple ververst hem zelf (instelbaar, bijv. elke 15 min).
- Geen wachtwoorden nodig, dus het veiligste begin.

### Stap A2 — iCloud-afspraken in Stuurhut (lezen via CalDAV)

Een sync-route haalt periodiek de afspraken uit de iCloud-agenda's die je kiest
(bijv. "Werk" en "Privé") en zet ze in de bestaande `afspraken`-tabel:

- Nieuwe kolommen op `afspraken`: `bron` (`stuurhut` | `icloud`), `extern_id` (de
  iCal-UID), `extern_etag` (om wijzigingen te herkennen), `locatie`, `deelnemers text[]`.
- **Automatisch koppelen aan een traject**: staat het e-mailadres van een deelnemer bij
  een contact (zie §4), of de klantnaam in de titel, dan krijgt de afspraak dat
  `traject_id`. Lukt dat niet, dan kun je hem met één klik koppelen.
- Agenda-categorie (`klantwerk`/`eigen_werk`/`prive`) volgt uit welke iCloud-agenda het
  is, instelbaar.
- **AI-weekplanning** leest deze afspraken mee als bezette tijd, zodat er geen taken
  meer over een klantafspraak heen gepland worden.

### Stap A3 — Twee kanten op (schrijven via CalDAV)

Een afspraak die je in Stuurhut maakt (of via ⌘K "afspraak met Piet do 14:00")
wordt ook in je iCloud-agenda gezet, en wijzigen/verwijderen gaat beide kanten op.
De `extern_etag` voorkomt dat de ene kant de andere stilletjes overschrijft; bij een
conflict wint de laatste wijziging en zie je dat in het logboek.

### Voor en na een afspraak

Als de agenda binnenkomt, wordt het CRM daar slimmer van:

- **Voorbereiding**: op `/vandaag` staat bij een klantafspraak een korte briefing — huidige
  halte, open taken, laatste twee mails, wat er "wacht op".
- **Nazorg**: na afloop vraagt Stuurhut één regel "Hoe ging het?" → wordt een
  journal-notitie bij het traject; de AI haalt er actiepunten uit als voorgestelde taken
  (nooit automatisch aangemaakt — "AI stelt voor, jij beslist").

---

## 3. Mailkoppeling (info@bataviadigital.nl)

### Eerst uitzoeken: waar draait de mailbox?

De beste techniek hangt af van de provider achter bataviadigital.nl:

| Provider | Aanpak | Inloggen |
|----------|--------|----------|
| Google Workspace | Gmail API (push via Pub/Sub, labels, threads) | OAuth, eenmalig toestemming geven |
| Microsoft 365 / Outlook | Microsoft Graph (webhooks, conversaties) | OAuth, eenmalig toestemming geven |
| Hoster (TransIP, Hostnet, Strato, …) of iCloud Mail | IMAP lezen + SMTP versturen | Mailwachtwoord of app-wachtwoord |

IMAP werkt bij alle drie, dus het voorstel hieronder gaat uit van IMAP/SMTP (bibliotheek
`imapflow` voor lezen, `nodemailer` voor versturen). Zit je op Google of Microsoft, dan
is hun eigen API netter (direct pushbericht in plaats van periodiek ophalen, en geen
wachtwoord in de app), maar het ontwerp verder is hetzelfde.

### Stap M1 — Mail in het klantdossier (lezen)

Een sync-route draait elke paar minuten (Vercel Cron of Supabase `pg_cron`), haalt nieuwe
berichten uit *Inbox* en *Verzonden* en bewaart per bericht alleen wat nodig is:

- Nieuwe tabel `mails`: `message_id` (uniek, voorkomt dubbelen), `thread_id`, `richting`
  (`in` | `uit`), `van`, `aan text[]`, `onderwerp`, `fragment` (eerste ±300 tekens),
  `verzonden_op`, `traject_id` (nullable), `contact_id` (nullable). Geen volledige
  mails of bijlagen — die blijven in je mailbox; Stuurhut linkt erheen.
- **Koppelen aan een traject**: op e-mailadres van een contact, anders op domein
  (`@klant.nl` → die klant). Mail die nergens bij past komt niet in Stuurhut, behalve als
  het een mogelijke nieuwe aanvraag is (zie M3).
- **Logboek**: nieuw soort item `mail` (inkomend/uitgaand icoon), net als nu bij
  afspraken afgeleid uit de tabel.
- **Mail uit Stuurhut houden**: een lijstje uitgesloten adressen/domeinen (nieuwsbrieven,
  leveranciers, je eigen adressen).

### Stap M2 — "Aan zet" en opvolging automatisch

Dit is waar het meeste handwerk verdwijnt:

- **Laatste mail van de klant, nog niet beantwoord** → traject staat bij "Jij bent aan
  zet", met "Mail van Piet, 2 dagen geleden: …".
- **Laatste mail van jou** → "Wacht op klant" sinds die datum, zonder dat je `wachtOp`
  hoeft in te vullen.
- **Opvolgherinnering**: wacht je langer dan X dagen (per traject instelbaar, standaard 5
  werkdagen) op antwoord, dan verschijnt "Piet opvolgen?" in *Niet vergeten* op `/vandaag`.
- Handmatig `wachtOp` blijft werken en gaat altijd voor; de mail vult het alleen aan.

### Stap M3 — AI over je mail (voorstellen, niet beslissen)

Met de Gemini-koppeling die er al is (`server/utils/ai.ts`), per nieuwe klantmail:

- **Actiepunten** ("kun je vóór vrijdag de logo-varianten sturen?") → voorgestelde taak
  op het takenbord, met één klik bevestigen.
- **Afspraakverzoek** ("schikt dinsdag 10:00?") → voorgestelde afspraak, die via A3
  in je iCloud-agenda komt.
- **Nieuwe aanvraag** van een onbekend adres naar info@ → voorstel "Nieuw traject?",
  ingevuld via de bestaande `leesTrajectUitZin()`-logica.
- Uitvoer wordt per veld gevalideerd, net als bij Telegram en "traject uit één zin".

### Stap M4 — Mailen vanuit Stuurhut (versturen)

- Vanuit het dossier mailen naar de contactpersoon, via SMTP vanaf info@ (komt dus
  gewoon in je *Verzonden* en in het logboek).
- **Sjablonen per halte**: offerte sturen, kick-off bevestigen, feedback vragen,
  oplevering, nazorg. Met invulvelden (`{voornaam}`, `{traject}`, `{halte}`) en
  optioneel een AI-concept dat je altijd eerst ziet voordat het verstuurd wordt.
- Bij versturen kun je meteen een opvolgdatum zetten ("herinner me als er na 3 dagen
  niets is").

---

## 4. Wat het CRM zelf nog nodig heeft

Mail en agenda koppelen alleen goed als Stuurhut weet *wie* bij welke klant hoort.

1. **Klanten en contacten als eigen tabellen**
   - `klanten` (naam, domein(en), adres, KvK/btw, notities) — één klant kan meerdere
     trajecten hebben.
   - `contacten` (naam, e-mail, telefoon, rol, voorkeur, `klant_id`) — meerdere per klant.
   - `trajecten.klant_id` + `traject_contacten` (wie is bij dit traject betrokken).
   - Migratie: de huidige `contactpersoon`/`contact_email`/… velden worden per traject
     omgezet naar één klant + één contact; de oude kolommen kunnen daarna weg.
2. **Volgend contactmoment** per traject (`volgend_contact_op`): handmatig of
   automatisch uit M2. Trajecten zonder contact in X weken komen bovenaan
   (een eerste stap richting de "traject-hartslag" uit het Life OS-concept).
3. **Lead-fase** vóór de route: de eerste halte(s) "Aanvraag → Kennismaking → Offerte"
   bestaan al grotendeels als `verkennen`-fase; een traject met status `lead` maakt
   het onderscheid tussen "misschien" en "getekend" zichtbaar in de pijplijn.
4. **Klantpagina** (`/klanten/[id]`): alle trajecten, contacten, mails en afspraken van
   één klant, plus omzet over alle trajecten heen.
5. **Later — financiën**: offertes en facturen koppelen aan je boekhoudpakket
   (bijv. Moneybird of e-Boekhouden via hun API), zodat `bedrag_gefactureerd` vanzelf
   klopt en "factuur openstaand" een halte-signaal wordt. Financiën heeft nu nog geen
   datamodel; dit is een apart voorstel waard.

---

## 5. Techniek en veiligheid

- **Wachtwoorden** (iCloud app-wachtwoord, mailwachtwoord) staan als omgevingsvariabelen
  (`NUXT_ICLOUD_*`, `NUXT_MAIL_*`), niet in de database — het is een single-user app, dus
  dat is het eenvoudigst en veiligst. Bij OAuth (Google/Microsoft) gaat het refresh-token
  versleuteld in een `koppelingen`-tabel met alleen service-role toegang.
- **Sync-routes** (`server/api/sync/agenda.post.ts`, `server/api/sync/mail.post.ts`)
  gebruiken de service-role client, beschermd met een geheim zoals de Telegram-webhook
  (fail-closed), en worden door een cron aangeroepen. Elke run onthoudt waar hij was
  (IMAP `UIDVALIDITY`/laatste UID, CalDAV `sync-token`) in een `sync_status`-tabel.
- **Minimale opslag**: van mails alleen kopregels + fragment; van agenda alleen wat
  `afspraken` nodig heeft. Alles kan opnieuw opgehaald worden.
- **Nieuwe tabellen** krijgen RLS én de `GRANT`s aan `authenticated` (zie CLAUDE.md),
  en `database.types.ts` wordt na elke migratie opnieuw gegenereerd.
- **Instellingenpagina** `/instellingen/koppelingen`: status per koppeling (laatste sync,
  fouten), welke iCloud-agenda's mee doen, uitgesloten mailadressen, opvolgtermijn.

---

## 6. Voorgestelde volgorde

| Fase | Inhoud | Waarom in deze volgorde |
|------|--------|-------------------------|
| **1** | Klanten + contacten (§4.1), migratie van de huidige contactvelden | Fundament: zonder dit kan mail en agenda niets herkennen. |
| **2** | Agenda A1 (ICS-feed) + A2 (iCloud lezen) + weekplanning houdt rekening met afspraken | Snelste zichtbare winst, geen risico voor je mailbox. |
| **3** | Mail M1 (lezen + logboek) + M2 (aan zet, opvolgen) | Het grootste handwerk verdwijnt hier. |
| **4** | Agenda A3 (schrijven) + voorbereiding/nazorg bij afspraken | Bouwt voort op 2 en 3. |
| **5** | Mail M3 (AI-voorstellen) + M4 (versturen, sjablonen) | Pas zinvol als lezen betrouwbaar loopt. |
| **6** | Klantpagina, lead-fase, later financiën | Afronding van het CRM. |

---

## 7. Open vragen voor jou

1. **Bij welke provider draait info@bataviadigital.nl?** (Google Workspace, Microsoft 365,
   je hoster, iCloud Mail?) Dit bepaalt IMAP of een API met OAuth.
2. **Welke iCloud-agenda's** moeten mee, en welke zijn privé (alleen als "bezet"
   meetellen, zonder titel in Stuurhut)?
3. **Twee kanten op** voor de agenda (A3), of is lezen + de ICS-feed genoeg?
4. **Mail versturen vanuit Stuurhut**, of alleen lezen en blijven mailen vanuit Apple Mail?
5. **Opvolgtermijn**: na hoeveel werkdagen zonder antwoord wil je een herinnering?
6. Gebruik je een **boekhoudpakket** (Moneybird, e-Boekhouden, …) dat later mee kan?

---

## 8. Besluiten (17 okt 2026)

- **Fase 1 gebouwd**, iets eenvoudiger dan §4.1: in plaats van een tabel
  `traject_contacten` heeft een traject één klant (`klant_id`) en één hoofdcontact
  (`contact_id`, de "reisgenoot"). Alle contacten van de klant staan op de klantpagina.
  Een koppeltabel kan later nog als één traject echt meerdere vaste contacten nodig heeft.
- **Agenda**: in Apple Agenda staan iCloud-agenda's (Agenda, Privé, Werk, RISE) én
  Google-agenda's (gmail, autoatlas.nl). Stuurhut leest daarom per bron: iCloud via
  CalDAV, Google via de Google Calendar API. Schrijven (A3) is niet nodig; Stuurhut stelt
  hooguit een afspraak voor, die je zelf in Apple Agenda zet of via de ICS-feed (A1) ziet.
- **Mail**: niet versturen vanuit Stuurhut; wel een *conceptmail* voorstellen
  (kopiëren of openen in je mailprogramma via een `mailto:`-link met onderwerp en tekst).
- **Herinneringen**: geen vaste termijn; Stuurhut bepaalt zelf wanneer opvolgen
  relevant is (bijv. offerte verstuurd en geen antwoord, belofte in een mail met een
  datum, lang geen contact tijdens een lopende halte).
- **Boekhouding**: e-Boekhouden (heeft een API). Bedoeld om `bedrag_gefactureerd` en
  "factuur openstaand/betaald" automatisch bij te houden in plaats van met de hand.
