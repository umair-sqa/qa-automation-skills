# Skill Anatomy

This document describes the structure and format of qa-automation-skills skill files. Use this as a guide when contributing new skills or understanding existing ones.

## File Location

Every skill lives in its own directory under `skills/`:

```
skills/
  skill-name/
    SKILL.md           # Required: The skill definition
    scripts/           # Optional: Runnable helpers used by the skill workflow
    references/        # Optional: Skill-specific reference documentation
```

`SKILL.md` is the only required file. Add `scripts/` or `references/` only when the skill actually needs them, and omit them entirely for simpler skills.

## SKILL.md Format

### Frontmatter (Required)

```yaml
---
name: skill-name-with-hyphens
description: Guides agents through [task/workflow]. Use when [specific trigger conditions].
---
```

**Rules:**
- `name`: Lowercase, hyphen-separated. Must match the directory name.
- `description`: Start with what the skill does in third person, then include one or more clear "Use when" trigger conditions. Include both *what* and *when*. Maximum 1024 characters.

**Why this matters:** Agents discover skills by reading descriptions. The description is injected into the system prompt, so it must tell the agent both what the skill provides and when to activate it. Do not summarize the workflow — if the description contains process steps, the agent may follow the summary instead of reading the full skill.

### Standard Sections (Recommended Pattern)

The frontmatter contract above is required. The section layout below is a recommended pattern, not a rigid template: equivalent headings are acceptable when they serve the same purpose clearly.

```markdown
# Skill Title

## Overview
One-two sentences explaining what this skill does and why it matters.

## When to Use
- Bullet list of triggering conditions (symptoms, task types)
- When NOT to use (exclusions)

## [Core Process / The Workflow / Steps]
The main workflow, broken into numbered steps or phases.
Include code/config examples where they help.

## [Specific Techniques / Patterns]
Detailed guidance for specific scenarios.

## Common Rationalizations
| Rationalization | Reality |
|---|---|
| Excuse agents (or engineers) use to skip a step | Why the excuse is wrong |

## Red Flags
- Behavioral patterns indicating the skill is being violated
- Things to watch for during review

## Verification
After completing the skill's process, confirm:
- [ ] Checklist of exit criteria
- [ ] Evidence requirements
```

### Common Rationalizations — the most important section

These are excuses an agent (or a tired engineer) reaches for to skip a step, paired with a factual rebuttal. Every skill in this catalog earns its place by encoding real failure modes from QA practice, not generic advice. If a section reads like it could apply to any process, tighten it until it's specific to test automation.

### Red Flags

Symptoms a reviewer or agent should notice mid-task that indicate the process is being skipped or corners are being cut — e.g. "new spec file added with zero assertions" or "retry count raised instead of root-causing a flake."

### Verification

A checklist that must be satisfiable with concrete evidence (a command that was run, a report that was generated) — not a restatement of intent.

## Conventions Specific to This Catalog

- Every skill has: Overview, When to Use, Process, Common Rationalizations, Red Flags, Verification.
- Shared references live in the root `references/` directory; a skill's own supplementary material lives in `skills/<name>/references/`.
- Prefer extending an existing skill over adding a near-duplicate — check the catalog before proposing a new one.
- Supporting files are only created when content would otherwise exceed roughly 100 lines inline.
