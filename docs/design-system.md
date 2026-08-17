# Stuurhut — Design System

Status: levend document, companion bij `concept-life-os.md` §3 ("Ontwerptaal"). Dat
document beschrijft de richting in woorden; dit document legt vast hoe die richting
concreet in tokens en componenten landt, zodat toekomstige schermen consistent blijven.

Sinds de restyle naar het Figma-concept (`Stuurhut`, frame `Web 1920 – 1`) is dit
document bijgewerkt: het concept is leidend voor de dashboardopbouw, de typografische
schaal en de folder-tab-vorm. Kleuren zijn **op het oog** uit het concept overgenomen
(Figma dev-mode was niet beschikbaar zonder login) — zie §1.

---

## 1. Tokens

Alle kleuren en fonts staan in `app/assets/css/main.css` (`@theme`-blok):

| Token | Waarde | Gebruik |
|---|---|---|
| `--font-display` | "komu-new-d" | Koppen, labels, cijfers, kaarttitels — grof/condensed |
| `--font-sans` | "helvetica-neue-lt-pro" | Body-tekst |
| `--font-condensed` | "helvetica-neue-lt-pro-cond" | Smalle/condensed varianten |
| `--color-stuurhut-mist` | `#e9e9e9` | Standaard paginakleur (op `body`) — de lichte secties van het concept |
| `--color-stuurhut-ink` | `#1c1c1c` | Donkere secties (Trajecten-band) |
| `--color-stuurhut-cream` | `#f5f0e6` | Ongebruikt sinds de restyle; bewaard als alternatief warm licht |
| `--color-stuurhut-muted` | `#8b8b8b` | Secundaire tekst op licht |
| `--color-traject-*` | 8 vaste kleuren | Eén kleur per traject, overal hergebruikt (zie §6) |
| `--color-stuurhut-voortgang-van/-tot` | `#e2d75f` → `#7d6b21` | Gradient van de voortgangsbalk op de doelkaarten |

De trajectkleuren zijn bij de restyle **feller** gezet dan de oorspronkelijke gedempte
palette, om het concept te volgen. Ze staan dubbel: als `@theme`-token én als hex in
`app/utils/kleuren.ts` (`trajectKleurHex`, gelezen door componenten die de kleur als
inline `style` zetten). Wijzig ze altijd op beide plekken.

`app/utils/kleuren.ts` exporteert daarnaast `trajectTekstKleur(kleur)`: geel is te licht
voor witte tekst en krijgt inkt-tekst. Elk component dat een trajectkleur als achtergrond
gebruikt (folder-tab, traject-pill op een taakkaart, sectie-tabs) hoort die helper te
gebruiken in plaats van hardcoded wit.

Bewust **geen** spacing/radius/shadow-tokens — Tailwind's eigen schaal volstaat; alleen
waar een vorm echt afwijkt (het folder-tab-component, §4) staat een eigen maatvoering,
lokaal in dat component.

## 2. Layout: de contentkolom

`.stuurhut-kolom` (in `main.css`) is de enige layoutregel die overal terugkomt:

```css
width: 100%;
max-width: 140rem;
margin-inline: auto;
padding-inline: clamp(1.25rem, 8.34vw, 10rem);
```

8.34vw komt neer op 160px marge op een 1920-frame — precies de marge uit het concept.
Secties zijn zelf **full-bleed** (achtergrondkleur over de volle breedte) en leggen er
zelf een `.stuurhut-kolom` in. Er is dus geen `max-w-3xl`-kolom meer om de hele pagina
heen zoals vóór de restyle.

Twee bewuste uitzonderingen op "alles binnen de kolom":
- De **hero** is full-bleed en vierkant (geen `rounded`), met de kolom alleen om zijn
  tekst heen.
- Het **Vandaag-bord** gebruikt de kolommarge als `padding-inline` op een horizontaal
  scrollende flexrij, zodat de laatste kolom bewust over de rechterrand doorloopt — de
  "er is meer dan past"-affordance uit het concept.

## 3. Typografische schaal

Alles in display-font, uppercase, `line-height` rond 0.9–1.0, en `clamp()` zodat de
verhouding uit het concept (gemeten op 1920) ook op kleinere schermen klopt:

