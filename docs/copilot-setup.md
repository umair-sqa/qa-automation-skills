# Using qa-automation-skills with GitHub Copilot

This guide covers Copilot in VS Code (Copilot Chat's agent mode). It assumes you've cloned or opened this repo directly — if you want to use these skills from a *different* project, see [Using from another repo](#using-from-another-repo) below.

**What's already wired up:**

- `.github/skills` is a symlink to the root `skills/` directory, so every skill here is discoverable by Copilot with no copying step.
- `.github/agents/*.agent.md` are symlinks to the persona files under `agents/` (renamed to the `*.agent.md` extension Copilot requires — files named plain `*.md` are silently ignored).
- `.github/copilot-instructions.md` gives a condensed fallback summary for surfaces that don't load skills.
- `.github/prompts/*.prompt.md` mirror the `.claude/commands/` short aliases (`/spec`, `/api-test`, `/flaky-triage`, etc.).

This doc is about how to use what's already committed, plus how to pull these skills into a separate project.

## Skill discovery

Run `/skills` in Copilot Chat to open the **Configure Skills** menu and confirm what got discovered from `.github/skills/`. Each skill becomes invokable by its frontmatter `name` — e.g. `/api-contract-test-automation`, `/flaky-test-diagnosis-and-triage`.

Natural language works too, in any Copilot surface whether or not slash commands show up:

> Use the test-strategy-and-risk-based-planning skill to scope testing for this feature.

## Agent personas

```
@qa-automation-architect   Review this test strategy document
@test-suite-reviewer       Review this PR's test coverage
@flaky-test-detective      Root-cause this intermittent failure
@performance-test-engineer Design a load test for this endpoint
```

These resolve via the `.github/agents/*.agent.md` symlinks to `agents/*.md`. If you add a new persona under `agents/`, symlink it the same way:

```bash
ln -s ../../agents/my-persona.md .github/agents/my-persona.agent.md
```

## Short aliases (`.github/prompts/`)

VS Code's [prompt files](https://code.visualstudio.com/docs/agent-customization/prompt-files) at `.github/prompts/<name>.prompt.md` each become a `/<name>` slash command. This repo ships all 14 aliases from `.claude/commands/`, regenerated with Copilot-compatible frontmatter (`description:` instead of a plain H1/body split) but identical guidance.

> The Agent Host surface does **not** read prompt files — there, use the full skill names instead (`/test-strategy-and-risk-based-planning`, not `/test-strategy`).

If you edit a `.claude/commands/*.md` file, regenerate its Copilot/Kiro counterparts rather than hand-editing three copies — they're meant to stay byte-for-byte equivalent in content:

```bash
f=".claude/commands/api-test.md"; name="api-test"
summary=$(sed -n '3p' "$f"); body=$(tail -n +5 "$f")
{ echo "---"; echo "description: $summary"; echo "---"; echo ""; printf '%s\n' "$body"; } > ".github/prompts/${name}.prompt.md"
```

## Using from another repo

If you want these skills available in a *different* project rather than working in this repo directly, Copilot supports `.github/skills`, `.claude/skills`, or `.agents/skills` in that project:

```bash
mkdir -p .github/skills
cp -r /path/to/qa-automation-skills/skills/* .github/skills/
mkdir -p .github/agents
for f in /path/to/qa-automation-skills/agents/*.md; do
  base=$(basename "$f" .md)
  cp "$f" ".github/agents/${base}.agent.md"
done
```

A copy (not a symlink) is usually right here, since the target repo won't have this repo's directory layout alongside it. See [Creating agent skills for GitHub Copilot](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-skills) and the VS Code [agent skills docs](https://code.visualstudio.com/docs/agent-customization/agent-skills) for the underlying mechanism.

## Custom Instructions (User Level)

For the handful of skills you reach for across every repo, not just this one: VS Code → Settings → GitHub Copilot → Custom Instructions, and paste in condensed guidance (see `.github/copilot-instructions.md` for the shape this repo uses).

## If skills don't appear

1. **Check the symlink resolved.** `ls .github/skills` should list every directory under `skills/`. A repo copy method that doesn't preserve symlinks will leave this empty — recreate with `ln -s ../skills .github/skills` from the repo root. On Windows, a plain `git clone` checks a symlink out as a text file containing the target path unless `git config core.symlinks true` is set (and Developer Mode or an elevated prompt is available) — if `.github/skills` is a file instead of a directory, that's why.
2. **Check the frontmatter.** `name` must be present and match the directory — `scripts/validate-skills.js` is the CI gate for this.
3. **Check the Configure Skills menu.** Run `/skills` and confirm the skill is enabled.
4. **Start a fresh session.** Newly added skills aren't always picked up mid-conversation.
5. **Check the host.** If `/api-contract-test-automation` works but `/api-test` doesn't, you're likely on the Agent Host, which doesn't read prompt files.
6. **Check versions.** VS Code (**Help → About**) and the Copilot Chat extension — skills-as-slash-commands support is recent.
