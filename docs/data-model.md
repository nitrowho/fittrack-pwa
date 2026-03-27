# FitTrack PWA — Data Model

All models map directly from the iOS SwiftData schema. IDs are UUIDs (generated client-side via `crypto.randomUUID()`). All fields have defaults for forward compatibility.

## Entity Relationship Diagram

```
Exercise ←──── TemplateExercise ────→ WorkoutTemplate
                                          │
                                          ↓ (snapshot at session creation)
                                    WorkoutSession
                                          │
                                    ExerciseSession
                                          │
                                      ExerciseSet
```

## Dexie Schema

```typescript
// db.ts
import Dexie, { type Table } from 'dexie';

interface Exercise {
  id: string;           // UUID
  name: string;
  muscleGroup: MuscleGroup | null;
  isBarbell: boolean;   // true for barbell exercises (enables plate calculator)
}

interface PlateDefinition {
  weight: number;       // e.g. 20, 15, 10, 5, 2.5, 1.25
  quantity?: number;    // total plates available (both sides); undefined = unlimited
}

interface PlateConfig {
  barWeight: number;          // default 20
  plates: PlateDefinition[];  // sorted descending by weight
}

// Settings table stores key-value pairs (e.g. key='plateConfig', value=PlateConfig)
interface SettingsRecord {
  key: string;
  value: unknown;
}

interface WorkoutTemplate {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: Date;
}

interface TemplateExercise {
  id: string;
  templateId: string;   // FK → WorkoutTemplate
  exerciseId: string;    // FK → Exercise
  sortOrder: number;
  targetSets: number;    // e.g. 3
  repRangeLower: number; // e.g. 6
  repRangeUpper: number; // e.g. 10
  restDurationSeconds: number; // e.g. 180
}

interface WorkoutSession {
  id: string;
  templateId: string;    // FK → WorkoutTemplate
  templateName: string;  // Snapshot at creation
  startedAt: Date;
  completedAt: Date | null;
  notes: string;
}

interface ExerciseSession {
  id: string;
  workoutSessionId: string; // FK → WorkoutSession
  exerciseId: string;       // Reference to Exercise (not FK)
  exerciseName: string;     // Snapshot
  muscleGroup: MuscleGroup | null; // Snapshot
  sortOrder: number;
  startedAt: Date | null;
  completedAt: Date | null;
  targetSets: number;       // Snapshot from TemplateExercise
  repRangeLower: number;    // Snapshot
  repRangeUpper: number;    // Snapshot
  restDurationSeconds: number; // Snapshot
}

interface ExerciseSet {
  id: string;
  exerciseSessionId: string; // FK → ExerciseSession
  setNumber: number;         // 1-based
  weight: number;            // kg
  reps: number;
  rir: number | null;        // Reps In Reserve
  isCompleted: boolean;
  completedAt: Date | null;
}

type MuscleGroup = 'ruecken' | 'beine' | 'brust' | 'arme' | 'schulter';
```

## Dexie Indexes

```typescript
class FitTrackDB extends Dexie {
  exercises!: Table<Exercise>;
  workoutTemplates!: Table<WorkoutTemplate>;
  templateExercises!: Table<TemplateExercise>;
  workoutSessions!: Table<WorkoutSession>;
  exerciseSessions!: Table<ExerciseSession>;
  exerciseSets!: Table<ExerciseSet>;
  settings!: Table<SettingsRecord>;

  constructor() {
    super('fittrack');
    this.version(1).stores({
      exercises: 'id, name, muscleGroup',
      workoutTemplates: 'id, sortOrder',
      templateExercises: 'id, templateId, exerciseId, sortOrder',
      workoutSessions: 'id, templateId, startedAt, completedAt',
      exerciseSessions: 'id, workoutSessionId, exerciseId, sortOrder',
      exerciseSets: 'id, exerciseSessionId, setNumber',
    });
    // Version 2: added settings table, isBarbell on exercises
    this.version(2).stores({
      .../* same as v1 */,
      settings: 'key',
    });
  }
}
```

## Cascade Deletes

Dexie doesn't support cascade deletes natively. Implement them as helper functions:

- **Delete WorkoutTemplate** → delete all TemplateExercises with that `templateId`
- **Delete WorkoutSession** → delete all ExerciseSessions → delete all ExerciseSets
- **Delete Exercise** → delete all TemplateExercises referencing it

## Snapshot Pattern

When creating a WorkoutSession, snapshot all relevant template data into ExerciseSession fields. This ensures historical accuracy even if templates are edited later. The ExerciseSession stores `exerciseName`, `muscleGroup`, `targetSets`, `repRangeLower`, `repRangeUpper`, and `restDurationSeconds` — all copied from the TemplateExercise at session creation time.
