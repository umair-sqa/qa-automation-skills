# Using qa-automation-skills with Kiro

This guide covers Kiro (IDE and CLI — they read skills from the same location).

**What's already wired up:** `.kiro/skills` is a symlink to this repo's root `skills/` directory, so every skill here is available in Kiro with no copying step. `.kiro/steering/` holds short manual-inclusion aliases (`/spec`, `/api-test`, `/flaky-triage`, etc.) mirroring the `.claude/commands/` entry points. Both are already committed — this doc is about how to use and extend them, not set them up from scratch.

## How Kiro discovers skills

Kiro supports two skill scopes:

- **Workspace** (this repo): `.kiro/skills/<name>/SKILL.md` — via the `.kiro/skills -> ../skills` symlink, this is every skill in `skills/`.
- **Global** (your machine, across projects): `~/.kiro/skills/<name>/SKILL.md`.

Frontmatter requirements are the same contract this catalog already uses — `name` (matches the directory) and `description` (states *what* and *when*, checked by `scripts/validate-skills.js`) — so no reformatting was needed to make these skills Kiro-compatible.

Skills activate two ways:

1. **Automatically** — Kiro matches your request against each skill's `description` and loads the relevant one.
2. **Manually** — type `/` in chat to see the skill list, then select one (e.g. `/api-contract-test-automation`) to invoke it directly.

If a `SKILL.md` body contains `$ARGUMENTS` or `${N}` placeholders, text typed after the slash command is substituted in. None of this catalog's skills currently use that — they're designed to be invoked with surrounding conversational context, not positional arguments.

## Short aliases via steering files

Kiro's **steering files** (`.kiro/steering/*.md`) support an `inclusion: manual` mode: the file doesn't load automatically, but appears in the `/` slash-command list and can be pulled into the conversation on demand. This repo uses that to give the same short, memorable entry points `.claude/commands/` provides for Claude Code — `/spec`, `/test-plan`, `/test-cases`, `/test-strategy`, `/playwright`, `/api-test`, `/review`, `/flaky-triage`, `/ci-debug`, `/regression`, `/bug-report`, `/qa-report`, `/exploratory`, `/accessibility` — each one a thin pointer naming the skill(s) it applies plus command-specific input/output framing.

These aliases are optional sugar. The full skill names work identically and don't depend on the alias files existing:

> Use the api-contract-test-automation skill to design contract tests for this OpenAPI spec.

### Adding your own alias

```bash
cat > .kiro/steering/my-alias.md <<'EOF'
---
inclusion: manual
---
# /my-alias

One-sentence description of what this does.

Apply the `some-skill-name` skill.

## Usage

Input/output framing specific to this alias.
EOF
```

The frontmatter fence must be the very first content in the file — no blank line before it, or Kiro won't parse it as frontmatter.

## Agent personas

Kiro doesn't have a direct equivalent of Copilot's `*.agent.md` custom agents as of this writing. The persona files under `agents/` (`qa-automation-architect`, `test-suite-reviewer`, `flaky-test-detective`, `performance-test-engineer`) can still be used conversationally — paste the persona's framing into chat, or reference it: "Review this as the test-suite-reviewer persona would." If Kiro adds native custom-agent support, wire these in the same way `.github/agents/*.agent.md` does for Copilot (see [copilot-setup.md](copilot-setup.md)).

## If skills don't appear

1. Confirm the symlink resolved: `ls .kiro/skills` should list every directory under `skills/`. If it's broken (e.g. the repo was copied in a way that doesn't preserve symlinks), recreate it: `ln -s ../skills .kiro/skills` from the repo root.
2. Confirm `name` in a skill's frontmatter matches its directory name — `scripts/validate-skills.js` enforces this and will catch drift.
3. Restart the Kiro session — newly added skills aren't always picked up mid-conversation.

## Reference

Kiro's own docs: [kiro.dev/docs/skills](https://kiro.dev/docs/skills/) and [kiro.dev/docs/steering](https://kiro.dev/docs/steering/).
