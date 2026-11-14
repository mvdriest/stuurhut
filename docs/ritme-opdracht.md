# iOS-opdracht: slaap en beweging naar Stuurhut

Elke ochtend stuurt een opdracht (Shortcut) op je iPhone je slaap van afgelopen nacht en je
stappen van gisteren naar `https://stuurhut.vercel.app/api/ritme`.

De sleutel staat in Vercel als `NUXT_RITME_TOKEN`. Nieuwe sleutel nodig? Zet een nieuwe waarde in
Vercel, rol opnieuw uit en pas de header in de opdracht aan.

## De opdracht maken (app Opdrachten)

1. **Zoek gezondheidswaarden** — Type *Slaap*, *Begindatum ligt in laatste 1 dag*, *Waarde is niet Wakker*,
   *Waarde is niet In bed*, sorteer op *Begindatum*, *Oudste eerst*
2. **Haal details op van gezondheidswaarde** → *Begindatum*; **Formatteer datum** → *ISO 8601*;
   **Combineer tekst** met *Komma* — dit is `starts`
3. **Haal details op van gezondheidswaarde** (invoer: de waarden uit stap 1) → *Einddatum*;
   **Formatteer datum** → *ISO 8601*; **Combineer tekst** met *Komma* — dit is `ends`
4. (De server rekent slaap, bedtijd en opstaan zelf uit; overlap tussen Watch en iPhone telt één keer.)
5. —
6. **Zoek gezondheidswaarden** → Type *Stappen*, *Startdatum ligt in de afgelopen 1 dagen*;
   **Haal details op van gezondheidswaarde** → *Waarde*; **Bereken statistieken** → *Som* — dit is `steps`
   (zonder Watch; ~100 stappen telt als 1 beweegminuut)
7. **Haal inhoud van URL op**
   - URL: `https://stuurhut.vercel.app/api/ritme`
   - Methode: *POST*
   - Headers: `Authorization` = `Bearer <sleutel>`
   - Verzoek: *JSON* met `starts`, `ends`, `steps` (tekst) (de variabelen uit de stappen hierboven)
8. Optioneel: **Toon melding** met *Inhoud van URL* → je ziet bijvoorbeeld "Slaap 7,2 uur (23:10–07:40) · 4281 stappen gisteren (≈ 43 min)".

## Automatisch elke ochtend

Opdrachten → *Automatisering* → **+** → *Tijdstip van de dag* → 09:00, dagelijks → *Voer direct uit*
→ kies de opdracht.

## Wat de server doet

- Slaap hoort bij de ochtend waarop je wakker werd; beweging bij de dag ervoor.
- Duur wordt herkend in seconden, minuten of uren.
- Tijden mogen ISO (`2026-11-14T07:40:00+01:00`) of `07:40` zijn.
- Een `move` boven de 600 wordt als stappen gelezen.
- Opnieuw sturen op dezelfde dag overschrijft alleen wat meegestuurd wordt.
