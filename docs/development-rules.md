# FitTrack PWA - Development Rules

This document defines the coding and architecture rules for FitTrack PWA.

It is based on the current repository state. The repository has already moved a large part of the app into `application/`, `repositories/`, `domain/`, and `infrastructure/`, but older code patterns still exist in places. The main architectural direction remains:

- `routes/` and UI components must not access Dexie directly.
- Business workflows must go through dedicated application methods.
- Dexie access must be isolated behind repositories or data services.
- Business rules should stay pure and testable whenever possible.

These rules apply to all new code. Existing code should be migrated opportunistically when touched.

## 1. Core Principles

1. Keep UI thin.
   Route files and Svelte components should mostly render state, forward user events, and trigger dedicated actions.

2. Keep dependencies one-way.
   UI depends on application code. Application code depends on domain rules and repositories. Repositories depend on Dexie. Never invert this direction.

3. Keep business logic out of the database layer.
   Dexie code should fetch, persist, and transact. It should not decide workout progression, validation rules, or UI behavior.

4. Keep domain logic pure when possible.
   Calculations like progression, volume, validation, and sorting should be plain TypeScript functions with no Svelte, no DOM, and no IndexedDB access.

5. Prefer explicit feature APIs over table access.
   Call `createTemplate()`, `getDashboardData()`, or `finishWorkout()` instead of reaching for `db.workoutTemplates` or `db.exerciseSets` in UI code.

6. Migrate incrementally, not with a big-bang rewrite.
   New features must follow this structure. Existing screens should move to it when they are changed.

## 2. Required Layering

Use this layering for all new work:

```text
routes / components
        |
        v
stores / feature controllers
        |
        v
application use cases / query services
        |
        v
repositories
        |
        v
db / browser APIs

domain rules sit beside application code and remain framework-free
```

### Layer Responsibilities

#### UI Layer

Includes:

- `src/routes/**`
- `src/lib/components/**`

Rules:

- Must not import `db` from `src/lib/db/database.ts`.
- Must not execute Dexie queries, transactions, or cascade delete helpers.
- Must not generate IDs, build snapshots, or coordinate multi-table writes.
- May call stores, query services, application actions, formatters, and presentational helpers.
- Should contain minimal async orchestration. If a route starts to coordinate several async calls, move that into a dedicated feature method.

#### Store / Feature Controller Layer

Includes:

- `src/lib/stores/**`
- future feature-local stores such as `src/lib/features/workouts/store.svelte.ts`

Rules:

- Stores hold reactive UI state and derived state.
- Stores may orchestrate application actions.
- Stores must not import Dexie directly.
- Stores should not know table names or IndexedDB indexes.
- Stores may hold session-only browser state such as timer state, dialog state, or optimistic UI state.

#### Application Layer

Includes:

- use cases
- command handlers
- query services
- feature facades

Examples:

- `getDashboardData()`
- `listTemplates()`
- `createExercise(input)`
- `startWorkout(templateId)`
- `completeSet(input)`
- `restoreBackup(file)`

Rules:

- This layer owns workflows and orchestration.
- It may call multiple repositories in one operation.
- It may decide transaction boundaries.
- It validates input before persistence.
- It maps raw persistence data into UI-specific view models where helpful.

#### Domain Layer

Includes:

- entity types
- pure business functions
- invariants
- calculation helpers

Examples:

- progression calculation
- volume calculation
- template validation
- rest duration normalization

Rules:

- No Dexie imports.
- No Svelte imports.
- No DOM, `window`, `document`, `navigator`, or file download APIs.
- Accept all required data as arguments and return plain values.

#### Repository / Infrastructure Layer

Includes:

- `src/lib/db/**`
- future repository files such as `src/lib/repositories/**`
- browser API adapters for wake lock, notifications, haptics, and downloads

Rules:

- Only this layer may import Dexie tables or `db`.
- Repositories expose domain-oriented methods, not table-oriented leakage.
- Cascade deletes, snapshot writes, and cross-table persistence details belong here or in the application layer directly above it.
- Multi-table writes must happen inside transactions.