| Rol | Grootte | Waar |
|---|---|---|
| Sectietitel (`.stuurhut-titel`) | `clamp(2.75rem, 7vw, 5.375rem)` | VANDAAG, TRAJECTEN, en de restsectie |
| Hero-titel | `clamp(2.75rem, 7.5vw, 5.75rem)` | Groet in `AppHeaderFoto` |
| Kolomkop / kaarttitel groot | `clamp(1.75rem, 2.4vw, 2.75rem)` | Doelkaart-titel, bordkolomkop |
| Kaarttitel klein | `clamp(1.35rem, 1.9vw, 2.15rem)` | Taakkaart op het Vandaag-bord |
| Pil-label | `clamp(0.875rem, 1vw, 1.125rem)` | "DOEL", traject-pill, nav-pillen |

Body-tekst (Helvetica) wordt alleen gebruikt voor lopende tekst: de quote in de hero,
"Voortgang", de meta-regel onder de voortgangsbalk, en detailtekst in een uitgeklapte
folder-rij.

## 4. Header-foto patroon

`AppHeaderFoto.vue` — full-bleed foto-hero met een `STUURHUT`-woordmerk linksboven en
`AppNav.vue` (witte pil-knoppen) rechtsboven, en onderin datum / groet / quote-balk.
Kiest zelf een van vier dagdeel-foto's in `public/images/` als er geen `afbeelding`-prop
is. Twee maten via de `compact`-prop:

- **Dashboard** (default): `min-height: clamp(30rem, 48vw, 60rem)` → 920px op 1920, met
  ruime `padding-bottom` zodat de doelkaarten eroverheen kunnen schuiven.
- **Subpagina's** (`compact`, traject-detail en ideeën): `clamp(20rem, 26vw, 32rem)`.

De scrim is bewust licht (donker boven en onder, bijna niets in het midden): de foto moet
leidend blijven, tekst krijgt daarnaast `text-shadow` voor leesbaarheid.

## 5. Folder-tab component

`app/components/FolderTab.vue` — het centrale visuele motief: een verticale stapel
kleurrijke, map-tab-vormige balken.

**Vormspec** (waarden in het component):
- De balk (`.folder-tab`) is een gewoon blok in de flow, `min-height: 5.5rem`, volle
  kolombreedte, vierkante hoeken.
- De tab (`.folder-tab__tab`) staat `position: absolute; bottom: 100%` — hij steekt dus
  bóven zijn eigen balk uit en overlapt de balk van de vorige rij. Breedte
  `min(26rem, 52%)`, `left: 2.5rem`, hoogte gelijk aan de balk, bovenhoeken `1.5rem` rond.
- De **holle schouders** links en rechts van de tab zijn twee pseudo-elementen met een
  `radial-gradient`-mask (`transparent` binnen de straal, dekkend erbuiten). De linker
  schouder is precies zo breed als de tab-inspringing, zodat de curve exact op de
  linkerrand van de balk uitkomt.
- Stapelvolgorde via `z-index: index + 1`: latere rijen liggen bovenop. **Niet** de
  actieve rij naar voren halen — dan verdwijnt de tab van de volgende rij.
- `.folder-tab__detail-inner` heeft `padding-bottom: 5.5rem`: die strook wordt bij een
  uitgeklapte rij bedekt door de tab van de volgende rij, dus daar mag geen inhoud staan.
- `.folder-tab__strip` (de zichtbare balk zelf) houdt zijn inhoud rechts uitgelijnd, om
  dezelfde reden: links ligt de volgende tab eroverheen.

**Slots**: `#tab` (naam, gecentreerd), `#strip` (acties rechts op de balk — in
`TrajectenLijst.vue` pas zichtbaar bij hover, zodat de balk net zo leeg is als in het
concept) en `#detail` (hoogte-geanimeerd uitklappaneel).

**Mobile fallback**: onder `640px` verdwijnt de tab en wordt elke rij een platte afgeronde
balk met de naam in de strip (`TrajectenLijst.vue` rendert de naam daarom twee keer, de
tweede met `sm:hidden`).

**Sectie-navigatie is een ander component.** `SectieTabs.vue` (traject-detailpagina) is
een horizontale rij tabs in dezelfde taal maar zonder balk eronder — FolderTab is
uitsluitend voor de verticale stapel.

## 6. Motion

