# FitTrack PWA — Seed Data

On first app launch, the database is seeded when the `exercises` table is empty.

## Exercises

| Name | Muscle Group | Is Barbell |
|------|--------------|------------|
| Kniebeuge | Beine | Yes |
| Bankdrücken | Brust | Yes |
| Chin-Ups | Rücken | No |
| Langhantelrudern Obergriff | Rücken | Yes |
| Rumänisches Kreuzheben | Beine | Yes |

## Templates

### Workout A

| # | Exercise | Sets x Reps | Rest |
|---|----------|-------------|------|
| 1 | Kniebeuge | 3 x 5-8 | 240 s |
| 2 | Bankdrücken | 3 x 6-10 | 210 s |
| 3 | Chin-Ups | 3 x 6-10 | 195 s |
| 4 | Langhantelrudern Obergriff | 2 x 6-10 | 150 s |

### Workout B

| # | Exercise | Sets x Reps | Rest |
|---|----------|-------------|------|
| 1 | Rumänisches Kreuzheben | 3 x 6-10 | 240 s |
| 2 | Bankdrücken | 3 x 6-10 | 210 s |
| 3 | Chin-Ups | 3 x 6-10 | 195 s |
| 4 | Langhantelrudern Obergriff | 2 x 6-10 | 150 s |

## Seeded Settings

The seed step also creates a default `plateConfig` entry in the `settings` table:

```json
{
  "barWeight": 20,
  "plates": [
    { "weight": 20 },
    { "weight": 15 },
    { "weight": 10 },
    { "weight": 5 },
    { "weight": 2.5 },
    { "weight": 1.25 }
  ]
}
```

The theme preference is not seeded; it defaults to `system` until the user changes it.
