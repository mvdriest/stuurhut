# Stuurhut — Concept: van dagoverzicht naar Life OS

Status: concept ter bespreking, niets hieruit is gebouwd.
Gebaseerd op: de bestaande Phase 1-app, je eigen mockups (homepage + weekagenda) en de
referentiebeelden die je aandroeg (Intelly, Clarity, een kanban-tool, een Notes-achtige
werkruimte, en de sfeerfoto van de gracht).

---

## 1. Visie

Stuurhut wordt een persoonlijke Life OS: één plek die 's ochtends laat zien waar je
voor staat, je overdag helpt om met focus te werken, en op de langere termijn in de
gaten houdt of je op koers blijft — zakelijk én mentaal. Niet nóg een taken-app, maar
een stuurhut in letterlijke zin: overzicht houden en bijsturen.

Drie principes die alle volgende keuzes toetsen:

1. **Rustig, niet druk.** "Rustig aan, één stap tegelijk" (je eigen tagline) staat
   haaks op een dashboard vol met widgets. Elke nieuwe module moet die rust behouden —
   niet meer schermruimte vullen, maar beter filteren wat je nú moet zien.
2. **Sfeer is functioneel, niet decoratief.** De foto-hero's, het zwart/crème-ritme en
   de typografie zijn er niet om mooi te zijn — ze zorgen dat het weer voelt als *jouw*
   plek in plaats van een generieke SaaS-tool, wat het makkelijker maakt om elke ochtend
   terug te komen.
3. **AI stuurt bij, jij blijft aan het roer.** De AI-planning en coaching-laag doen
   voorstellen en signaleren patronen; ze nemen nooit stilzwijgend beslissingen (geen
   auto-verplaatste afspraken, geen verborgen scoring).

---

## 2. De bouwstenen

| # | Module | Status | Korte omschrijving |
|---|--------|--------|---------------------|
| 1 | **Overzicht (dashboard)** | bestaat, wordt herontworpen | Ochtendgroet, sfeerfoto, doelen-cards, Vandaag, Trajecten — jouw mockup is hier al het uitgangspunt. |
| 2 | **Trajecten** | bestaat | Lopende zakelijke/persoonlijke trajecten met eerstvolgende actie. |
| 3 | **Vandaag (focus top-3)** | bestaat | Max. 3 prioriteiten per dag — bewust beperkt, blijft zo (zie §4). |
| 4 | **Inbox / quick capture** | bestaat | Snel opschrijven, later verplaatsen naar Vandaag of een traject. |
| 5 | **Takenbord per traject** | nieuw | Het volledige zakelijke overzicht: alle taken van een traject/klant in kolommen (to-do / bezig / review / klaar), zoals in je Clarity/kanban-referenties. Dit is *niet* hetzelfde als Vandaag — zie §4. |
| 6 | **Ideeën-werkruimte** | nieuw | Vrije, ruimtelijke plek om ideeën uit te werken — vergelijkbaar met de Notes-achtige referentie (losse kaarten, geen vaste structuur, later evt. koppelen aan een traject). |
| 7 | **Weekagenda** | nieuw | Kalenderweergave zoals je eigen mockup en de Intelly-referentie: afspraken + geplande taken naast elkaar, dag/week-toggle. |
| 8 | **AI-weekplanning** | Phase 2 (bestond al) | AI stelt een planning voor op basis van trajecten, taken en agenda; jij keurt goed of schuift. |
| 9 | **Focus-timer 50/10** | nieuw | Timer gekoppeld aan een taak/traject: 50 min werken / 10 min pauze. Sessies worden gelogd — belangrijke databron voor module 11. |
| 10 | **Doelen & beloningen** | Phase 3 (bestond al) | Kwartaaldoelen met voortgang en tussendoelen — al zichtbaar in je mockup ("3 nieuwe klanten dit kwartaal, 45%"). |
| 11 | **Coaching & evaluatie** | nieuw, herroept eerdere scope-keuze | Periodieke check-ins + patroonherkenning ("deze week veel verschoven taken", "weinig focus-sessies afgerond") om bij te sturen. Zie §5 — dit botst bewust met een eerdere afspraak in CLAUDE.md. |
| 12 | **Voortgang over tijd / stagnatie-detectie** | Phase 4 (bestond al) | Sluit aan op 11: signaleert trajecten die stilvallen. |