**Integratiepatroon**: plain `import { gsap } from 'gsap'`, alleen gebruikt binnen
`onMounted()`/`watch()` in `FolderTab.vue` — geen Nuxt-plugin/module. De staat vóór
animatie staat altijd al in de gewone CSS (`.folder-tab { opacity: 0; transform:
translateY(28px); }`), niet alleen via GSAP's `.from()` — zo matcht server-rendered
markup de client-markup vóór hydratie.

**Constanten** — `app/utils/motion.ts`:

| Constante | Waarde | Gebruikt voor |
|---|---|---|
| `MOTION.duration.enter` | 0.5s | Entrance-animatie per rij |
| `MOTION.duration.stagger` | 0.07s | Vertraging tussen opeenvolgende rijen |
| `MOTION.duration.expand` | 0.35s | Uit-/inklappen van een detailpaneel |
| `MOTION.duration.hover` | 0.15s | (CSS, niet GSAP — zie hieronder) |
| `MOTION.ease.enter` | `power3.out` | Entrance |
| `MOTION.ease.expand` | `power2.inOut` | Expand/collapse |

**Waar wel/niet GSAP**: entrance-stagger en expand/collapse van de folder-tab-stapel zijn
GSAP. Hover-elevate, het opduiken van acties, de paneel-fade bij het wisselen van sectie
en de pagina-overgang zijn bewust **plain CSS transitions** — stateloze
micro-interacties hebben geen sequenced timeline nodig.

**Spanning met "rustig, niet druk"**: expressieve motion staat op gespannen voet met het
principe uit `concept-life-os.md` §1. Bewuste keuze: de GSAP-choreografie blijft beperkt
tot precies de twee plekken hierboven.

## 7. Kleurcodering trajecten

Elk traject heeft één vaste kleur (`TRAJECT_KLEUREN` / `trajectKleurHex`), gebruikt in:
de folder-tab-balk op het dashboard, de traject-pill op elke taakkaart van het
Vandaag-bord, de sectie-tabs en de kleurbalk op de traject-detailpagina, en de
kleur-swatch-picker in `TrajectForm.vue`. Dit is de belangrijkste visuele "glue" tussen
modules — met de pill op het Vandaag-bord is die koppeling sinds de restyle ook op het
dashboard direct zichtbaar.

## 8. Kaartpatroon

Twee soorten kaarten, allebei handgeschreven CSS (geen `UCard`):

- **Doelkaart** (`DoelenOverzicht.vue`): wit, `border-radius: 1.25rem`, ruime padding,
  zachte slagschaduw. Opbouw: grijze "DOEL"-pil → display-titel → `mt-auto` →
  Voortgang-regel met percentage → gradientbalk → meta-regel → "Zie meer".
- **Taakkaart** (`VandaagBord.vue`, `TakenBord.vue`): zelfde witte kaart, compacter, met
  een gekleurde traject-pill en een display-titel.

Acties (bewerken/verwijderen/focus) staan in beide gevallen `opacity: 0` tot hover of
focus-within: het concept toont schone kaarten, de functionaliteit mag daar niet in de
weg zitten.

Formulieren en de secties buiten het concept (Weekplanning, Vandaag-3-prioriteiten,
Inbox) gebruiken nog de Nuxt UI `UCard`/`UInput`-conventie. Let op: Nuxt UI's eigen
tekstkleuren zijn onleesbaar op een gekleurde folder-balk — `TrajectenLijst.vue` zet
daarom `color: inherit` op labels en op de ghost-knoppen in dat gebied.

## 9. Dashboardopbouw

`app/pages/index.vue` volgt het concept van boven naar beneden:

1. `AppHeaderFoto` — full-bleed hero.
2. `DoelenOverzicht` — drie doelkaarten die met een negatieve marge over de onderkant van
   de hero heen schuiven (`margin-top: calc(-1 * clamp(3rem, 11vw, 13rem))`).
3. `VandaagBord` — vierkoloms takenbord over **alle** trajecten
   (To-do / In progress / Review / Ready), gevoed door dezelfde `subtaken`-tabel als het
   bord op de traject-detailpagina.
4. `TrajectenLijst` — donkere band met de folder-tab-stapel.
5. "Plannen & vastleggen" — Weekplanning, Vandaag-3-prioriteiten en Inbox. Deze staan
   **niet** in het concept maar zijn wel in gebruik; ze zijn bewust onderaan geplaatst in
   plaats van verwijderd.