## 3. Dependency Rules

The following imports are forbidden:

- `src/routes/**` -> `src/lib/db/**`
- `src/lib/components/**` -> `src/lib/db/**`
- `src/lib/stores/**` -> `src/lib/db/**`
- domain modules -> Svelte modules, Dexie modules, browser APIs
- repositories -> route files or Svelte components

The following imports are expected:

- routes/components -> stores, feature APIs, formatters, types
- stores -> feature APIs, domain helpers, browser adapters
- application services -> repositories, domain helpers, types
- repositories -> `db`, persistence mappers, types

If a UI file needs data, the default answer should be: create or use a dedicated query method. Do not "just query Dexie here".

## 4. Preferred Project Structure

Do not perform a full restructure immediately, but use this target shape for new code and refactors:

```text
src/lib/
  domain/
    exercises/
    templates/
    workouts/
    shared/
  application/
    exercises/
      commands.ts
      queries.ts
    templates/
      commands.ts
      queries.ts
    workouts/
      commands.ts
      queries.ts
  repositories/
    exercise-repository.ts
    template-repository.ts
    workout-repository.ts
  db/
    database.ts
    migrations.ts
    backup.ts
    seed.ts
  stores/
    timer.svelte.ts
    workout.svelte.ts
  components/
```

Alternative organization is acceptable if the same boundaries are preserved. The important rule is not the folder names. The important rule is that UI does not bypass the application and repository layers.

## 5. Rules for Routes and Components

1. `+page.svelte` files should be composition roots, not feature implementations.
   They may read route params, trigger initial loading, and wire UI events to feature actions.

2. Keep route-local state limited to display concerns.
   Examples: modal open state, selected tab, input draft values. Do not keep persistence orchestration in the route.

3. Extract repeated or complex logic quickly.
   If a route contains non-trivial loading, mapping, or mutation logic, move it to a dedicated feature query or command.

4. Components should be presentational by default.
   A component should receive data and emit events. It should not perform direct persistence.

5. Do not scatter formatting logic.
   User-visible number and date formatting must go through shared formatter utilities so German formatting stays consistent.

## 6. Rules for Stores

1. A store is not a repository.
   Stores manage reactive state. They should not know how Dexie tables are queried.

2. Stores should depend on semantic methods.
   Good: `await workoutCommands.completeSet(...)`
   Bad: `await db.exerciseSets.update(...)`

3. Store state should reflect UI needs, not mirror database tables blindly.
   Use view models when the UI needs joined or aggregated data.

4. Keep browser side effects isolated.
   Wake lock, haptics, notifications, and file download behavior should be wrapped in small adapters instead of being spread through stores and routes.

5. Use one store per long-lived interactive workflow.
   The active workout session is a good store candidate. A simple list page usually does not need a global store.

## 7. Rules for Repositories and Data Access

1. Repositories must expose feature-level methods.
   Prefer methods like:

- `listTemplatesWithExerciseCounts()`
- `getTemplateDetail(id)`
- `saveTemplate(input)`
- `listRecentCompletedSessions(limit)`
- `deleteWorkoutSessionCascade(id)`
- `getLatestCompletedExerciseSession(exerciseId, excludeSessionId?)`

2. Repositories may join data from multiple tables.
   Avoid N+1 query patterns in routes. If the UI needs combined data, return a combined result from one repository or query service.

3. Multi-table writes must be transactional.
   Template creation, workout start, workout finish, backup restore, and cascade deletes should each define a single clear transaction boundary.

4. Snapshot creation belongs below the UI.
   Creating `ExerciseSession` snapshots from template data must happen inside application or repository code, never inside route files.

5. ID generation belongs below the UI.
   `crypto.randomUUID()` should be called inside application or repository methods, not in components.

6. Repository return types should be explicit.
   Avoid `unknown[]`, `Record<string, unknown>`, or loosely shaped maps unless absolutely necessary at an integration boundary.

## 8. Rules for Domain and Service Code