---

## 3. Ontwerptaal

Je eigen mockups geven al een duidelijke richting; dit legt vast wat die richting *is*,
zodat toekomstige schermen consistent blijven.

- **Typografie:** Komu New D (grof, condensed — headers, labels, cijfers) gecombineerd
  met Helvetica Neue (body-tekst), geladen via het Adobe Fonts-kit
  (`https://use.typekit.net/bwn5gwk.css`). Dit is een externe, maar goedkope en
  omkeerbare toevoeging aan `nuxt.config.ts` (`app.head.link`) — geen impact op data of
  architectuur.
- **Ritme:** afwisselend lichte (crème/wit) en donkere (zwart) secties per blok, zoals
  in je mockup — donker voor "zwaardere"/overzichts-content (Trajecten), licht voor
  actie-content (Doelen, Vandaag).
- **Sfeerfoto's:** een header-foto (zoals de grachtfoto) met donkere gradient-overlay
  bovenaan elke hoofdpagina, met daaronder datum + korte motiverende regel. Herbruikbaar
  patroon voor dashboard, weekagenda, en later takenbord/ideeën-werkruimte.
- **Kleurcodering trajecten:** elk traject krijgt een vaste kleur (groen/rood/oranje/
  blauw/paars/geel in je mockup) die overal terugkomt: Trajecten-lijst, takenbord-kaarten,
  agenda-blokken, focus-timer. Dit is de belangrijkste visuele "glue" tussen modules.
- **Kaarten:** consistente kaartstijl voor Doelen (label + titel + voortgangsbalk +
  "zie meer") en voor taken (label-badge + titel), zoals al in je mockup.

---

## 4. Spanningsveld: Vandaag (top-3) vs. het takenbord

Je referentiebeeld toont een Vandaag-sectie met kanban-kolommen (To-do 11, In progress 2,
Review 3, Ready 1) — dat is in de praktijk een volledig takenbord, niet de "max. 3
prioriteiten"-opzet die nu in Phase 1 zit.

**Voorstel:** dit zijn twee aparte dingen, geen vervanging van elkaar:

- **Vandaag (focus)** blijft strikt beperkt tot 3 items. Dit is de kern van de rust-eis
  uit §1 — een lijst van 11 "to-do" items is precies het soort overzicht dat overweldigt
  in plaats van focust.
- **Takenbord** (module 5) is de volledige, ongefilterde lijst per traject, in
  kanban-vorm. Dat is waar de 11/2/3/1 uit je mockup thuishoort. Vandaag's 3 items worden
  *gekozen uit* dit bord (handmatig, of straks door de AI-planning).

Dit voorkomt dat de twee bestaande designs (jouw mockup vs. de huidige Phase 1-regel)
elkaar tegenspreken, en behoudt het "rustig, niet druk"-principe waar Phase 1 al bewust
voor gekozen is.

---

## 5. Coaching & evaluatie — bewuste koerswijziging

CLAUDE.md legt nu vast: *"There is intentionally no energy-level tracking feature
(explicitly out of scope until the user asks for it)."* Met dit verzoek vraag je daar nu
wél om ("Stuurhut houdt mij in de gaten en zorgt dat we evalueren hoe het met mij gaat").
Ik neem dit dus op als nieuwe module, maar wil de vorm samen met jou scherp krijgen
voordat we bouwen — het bepaalt hoeveel data-invoer dit van je vraagt:

