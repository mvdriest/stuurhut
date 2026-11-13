# iOS-opdracht: slaap en beweging naar Stuurhut

Elke ochtend stuurt een opdracht (Shortcut) op je iPhone je slaap van afgelopen nacht en je
beweegminuten van gisteren naar `https://stuurhut.vercel.app/api/ritme`.

De sleutel staat in Vercel als `NUXT_RITME_TOKEN`. Nieuwe sleutel nodig? Zet een nieuwe waarde in
Vercel, rol opnieuw uit en pas de header in de opdracht aan.

## De opdracht maken (app Opdrachten)

1. **Zoek naar gezondheidsgegevens** (Find Health Samples)
   - Type: *Slaapanalyse*
   - Filters: *Startdatum ligt in de afgelopen 1 dagen*, *Waarde is niet Wakker*, *Waarde is niet In bed*
   - Sorteer op *Startdatum*, *Oudste eerst*
2. **Haal details van gezondheidsgegevens op** → *Duur* (van het resultaat van stap 1)
3. **Bereken statistieken** → *Som* (van stap 2) — dit is `sleep`
4. **Haal onderdeel uit lijst** → *Eerste onderdeel* van stap 1, dan **Haal details op** → *Startdatum*,
   dan **Formatteer datum** → *ISO 8601* — dit is `bed`
5. Hetzelfde met *Laatste onderdeel* en *Einddatum* — dit is `woke`
6. **Zoek naar gezondheidsgegevens** → Type *Trainingsminuten*, *Startdatum ligt in de afgelopen 1 dagen*;
   **Haal details op** → *Waarde*; **Bereken statistieken** → *Som* — dit is `move`
7. **Haal inhoud van URL op**
   - URL: `https://stuurhut.vercel.app/api/ritme`
   - Methode: *POST*
   - Headers: `Authorization` = `Bearer <sleutel>`
   - Verzoek: *JSON* met `sleep`, `bed`, `woke`, `move` (de variabelen uit de stappen hierboven)
8. Optioneel: **Toon melding** met *Inhoud van URL* → je ziet bijvoorbeeld "Slaap 7,2 uur (23:10–07:40) · 34 min bewogen gisteren".

## Automatisch elke ochtend

Opdrachten → *Automatisering* → **+** → *Tijdstip van de dag* → 09:00, dagelijks → *Voer direct uit*
→ kies de opdracht.

## Wat de server doet

- Slaap hoort bij de ochtend waarop je wakker werd; beweging bij de dag ervoor.
- Duur wordt herkend in seconden, minuten of uren.
- Tijden mogen ISO (`2026-11-14T07:40:00+01:00`) of `07:40` zijn.
- Opnieuw sturen op dezelfde dag overschrijft alleen wat meegestuurd wordt.
