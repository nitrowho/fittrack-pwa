# Execute Plan

Implement a feature from a structured plan file.

## Input

$ARGUMENTS — path to a plan file (e.g. `docs/plans/feature-name.md`). If no argument is given, list available plans in `docs/plans/` and ask which one to execute.

## Process

### 1. Load Context

- Read the plan file fully.
- Read any on-demand docs referenced in the plan.
- Do not rely on prior conversation context — the plan is the source of truth.

### 2. Implement Task by Task

Work through the plan's task list in order:

- Before each task, read the target file(s) to understand current state.
- Implement the change.
- After each task, run `pnpm run check` to catch type errors early.
- If a task fails validation, fix it before moving to the next task.
- Mark completed tasks in your progress tracking.

### 3. Validate

After all tasks are done, run the full validation pyramid:

1. `pnpm run check` — type checking
2. `pnpm run build` — verify production build succeeds
3. Walk through the manual test steps defined in the plan
4. Verify each success criterion from the plan

### 4. Update documentation

After all implementation is done, check in the `docs` folder if any of the documentation needs update. If so, make the updates. 

### 5. Report

Summarize:

- What was implemented (completed tasks)
- Any deviations from the plan and why
- Validation results
- Anything left for the user to manually verify

## Guardrails

- Follow the plan's task order unless a dependency requires reordering.
- Do not add features, refactors, or improvements beyond what the plan specifies.
- Respect architecture layers from CLAUDE.md — no direct Dexie imports in routes/components.
- All UI text must be in German.
- If you hit a blocker not covered by the plan, stop and ask the user rather than improvising.
- Do not commit — the user will run `/commit` separately after reviewing.
