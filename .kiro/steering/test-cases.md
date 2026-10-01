---
inclusion: manual
---
# /test-cases

Generate structured test scenarios from already-clarified acceptance criteria.

Apply the `test-case-design-techniques` skill.

## Usage

Expects acceptance criteria that are already unambiguous (ideally the output of `/spec`) — this command designs test cases, it does not resolve requirement ambiguity. Output should be a structured set of scenarios grouped as positive, negative, and boundary cases, using techniques like equivalence partitioning and decision tables where they add coverage.

If the input criteria are still vague, stop and route back to `/spec` rather than guessing at intended behavior.
