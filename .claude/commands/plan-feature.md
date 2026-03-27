# Plan Feature

Create a detailed implementation plan for a feature before writing any code.

## Input

The user describes a feature — either as a rough idea or a reference to a PRD phase. If the description is vague, ask clarifying questions until you can define clear success criteria. Do not skip this step.

## Process

### 1. Research

- Read CLAUDE.md for project rules and constraints.
- Read relevant on-demand docs from `docs/` (data model, features, UI design, architecture — whichever apply).
- Scan the codebase areas that will be affected (`git log --oneline -10`, directory listings, key files).
- Use sub-agents for deeper research to keep context clean.

### 2. Ask Clarifying Questions

Before producing the plan, ask the user about any ambiguities or assumptions. Every question answered removes a wrong assumption from the implementation. Cover:

- Scope boundaries — what is explicitly out of scope?
- Edge cases and error states
- UI/UX expectations (reference existing patterns or screens)
- Data model implications (new tables, fields, migrations?)

Only proceed to the plan after the user confirms.

### 3. Produce the Plan

Write the plan to a new file: `docs/plans/<feature-name>.md`

## Plan Structure

```markdown
# Plan: <Feature Name>

## Problem Statement
What problem does this solve and why does it matter?

## Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2
(Specific, testable outcomes — not vague goals)

## Affected Areas
- Files to create: ...
- Files to modify: ...
- Data model changes: ...

## Tasks
### Phase 1: <name>
- [ ] Task 1 — file(s), what to do
- [ ] Task 2 — file(s), what to do

### Phase 2: <name>
- [ ] Task 3 — ...

(Break down to individual file-level changes. Order by dependency.)

## Validation Strategy
Define how to verify correctness *before* writing code:
- Type check: `pnpm run check`
- Manual test steps: ...
- Edge cases to verify: ...

## Open Questions
Anything unresolved that might affect implementation.
```

## Guardrails

- Do not write any implementation code during planning.
- Respect the architecture layers defined in CLAUDE.md (routes/components -> stores -> commands/queries -> repositories -> db).
- Keep the plan self-contained — a fresh conversation with only the plan file should be enough to implement.
- If the feature is large, split it into phases that each produce a working, committable state.

## Output

Confirm the plan file location and give a brief summary of the scope and task count. Ask the user to review before moving to implementation.
