# Stuurhut — ontwerpkeuzes

## Richting (versie 2)
Na de eerste versie: minder "AI", meer gereedschap. Gebaseerd op de nieuwe referenties (agenda-kaarten, inbox-app, Wstack-dashboard) en Dribbble-zoekwerk naar CRM-, agenda- en takenapps (Pinterest zit achter een inlog).

1. **Letter:** Cal Sans overal, zelf gehost via `@fontsource/cal-sans`, dus geen Google-aanroep. Cal Sans heeft één gewicht. Hiërarchie komt uit grootte en kleur, met `font-synthesis: none` zodat er geen nep-vet ontstaat. Tabulaire cijfers staan uit, omdat die in Cal Sans te ver uiteenlopen.
2. **Achtergrond:** vlak (`#F1F1EE`, donker `#0F1012`). Verlopen staan alleen op kaarten: `card-warm` (Vandaag telt), `card-mint` (Financiën, Check-in) en `card-sea`. Tekst blijft ≥ 4,5:1 op het lichtste én donkerste punt.
3. **Panelen:** witte kaarten met een hairline, radius 22 px, binnenblokken 14 px en een bijna onzichtbare schaduw.
4. **Navigatie:** zijbalk met labels, groepen (Overzicht, Werk, Jij) en tellers, plus de donkere knop "Iets kwijt" (zoals Compose). Op iPad een iconenrail, op iPhone een tabbalk.
5. **Acties:** de primaire knop is inkt (zwart, in donker licht). Koper is alleen nog voor wat aandacht vraagt (te late factuur, verschuiving).
6. **Stuurman:** geen serif, geen gloed, geen koperen avatar. Een voorstel is een gewone kaart met een klein label, een info-regel met het waarom en "Doe maar / Nu niet". Het paneel is op ≥ 1440 px een kolom aan de rechterkant, als een inbox.
7. **Data:** tijden als `09:30 → 10:15`, statuspills in zachte tinten en staven op een grijs spoor met een groene verloopvulling (de streep is uit).

## Tokens
Alle tokens staan in `app/assets/css/tokens.css` (licht en donker). Tailwind leest ze via `@theme` in `main.css`.

| Token | Licht | Donker | Gebruik |
|---|---|---|---|
| `--bg` | `#F1F1EE` | `#0F1012` | vlakke achtergrond |
| `--surface` | `#FFFFFF` | `#16181B` | kaarten |
| `--ink` / `--primary` | `#18191B` | `#ECECE8` | tekst, hoofdknop |
| `--muted` | `#62666C` | `#9DA2A8` | labels (≥ 4,5:1) |
| `--copper` | `#AD4E1A` | `#F09A62` | aandacht nu |
| `--sea` | `#2A5A77` | `#8FC0D8` | afspraken, structuur |
| `--green` | `#25694A` | `#86CFA6` | positief |
| `--grad-warm/mint/sea` | | | alleen op kaarten |

## Architectuur
- `app/data/` bevat de testdata (datums relatief aan vandaag) en `app/types/` de types.
- `app/composables/useStore.ts` is de enige bron van state (localStorage) en kan resetten.
- De domein-composables (`useTasks`, `useCalendar`, `useInbox`, `useClients`, `useOpportunities`, `useFinance`, `useRhythm`) zijn de enige toegang tot data. Hier sluit je later de echte bronnen aan.
- `app/utils/stuurman.mock.ts` en `app/composables/useStuurman.ts` zijn de plek waar later de echte AI komt.

## Soorten in de agenda (versie 3)
Kleur betekent hier iets. Elk blok in Week, Mijn dag en Hoofd leeg heeft een pastel vlak met donkere tekst (≥ 12:1), in licht en donker thema gelijk. Definitie in `app/utils/category.ts`, kleuren als `--cat-*` in `tokens.css`.