1. Split pure domain rules from infrastructure-aware services.
   The current progression logic is a good example of why this matters: the rule itself is domain logic, but loading historical sessions is persistence logic. Those concerns should be separate.

2. Domain functions should be deterministic.
   Pass in current time, source data, and configuration rather than reading global state.

3. Prefer small, named functions over broad utility files.
   Avoid creating a generic `helpers.ts` or a catch-all `services.ts`.

4. Name files by business meaning.
   Good: `progression.ts`, `template-validation.ts`, `workout-volume.ts`
   Bad: `utils.ts`, `common.ts`, `misc.ts`

5. Validation belongs at the application boundary.
   Form input should be validated before persistence. Keep rules such as rep range validity, set count minimums, and rest duration constraints in shared validation functions.

## 9. Naming and API Conventions

1. Use verbs for commands and `get` or `list` for queries.
   Examples: `createExercise`, `updateExercise`, `deleteExercise`, `getDashboardData`, `listHistorySessions`

2. Avoid vague names.
   Prefer `loadDashboardData` over `loadData`, and `saveTemplate` over `submit`.

3. Keep UI event handlers shallow.
   A route may have `handleSave()`, but it should call a named application method that expresses the real behavior.

4. Keep DTO names explicit when a shape is not a domain entity.
   Examples: `CreateTemplateInput`, `UpdateExerciseInput`, `DashboardData`

## 10. State, Async, and Performance Rules

1. Use `Promise.all` for independent reads.
   This matters in a local database too and reduces avoidable route latency.

2. Avoid N+1 loading from UI code.
   If a list page needs counts, aggregates, or joined names, compute them in repositories or query services.

3. Keep derived state derived.
   Use `$derived` for values that can be computed from existing store state. Do not persist computed UI state unless it is needed across reloads.

4. Prefer explicit reload boundaries.
   After a mutation, either update local state intentionally or reload via a dedicated query. Do not mix ad-hoc state mutation and random refetching in the same workflow.

5. Use optimistic updates only when they are simple and safe.
   If rollback is complex, prefer a short loading state and a single source of truth.

## 11. Error Handling Rules

1. Do not silently swallow real errors.
   Only capability checks or intentionally unsupported browser APIs may fail quietly.

2. Separate technical errors from user-facing messages.
   UI messages must be clear and in German. Internal error values may stay in English for developer clarity.

3. Fail early on invalid input.
   Do not let invalid template, session, or set data reach the database layer.

4. Keep destructive actions explicit.
   Deletes, backup restore, and workout cancellation should remain behind confirmation steps in the UI.

## 12. FitTrack-Specific Rules

1. All user-facing text stays in German.
   No mixed English UI strings.

2. All dates, durations, weights, and volume values must use shared formatting helpers.

3. Progression is per exercise across all templates.
   New code must not accidentally scope progression comparisons per template.

4. Historical accuracy is mandatory.
   Snapshot data stored on `ExerciseSession` must remain the source of truth for history screens.

5. Rest timers must remain date-based and resilient to backgrounding.

6. Backup and restore logic must stay versioned.
   Any schema-affecting change must include a clear backup compatibility decision.

## 13. Migration Rules for This Repository

Apply these rules incrementally:

1. No new direct `db` imports in `routes/`.

2. No new direct `db` imports in stores unless a temporary migration exception is documented in code and scheduled for removal.

3. When touching an existing feature page, first extract read methods and write methods into a dedicated feature API, then simplify the route.

4. When touching a domain-heavy service, split persistence loading from pure calculations.

5. Prefer improving one feature end-to-end over introducing a partial abstraction used nowhere else.

## 14. Definition of Done for New Features

A feature is only complete if:

- route files do not access Dexie directly
- writes go through dedicated commands or application methods
- multi-table writes are transactional
- business rules live outside the UI
- German formatting is consistent
- destructive flows are confirmed
- names and file placement make responsibilities obvious

If a proposed change makes the dependency graph less obvious, it is probably the wrong abstraction.
