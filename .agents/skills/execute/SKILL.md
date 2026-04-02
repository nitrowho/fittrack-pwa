---
name: execute
description: Execute an existing implementation plan end to end. Use when the user provides a plan file or asks to implement a previously prepared plan, including tests and validation.
---

# Execute

Use this skill to implement from an existing plan document.

## Goal

Read the plan, complete the tasks in order, add the required tests, run the validation commands, and finish only when the planned work is verified.

## Workflow

1. Read the entire plan before editing anything.
2. Identify:
   - the required file changes
   - dependencies between tasks
   - tests to add or update
   - validation commands to run
3. Execute tasks in order:
   - read related files before modifying them
   - follow existing project patterns
   - keep changes aligned with the plan unless a deviation is necessary
4. Verify continuously:
   - check imports and types as you go
   - add or update automated tests for every changed behavior
5. Run all validation commands from the plan.
6. If something fails, fix it and rerun until the plan is complete or a real blocker remains.

## Output

Report:

- completed tasks
- files created and modified
- tests added or updated
- validation results
- any justified deviation from the plan

## Guardrails

- Do not silently skip validation.
- If the plan is incomplete or wrong, state the gap and repair the plan locally before proceeding.
- Keep the final implementation consistent with repository conventions and safety rules.