| Soort | Kleur | Icoon |
|---|---|---|
| Meeting | blauw `#CFE2F7` | users |
| Taak | geel `#F7E2A0` | checkbox |
| Uitwerken | groen `#C5EAD1` | bulb |
| Administratie | lila `#DDD4F6` | receipt |
| Privé | roze `#F6CDE2` | heart |

**Scanbaar:** lange uitleg staat op één tot twee regels (de volledige tekst zit in de tooltip). Op de iPhone staan de intro's onder paginatitels uit. In Hoofd leeg is het voorstel zelf de knop.

## Thuisbasis, routines en Stuurman (versie 4)
- **Thuisbasis** opent met een warme welkomstkaart met vier kerncijfers: afspraken, taken, omzet deze maand en ritmescore. Daaronder staan, in deze volgorde: Vandaag (tijdlijn met afvinken plus belangrijk zonder tijd), Vraagt aandacht (korte rijen met één actie), één voorstel van Stuurman, Doelen (voortgangsbalken, `app/composables/useGoals.ts`), Routines vandaag en Komende dagen (mini-agenda in de soortkleuren).
- **Routines** hebben een moment ("Na de lunch"), een waarom en een logboek per dag met een reden als het niet lukt (`geen tijd`, `te moe`, `vergeten`, `omstandigheden`, `geen zin`). Per routine zie je de week als zeven bolletjes, of je op koers ligt, zeven weken historie en "Wat er misgaat": een vergelijking (wanneer het wel en niet lukt), de verdeling van de redenen en één oplossing die je planning echt aanpast. Voorbeelden: een wandelblok in Week, een herinnering, een vrijdagblok. Zie `useRoutines.ts` en `routineInsights()` in `stuurman.mock.ts`.
- **Ritmescore**: hoeveel van wat tot nu toe kon je ook deed. Daarmee voelt woensdag niet als falen. Er staat altijd een concrete motivatieregel bij ("Nog 1× … dan haal je je week").
- **Stuurman**: elk voorstel heeft een korte titel, een icoon en een kenmerk (`vr 12:45`, `12 dagen te laat`). In het paneel staan ze als rijen die je uitklapt. Wat de pagina zelf al toont, staat niet nog eens in het paneel.

## Stuurman in kleur en chat (versie 5)
- Elk voorstel heeft een thema met een eigen kleur (`app/utils/tone.ts`): planning geel, geld groen, kans lila, ritme roze, klant blauw. Dezelfde pastels als de agenda, met donkere tekst.
- Het paneel heeft een zacht verloop in de kop (`--grad-stuurman`) en twee tabs: **Voorstellen** en **Chat**.
- In de chat staan bubbels, eventueel met een voorstel dat je met één tik uitvoert. Daaronder vervolgvragen en een invoerveld. Het gesprek blijft bewaard tot je het wist. De chatknop op de Stuurman-kaart van Thuisbasis opent direct de chat.

## Aanmaken en bewerken (versie 6)
Eén formulierpaneel (`EditorSheet.vue` + `useEditor()`): op de iPhone een bottom sheet, op iPad en Mac een venster in het midden. Er zijn vier formulieren: `FormClient`, `FormRoutine`, `FormTask` en `FormEvent`.

**Waar je het opent:**
- de knop **Nieuw** in de zijbalk, met Iets kwijt, Taak, Afspraak, Klant en Routine;
- op de iPhone onder **Meer**;
- de knoppen op de pagina's zelf: Nieuwe klant, Nieuwe routine, Taak en Afspraak in Week;
- het potlood op een klant, een routinekaart of een blok in Week.

**Door het te zeggen:** in de chat of in Hoofd leeg herkent Stuurman zinnen als "Nieuwe klant: …", "Nieuwe routine: hardlopen 3x per week na het werk", "Nieuwe afspraak: lunch met Joris vrijdag 12:30" en "Nieuwe taak: …". Het formulier opent dan al ingevuld (`parseCreate()` in `stuurman.mock.ts`).