- **Optie A — puur output-gebaseerd (lichtst):** geen input van jou nodig. Stuurhut leidt
  alles af uit bestaand gedrag: voltooide taken, afgeronde focus-sessies, stilgevallen
  trajecten. Evaluatie = een periodiek overzicht ("deze week 6 van 10 focus-sessies
  afgerond, traject Anela ligt al 9 dagen stil").
- **Optie B — korte dagelijkse check-in:** één korte vraag per dag/avond (bv. "hoe ging
  het vandaag, 1-5"), die samen met output-data het beeld completeert.
- **Optie C — volledig energie/stemming-log:** zoals expliciet eerder uitgesloten —
  uitgebreider, maar ook meer invoer-moeite.

Mijn advies: start met **A**, met **B** als optionele toggle later. Dat past het best bij
"rustig, niet druk" en vraagt niets extra's van je in de dagelijkse flow — de focus-timer
en het takenbord leveren namelijk al genoeg signaal.

---

## 6. Architectuur-implicaties (nog niet bouwen, wel alvast in kaart)

Kort, zodat er geen verrassingen zijn als we een fase starten:

- **Takenbord (§5, module 5):** vraagt een generieke `taken`-tabel met status-kolom
  (to-do/bezig/review/klaar) en `trajectId`, los van de bestaande
  `vandaag_prioriteiten` (die blijft de losse, datum-gescopede tabel voor de focus-3).
- **Ideeën-werkruimte:** eigen tabel, vrije tekst/kaarten, optioneel `trajectId` voor
  koppeling — geen vaste structuur nodig, bewust losser dan de rest van het schema.
- **Weekagenda:** ofwel eigen `afspraken`-tabel, ofwel (later) een externe
  agenda-koppeling (Google Calendar) — apart te beslissen, geen blokkerende keuze nu.
- **Focus-timer:** `focus_sessies`-tabel (start, duur, gekoppelde taak/traject,
  voltooid/afgebroken) — klein, en de eerste concrete databron voor module 11.
- **Coaching-laag:** leest voorlopig alleen uit bestaande tabellen (§5 optie A) — geen
  eigen schema nodig totdat we voor optie B kiezen.

---

## 7. Voorgestelde fasering

De bestaande Phase 2–4 uit CLAUDE.md blijven grotendeels overeind, maar krijgen een
scherpere invulling en er komt een tussenfase bij voor de dingen die geen AI nodig
hebben:

- **Phase 1 — Fundament** *(klaar)*: Trajecten, Vandaag (top-3), Inbox.
- **Phase 1.5 — Sfeer, werk & focus** *(nieuw, geen AI nodig)*: restyle naar de nieuwe
  ontwerptaal (§3), Takenbord per traject, Ideeën-werkruimte, Focus-timer 50/10. Dit is
  de fase die je huidige mockups grotendeels realiseert.
- **Phase 2 — AI-planning & agenda** *(bestond al, nu geconcretiseerd)*: Weekagenda-view,
  AI-weekplanning die voorstellen doet voor Vandaag en de agenda, gevoed door het
  Takenbord uit 1.5.
- **Phase 3 — Doelen & beloningen** *(ongewijzigd)*: kwartaaldoelen, tussendoelen,
  beloningen — al zichtbaar in je mockup.
- **Phase 4 — Coaching & evaluatie + stagnatie-detectie** *(samengevoegd)*: periodieke
  evaluatie (§5, optie A eerst), stilgevallen trajecten signaleren, voortgang over tijd.

Volgorde-logica: 1.5 vóór 2, omdat AI-planning zonder een volledig takenbord weinig om
over te plannen heeft. 4 staat laatste omdat evaluatie pas zinvol is als er
focus-sessies, taken en doelen zijn om op te reflecteren.

---

## 8. Beslissingen (was: openstaande vragen)

1. **Vandaag vs. Takenbord:** knip uit §4 bevestigd. Vandaag blijft de focus-3 (klein en
   goedkoop, ook richting Phase 2 AI-planning); het volledige overzicht leeft in het
   Takenbord per traject.
2. **Coaching-laag:** start met optie A (puur uit gedrag afgeleid, geen dagelijkse
   invoer) — dit is pas relevant vanaf Phase 4, geen impact op Phase 1.5.
3. **Weekagenda:** eigen afspraken in Stuurhut voor nu; koppeling met een externe
   agenda (Google Calendar) is een bewuste latere stap, niet nu. Weekagenda zelf valt
   ook buiten Phase 1.5 (dat is Phase 2) — geen actie nu.
4. **Ideeën-werkruimte:** moet los kunnen bestaan zonder traject-koppeling; koppeling
   aan een traject is optioneel, niet verplicht.

Fase 1.5 is hiermee scherp genoeg om te bouwen: restyle, Takenbord per traject,
Ideeën-werkruimte (los of gekoppeld), Focus-timer 50/10.
