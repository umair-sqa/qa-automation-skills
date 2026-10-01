# /api-test

Design and automate API test scenarios for a REST/GraphQL/gRPC endpoint or contract.

Apply the `api-contract-test-automation` skill.

## Usage

Expects an API spec (OpenAPI/schema/GraphQL SDL), an endpoint description, or an existing contract as input. Output should cover schema/contract validation, auth and authorization paths (including negative cases — expired token, wrong scope), and error-path behavior (4xx/5xx, malformed payloads), not just the happy path.

Prefer contract-driven assertions (schema conformance) over hardcoded field-by-field checks where the contract already defines the shape.
