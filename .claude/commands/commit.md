# Commit

Use this skill to create a clean, intentional git commit from the current working tree.

## Goal

Inspect the uncommitted changes, choose a concise commit message in the repository's style, and create a focused commit that matches the actual scope of work.

## Workflow

1. Inspect the worktree before committing:
   - `git status`
   - `git diff HEAD`
   - `git status --porcelain`
   - `git log --oneline -20`
2. Understand what changed and whether unrelated edits are present.
3. Stage only the files that belong in the commit.
4. Write a concise commit message in the repository's established format:
   - `type: short imperative description`
5. Create the commit.

## Guardrails

- Never hide unrelated changes inside the same commit.
- Do not amend a commit unless the user explicitly asks.
- Follow the repository's commit style and prefer an atomic scope.
- If the worktree contains ambiguous or mixed changes, stop and explain the split instead of guessing.

## Output

Summarize:

- what was committed
- the commit message used
- any intentionally uncommitted files that were left out