**Regels:**
- korte formulieren, alleen de naam is verplicht;
- verwijderen kun je altijd herstellen;
- een routine kun je ook pauzeren: die telt dan niet mee en de geschiedenis blijft bewaard;
- Stuurman stelt een realistisch begin voor bij routines van 5× of meer;
- bij een afspraak of taak die overlapt met iets anders krijg je een waarschuwing.

## Privé en zakelijk (versie 7)
- Taken, afspraken, routines, doelen en items in Hoofd leeg zijn **zakelijk** (zeeblauw) of **privé** (roze). Ontbreekt het label, dan leidt `utils/domain.ts` het af: met een klant of als `persoonlijk` gemarkeerd, of op trefwoord in Hoofd leeg. Elk formulier heeft de keuze, en in Hoofd leeg wissel je met één tik op de chip.
- **Filter Alles · Zakelijk · Privé** in de zijbalk, onder Meer op de iPhone, en op Week en Hoofd leeg. Thuisbasis, Week, Hoofd leeg en Stuurman volgen de keuze. Klanten, Kansen en Financiën zijn altijd zakelijk.
- **Werktijden** (standaard ma–vr 08:30–17:30) zijn een harde grens. Stuurman plant zakelijk alleen daarbinnen en privé erna. In Week is de tijd buiten werktijd gearceerd, werk dat erbuiten valt krijgt een koperen rand, en Stuurman stelt voor het terug te schuiven. De agenda loopt tot 21:00 en de dagbelasting telt alleen werk.
- **Avondmodus:** buiten je werktijden toont Thuisbasis privé eerst, met de melding "Je werkdag zit erop" en wat zakelijk wacht tot morgen. Stuurman zwijgt dan over werk. "Toch alles tonen" kan altijd. Bij Werktijden kun je de avondmodus nu al proberen.
- Doelen zijn gesplitst in zakelijk en privé. "Avonden zonder werk" rekent Stuurhut zelf uit.

## Dagstart, Dag afsluiten en Weekreview (versie 8)
Drie vaste momenten, elk een rustige stap-voor-stap-flow met één vraag per scherm (`RitualShell.vue`, `useRituals()`). Thuisbasis toont ze als rij "Momenten" en markeert het moment dat nu past: 's ochtends Dagstart, na werktijd Afsluiten, op vrijdagmiddag de Weekreview. Je start ze ook in de chat ("Begin mijn dag", "Weekreview").

- **Dagstart** (`/dagstart`, 2 min): slaap en energie, de dag in één oogopslag, hooguit drie dingen kiezen die tellen (wat nog geen tijd heeft, zet Stuurman vandaag binnen je werktijd), en Stuurman stemt de dag af op je energie. Bij weinig energie schuift hij het denkwerk naar een betere ochtend.
- **Dag afsluiten** (`/afsluiten`, 2 min): afvinken wat klaar is, per open taak kiezen tussen morgen, later of loslaten, je routines (met reden als het niet lukte), één ding dat goed ging plus je energie, en een blik op morgen.
- **Weekreview** (`/weekreview`, 5 min): je week in cijfers (taken, afspraken, binnengekomen geld, ritmescore, werkuren, avonden zonder werk), wat goed ging (uit je dagafsluitingen en afgeronde dingen), wat bleef liggen (inplannen, laten staan of loslaten) en drie focuspunten voor volgende week, die meteen een plek krijgen. Op vrijdag vinkt de weekreview je routine "Week afsluiten" af.

## Tijd en geld, belasting, levensadmin (versie 9)
- **Tijd en geld per klant** (`useWork()`, `ProjectCard`, `QuotesCard`). Elk project heeft een uurtarief, begrote uren (budget ÷ tarief) en gelogde uren. De balk wordt groen, dan geel vanaf 85% en koper boven budget. Je logt uren met één tik (½, 1, 2 of 4 uur). Factureren gebeurt voor de uren binnen budget. Boven budget stelt Stuurman eerst een gesprek over meerwerk voor.
  - Offertes lopen van concept naar verstuurd en dan naar akkoord (wordt een project, klant wordt lopend) of afgewezen. Na vijf dagen zonder reactie verschijnt een signaal met de vraag of Stuurman een belmoment moet plannen.
  - Financiën laat zien wat je per klant echt per uur verdient (omzet zonder btw gedeeld door gewerkte uren), tegenover je tarief.
