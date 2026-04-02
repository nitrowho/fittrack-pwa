# FitTrack PWA — Data Model

The app stores all data in IndexedDB via Dexie. IDs are generated client-side through the shared UUID helper in `src/lib/domain/shared/uuid.ts`, which uses `crypto.randomUUID()`.

## Entity Relationship Diagram

```text
Exercise ←──── TemplateExercise ────→ WorkoutTemplate
                                          │
                                          ↓ snapshot at workout start
                                    WorkoutSession
                                          │
                                    ExerciseSession
                                          │
                                      ExerciseSet

SettingsRecord is a separate key-value table
```

## Core Types

```typescript
type MuscleGroup = 'ruecken' | 'beine' | 'brust' | 'arme' | 'schulter';

interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup | null;
  isBarbell: boolean;
}

interface PlateDefinition {
  weight: number;
  quantity?: number; // undefined = unlimited
}

interface PlateConfig {
  barWeight: number;
  plates: PlateDefinition[];
}

interface WorkoutTemplate {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: Date;
}

interface TemplateExercise {
  id: string;
  templateId: string;
  exerciseId: string;
  sortOrder: number;
  targetSets: number;
  repRangeLower: number;
  repRangeUpper: number;
  restDurationSeconds: number;
}

interface WorkoutSession {
  id: string;
  templateId: string | null; // null for free workouts
  templateName: string;      // snapshot at creation
  startedAt: Date;
  completedAt: Date | null;
  notes: string;
}

interface ExerciseSession {
  id: string;
  workoutSessionId: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup | null;
  sortOrder: number;
  startedAt: Date | null;
  completedAt: Date | null;
  targetSets: number;
  repRangeLower: number;
  repRangeUpper: number;
  restDurationSeconds: number;
}

interface ExerciseSet {
  id: string;
  exerciseSessionId: string;
  setNumber: number;
  weight: number;
  reps: number;
  rir: number | null;
  isCompleted: boolean;
  completedAt: Date | null;
}

interface SettingsRecord {
  key: string;
  value: unknown;
}
```

## Current Dexie Schema

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
      exerciseSets: 'id, exerciseSessionId, setNumber'
    });

    this.version(2).stores({
      exercises: 'id, name, muscleGroup',
      workoutTemplates: 'id, sortOrder',
      templateExercises: 'id, templateId, exerciseId, sortOrder',
      workoutSessions: 'id, templateId, startedAt, completedAt',
      exerciseSessions: 'id, workoutSessionId, exerciseId, sortOrder',
      exerciseSets: 'id, exerciseSessionId, setNumber',
      settings: 'key'
    });
  }
}
```

Version 2 added the `settings` table and upgrades legacy exercises by inferring `isBarbell` from exercise names when the property is missing.

## Settings Keys in Use

The `settings` table currently stores:

- `plateConfig`: `PlateConfig`
- `theme`: `'system' | 'light' | 'dark'`

## Snapshot Pattern

When a workout starts, template data is copied into session records:

- `WorkoutSession.templateName`
- `ExerciseSession.exerciseName`
- `ExerciseSession.muscleGroup`
- `ExerciseSession.targetSets`
- `ExerciseSession.repRangeLower`
- `ExerciseSession.repRangeUpper`
- `ExerciseSession.restDurationSeconds`

This keeps history stable even after templates or exercises are edited later.

## Cascade Deletes

Dexie does not provide relational cascade deletes, so the app handles them explicitly:

- Delete template: remove linked `TemplateExercise` rows first
- Delete exercise: remove linked `TemplateExercise` rows first
- Delete workout session: remove `ExerciseSession` rows and their `ExerciseSet` rows

These operations live below the UI in database or repository code and run inside explicit transactions.

## Current Business Model Notes

- Progression comparisons are per exercise across all templates
- A workout can be template-based or free-form
- Only completed sets contribute to exported volume and statistics
- Session notes belong to `WorkoutSession`
