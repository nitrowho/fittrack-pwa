---
name: prime
description: Prime Codex with repository understanding before implementation. Use when the user asks to prime, orient, or load project context, or before substantial work when a concise codebase summary is needed.
---

# Prime

Use this skill to build working context before implementation.

## Goal

Understand the repository's purpose, architecture, conventions, and recent activity well enough to work safely.

## Read First

1. Read the core product and architecture docs if they exist.
2. Inspect recent git history and current worktree state.

For this repository, start with:
- `docs/architecture.md`

## Workflow

1. Read the core documentation and identify the application's purpose, user roles, and major technical choices.
2. Inspect the current state with git:
   - `git log -20 --oneline`
   - `git status`
3. Map the top-level structure and identify the important application, library, test, and database areas.
4. Note key conventions that affect future work:
   - package manager and build/test commands
   - data-access patterns
   - testing expectations
   - repository-specific code style or safety rules
5. Produce a concise summary that is easy to scan.

## Output

Summarize:

- Project overview
- Architecture and important directories
- Tech stack
- Core conventions and testing expectations
- Current git state and any immediate observations

Keep the summary concise and practical. The goal is to prepare for execution, not to restate every file.
