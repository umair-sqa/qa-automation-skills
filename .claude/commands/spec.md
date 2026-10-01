# /spec

Analyze a requirement, ticket, or user story and turn it into testable acceptance criteria.

Apply the `requirements-and-acceptance-criteria-analysis` skill.

## Usage

Expects a requirement, ticket description, or feature summary as input — paste it in or point at the ticket. The command should surface ambiguity, missing edge cases, and undefined behavior before any test gets written, then produce a structured list of testable acceptance criteria (and open questions that still need an answer from a human).

Do not invent behavior to fill gaps — if the requirement is genuinely ambiguous, ask a clarifying question instead of guessing. This is the upstream step that `/test-cases` and `/test-plan` consume; don't skip straight to test generation.