- **Apart zetten** (`useTax()`, `TaxCard`). Elke betaling wordt gesplitst in btw, inkomstenbelasting (standaard 30% van de omzet zonder btw, zelf aan te passen) en wat echt van jou is. Je ziet de btw te betalen na voorbelasting, de deadline van de btw-aangifte per kwartaal, wat je deze maand apart zet (met "Heb ik gedaan") en wat je jezelf kunt uitbetalen na vaste lasten. Dit is inzicht, geen advies.
- **Levensadmin** (`/admin`, `useLife()`, `FormLife`). Terugkerende zaken: auto, gezondheid, verzekeringen, abonnementen, documenten en huis, met een datum, hoe vaak het terugkomt en hoeveel dagen van tevoren je een melding wilt. "Geregeld" schuift terugkerende zaken door naar de volgende keer. "Plan een kwartier" zet privé-tijd in je week. Wat binnenkort moet, staat op Thuisbasis bij Vraagt aandacht en bij Stuurman, ook in de avondmodus.

## Versie 10: Opdrachten (kanban, met Notion als bron)

- **Notion is de bron, Stuurhut de plek waar je plant.** De pagina `/opdrachten` toont je opdrachten als bord. De kolommen komen uit de Status-opties van de Notion-database (`columnsFromDatabase`), niet uit de code. Hernoem of voeg je een status toe in Notion, dan past het bord mee. De betekenis van een kolom (te doen, bezig, wachten, review, klaar) koppel je één keer in `STATUS_KIND` in `utils/notion.ts`.
- **De vorm van Notion.** `data/notion-opdrachten.ts` is testdata in precies de vorm die de Notion-API teruggeeft (database met statusopties, pagina's met eigenschappen). `mapNotionPage` maakt er een kaart van, `toNotionPatch` maakt de body voor `pages.update`. Welke eigenschap welk veld is, staat in `NOTION_SCHEMA`.
- **Eén uitwisselbare bron.** `useAssignments()` praat met een `AssignmentSource` (pull, push, create, archive). Nu is dat testdata. Straks wordt het een klein server-endpoint, omdat de Notion-sleutel niet in de browser mag. Het scherm verandert dan niet.
- **Eerst het scherm, dan Notion.** Bij verslepen verandert het bord meteen. Mislukt het opslaan, dan zet Stuurhut het terug met een melding.
- **Wat in Stuurhut blijft.** Werkblokken in Week (`Task.assignmentId`), gelogde uren (`TimeEntry.assignmentId`) en sinds wanneer een kaart in een kolom staat. Dat hangt aan de opdracht via het Notion-id.
- **Slepen.** Op de Mac sleep je met de muis. Op de iPhone houd je een kaart even vast en sleep je dan, en zie je één kolom tegelijk (swipen of tabs). Een kaart openen kan altijd, en daar kies je ook de status. Zo werkt het ook met het toetsenbord en voorlezen.
- **Wat Stuurman toevoegt.**
  - Een grens van drie in Bezig. Daarboven stelt Stuurman voor de kaart met de minste haast terug te zetten.
  - Na vijf dagen wachten op een klant: een kwartier om na te vragen.
  - Bij een deadline binnen drie dagen zonder tijd in je agenda: een werkblok binnen je werktijd.
  - Bij Klaar: uren loggen, en laten zien of er iets te factureren valt.
- **Kleuren.** Kolommen krijgen de Notion-kleur, vertaald naar de pastels van Stuurhut. Het soort werk (Bouwen, Ontwerp, Content, Oplevering, Overleg) gebruikt dezelfde kleurtaal als Week.

## Versie 11: Slaapritme

- **Opstaantijd als anker.** `prefs.sleep` bevat het plan: begin, doel, stap per week, slaapbehoefte en hoe lang de laptop vóór bedtijd dichtgaat. Elke week een stap eerder (`utils/sleep.ts`). Bedtijd = opstaan − slaapbehoefte − een kwartier inslapen. Laptop dicht = bedtijd − afbouwtijd.
- **Dagstart.** Vraagt nu: naar bed, opgestaan (beide vooringevuld, ± een kwartier) en hoe je wakker werd (moe, gaat wel, uitgerust). Laat zien of je je doel haalde, en wanneer je laptop vanavond dichtgaat.
- **De avond.** Op Thuisbasis staat in de avond de kaart Vanavond met de drie tijden. Een uur voor laptoptijd komt er een seintje. Daarna wordt de app stil: geen voorstellen van Stuurman, in de zijbalk staat "Afbouwen". Je kiest tussen "Laptop is dicht" en "Ik werk nog even", en daarna vraagt Stuurman niets meer. Om dit overdag te bekijken: Ritme → Slaapritme → Aanpassen → "Bekijk hoe je avond eruitziet".
- **Ritme → Slaapritme.** Toont:
  - het plan in stappen;
  - deze week per dag (gelukt is binnen een kwartier, in het weekend binnen een uur);
  - de patronen in je eigen nachten: doorwerken tegenover bedtijd, korte nachten tegenover energie, uitgerust tegenover aantal uren, het weekend, en de voortgang sinds je begon;
  - twee weken nachten als balken van bed tot opstaan, met een tabelweergave.
- **Grens.** Slaap je twee weken genoeg en word je toch vaak moe wakker, dan stelt Stuurman rustig voor om het met je huisarts te bespreken. Er is geen diagnose en geen score.
- **Testdata.** Het plan begon twee weken geleden (09:30 naar 08:00, nu 08:45). Je bedtijd loopt achter, en op avonden dat je doorwerkt ga je ongeveer een uur later naar bed. `STATE_VERSION` is nu 11.

### 11.1 Een reden om op te staan, en het weekend

- **Vast eerste werkblok.** Je kunt dit aanzetten op Ritme → Slaapritme, of via het voorstel van Stuurman.
  - Het blok begint op werkdagen drie kwartier na je opstaantijd, afgerond op een kwartier. Het schuift mee als je opstaantijd een stap eerder gaat (`syncAnchors` in de layout).
  - Het duurt tot de volgende afspraak, hooguit anderhalf uur en minstens drie kwartier.
  - Begint er om die tijd al iets, dan is dat je start en zet Stuurhut er niets bij.
  - In de dagstart gaat het eerste denkwerk zonder tijd in dat blok.
- **Eerst naar buiten.** Met één tik maak je de routine "Naar buiten na het opstaan": tien minuten daglicht, vijf keer per week.
- **Het weekend.** Op Ritme staat hoe laat je zaterdag en zondag uiterlijk opstaat (een uur na je doordeweekse tijd), en hoe het vorige weekend ging.
  - De avondkaart zegt de avond ervoor dat uitslapen mag, tot uiterlijk die tijd.
  - Op vrijdag en zaterdag stelt Stuurman een klein ochtendmoment voor, zoals koffie halen een half uur na die tijd. Dat gebeurt alleen als die ochtend nog leeg is.
- `STATE_VERSION` is nu 12.

### 11.2 Gemotiveerd blijven

- **Een tempo dat zich aanpast.** Het plan houdt per week een besluit bij (`prefs.sleep.weeks`, sleutel: maandag).
  - Lukten vorige week minstens 3 doordeweekse ochtenden, dan gaat de stap door. Anders blijft de tijd staan.
  - Het besluit valt één keer per week (`ensureWeek` in de layout), ook voor weken die je oversloeg.
  - Op Ritme staat waarom deze week deze tijd heeft, en wat er nog nodig is voor de volgende stap. Bijvoorbeeld: "als nog 2 ochtenden deze week lukken", of "deze week haal je het niet meer, en dat is prima".
- **Nooit twee keer missen.** Na één gemiste ochtend zegt Stuurman niets.
  - Na twee achter elkaar komt één vraag: "Is de stap te groot? Dan houden we deze week 09:00 aan."
  - De vraag staat in de dagstart (direct na het invullen), op Ritme en als voorstel op Thuisbasis.
  - "Ja" zet deze week een stap terug. "Nee" of "Nu niet" laat de tijd staan. Daarna vraagt Stuurman het voor die ochtenden niet nog eens.
- **Wat het je oplevert.** Een kaart op Ritme zet doordeweeks "voor je begon" naast "sindsdien":
  - energie;
  - hoe vaak je uitgerust wakker wordt;
  - hoe laat je opstaat;
  - hoe vaak je eerste werkblok lukte, zodra daar gegevens voor zijn.

  Wat beter gaat, wordt groen. Wat gelijk blijft, staat er eerlijk bij.
- `STATE_VERSION` is nu 13. De testdata heeft twee gelukte weken, en een vast ritme geeft in de testdata iets meer energie.

## Versie 12: Gemotiveerd blijven, overal

- **Routines bijsturen.** Dit staat in `useRoutines` en op de RoutineCard.
  - **Tempo.** Drie weken op rij gehaald: voorstel om een keer per week meer te doen. Twee weken onder de helft: voorstel om het doel omlaag te doen, naar wat lukte plus één en minstens de helft van het oude doel. Weken zonder ingevulde dagen tellen niet mee. Na je antwoord vraagt Stuurman het die week niet nog eens (`tempoAck`).
  - **Nooit twee keer missen.** De laatste twee geplande keren niet gelukt: één vraag die past bij de reden die je opgaf. Bij "geen tijd" of "te moe" één keer minder per week. Bij "vergeten" een seintje, met de tijd uit het moment min een kwartier. Bij "geen zin" je eigen waarom, met de keuze om even te pauzeren. Bij "omstandigheden" alleen een bevestiging. De vraag staat op de kaart en als voorstel op Thuisbasis (`missAck`).
  - **Wat het je oplevert.** Je energie op dagen dat het lukte tegenover dagen dat het niet lukte. Dat verschijnt alleen bij genoeg dagen en een echt verschil.
- **Een eerste stap** (`utils/firststep.ts`). Werk dat blijft liggen krijgt één stap van een kwartier, op een ochtend.
  - Het gaat om opdrachten die minstens tien dagen in Te doen staan, of acht dagen in Bezig, zonder werkblok. En om taken die je minstens twee keer naar een latere dag schoof: `Task.moved` telt dat in `schedule`.
  - De stap komt uit de titel of de soort werk, en je kunt hem in het formulier van de opdracht herschrijven.
  - De kaart op het bord toont "ligt N dagen".
- **Zien wat je gedaan hebt** (`utils/progress.ts`).
  - De weekreview begint bij "Wat ging goed?" met wat er af is: opdrachten klaar, uren, gefactureerd, offertes, routines en ochtenden op tijd.
  - De nieuwe pagina Terugblik (onder Jij) zet de afgelopen vier weken naast de vier daarvoor. Bovenaan staat wat er af is, daaronder wat beter gaat. Wat minder ging staat er ook, zonder oordeel, en meer uren telt niet als beter. Daarnaast staan je dagafsluitingen. In de eerste week van de maand stelt Stuurman voor om terug te kijken.
- **Testdata.** Het ritme gaat nu acht weken terug, zodat de terugblik iets te vergelijken heeft. Ritme en de patronen kijken nog steeds naar zes weken. "Btw-aangifte voorbereiden" is drie keer doorgeschoven. `STATE_VERSION` is nu 14.
