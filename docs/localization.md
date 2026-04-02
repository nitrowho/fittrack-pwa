# FitTrack PWA — Localization

FitTrack PWA currently uses a single-language German UI with hardcoded copy. There is no i18n framework.

## Language Rules

- User-facing UI copy should be German
- Formatting should use the shared helpers in `src/lib/services/formatter.ts`
- Exercise and template names are user content, so they may contain non-German names such as `Chin-Ups` or `Workout A`

## Common UI Copy

| Context | Current text |
|---------|--------------|
| Dashboard title area | `Workout starten` |
| Resume card | `Fortsetzen` |
| Active workout notes | `Notizen` |
| History tab | `Verlauf` |
| Statistics tab | `Statistiken` |
| Templates | `Vorlagen` |
| Exercises | `Übungen` |
| Settings | `Einstellungen` |
| Finish workout | `Beenden` |
| Cancel workout | `Abbrechen` |
| No sessions | `Noch keine Einheiten` |
| Increase recommendation | `Gewicht erhöhen auf ...` |
| Stagnation hint | `Seit X Einheiten keine Steigerung` |
| Backup | `Backup erstellen` / `Backup wiederherstellen` |
| Export | `CSV exportieren` / `JSON exportieren` |

## Number and Date Formatting

Current shared formatter behavior:

- Decimal separator: comma, for example `62,5 kg`
- Thousands separator: period, for example `1.250 kg`
- Weight formatting:
  - `formatWeight`: up to 1 decimal place
  - `formatWeightPrecise`: up to 2 decimal places
- Duration formatting:
  - under 1 hour: `M:SS`
  - 1 hour or more: `H:MM:SS`
- Rest duration formatting:
  - examples: `3 Min`, `3:15 Min`, `1:05 Std`
- Full date formatting uses `de-DE` long month names
- Short date formatting uses `de-DE` abbreviated month names

## Muscle Group Labels

The internal enum values stay lowercase and ASCII-friendly:

- `ruecken`
- `beine`
- `brust`
- `arme`
- `schulter`

Displayed labels are:

- Rücken
- Beine
- Brust
- Arme
- Schulter
