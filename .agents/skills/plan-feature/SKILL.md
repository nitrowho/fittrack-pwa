---
name: plan-feature
description: Create a comprehensive implementation plan for a feature or change without writing code. Use when the user asks for a plan, wants deep codebase analysis before implementation, or needs a handoff-ready execution plan.
---

# Plan Feature

Use this skill when the task is planning rather than implementation.

## Goal

Transform a feature request into a complete implementation plan that another agent can execute with minimal ambiguity.

## Guardrail

Do not write implementation code while using this skill unless the user changes direction.

## Workflow

1. Clarify the feature request, user value, scope, and complexity.
2. Analyze the codebase:
   - find affected systems and routes
   - identify similar implementations and patterns to copy
   - locate integration points, tests, and documentation
3. Research external documentation only when the task depends on current or version-sensitive guidance.
4. Make the important design decisions explicit:
   - chosen approach and why
   - key risks, edge cases, and validation strategy
   - order of operations
5. Produce a plan that is specific enough to execute directly.

## Required Plan Structure

Include:

- Feature description
- User story
- Problem statement
- Solution statement
- Feature metadata
- Relevant codebase files to read before implementing
- New files to create, if any
- Relevant external documentation, if any
- Patterns to follow from the existing codebase
- Step-by-step implementation plan
- Testing strategy
- Validation commands

## Quality Bar

- Prefer repository patterns over hypothetical designs.
- Call out unknowns and assumptions explicitly.
- Include exact file paths wherever possible.
- Keep the plan implementation-oriented, not theoretical.
