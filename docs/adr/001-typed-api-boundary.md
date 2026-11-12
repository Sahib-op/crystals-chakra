# ADR 001: preserve the UI, introduce a typed modular API

Date: 7 November 2026. Status: accepted for the first catalogue slice; PostgreSQL and owner modules follow separately.

## Context

The studio takes paid-reading enquiries directly in WhatsApp. The existing React/Vite interface already has an approved royal identity and interactive tools. Replacing its framework while changing business operations would add risk without improving that customer journey. The small native HTTP scaffold has reached the point where hand-maintained routing, errors, contracts, logging and lifecycle handling would multiply as private studio and commerce modules are added.

## Decision

Keep React/Vite and migrate feature boundaries incrementally to strict TypeScript. Use Fastify 5 with schema-driven route modules, TypeBox contracts and generated OpenAPI. Do not build microservices for this business. Native Node 24 executes erasable TypeScript; the separate type-check command is required because runtime type stripping does not type-check code.

The first strict slice spans the shared reading contract/catalogue, API route and browser catalogue loader. Existing JS UI modules remain JS. A compatibility re-export keeps their imports stable. This is not a claim that every legacy file is typed.

Generate the browser validator ahead of time using Ajv standalone ESM, from the same public schema used by Fastify. Include the pinned official Unicode-length helper in generated output and retain its MIT licence. The browser gets a small plain validator, not the TypeBox/Ajv packages, a runtime compiler or `eval`. `contracts:check` rejects stale generated output. Unique reading IDs are a catalogue-level invariant checked in addition to the structural schema.

Separate startup, validated configuration, the app factory, reading routes and the commerce adapter boundary. Application tests use both actual local HTTP requests and Fastify injection. Startup handles termination by closing Fastify with a bounded shutdown deadline. Database/provider cleanup hooks will be added when those modules acquire resources.

## Security and operational boundaries

- Reject malformed/oversized/non-JSON input and schema coercion; unknown checkout fields are errors.
- Generate request UUIDs on the server. Ignore incoming request IDs and forwarded addresses.
- Emit predictable error codes and a request ID; suppress raw exception/provider details.
- Log route templates, status and duration. Never log raw URLs, query strings, bodies, auth/cookie headers or provider exception messages. Synthetic secret tests enforce this.
- Use exact frontend origins, HTTPS for the production origin, explicit listen addresses and paired provider configuration. Error text does not reflect supplied secrets.
- Keep proxy trust disabled. Rate-limit entries are bounded locally; distributed/edge enforcement and the actual production proxy chain remain release work.
- Keep retired public personal-data routes returning 410 before parsing bodies. Do not instantiate the legacy archive adapter.

## Consequences and limits

This adds dependencies with a specific purpose, pinned in the manifest/lockfile and checked by audit/CI. Generated contracts create a regeneration obligation. CI uses read-only repository permissions, pinned action revisions and reproducible installs; those checks have only been exercised locally until pushed.

OpenAPI currently gives a full reading response and checkout input/error contract. The existing product adapter remains an untyped provider boundary; comprehensive variant/cart/provider schemas are M4. PostgreSQL migrations, real database role/transaction tests and invited owner operations remain M2/M3. No private resource has been made public by this migration.

Build comparison: the app bundle moved from approximately 130.05 KB gzip after M1 to 132.01 KB after adding the generated validator. These are build sizes, not measured mobile loading/interactivity scores. The 3D cost and prerendering remain later work.

## Primary references

- [Fastify type providers](https://fastify.dev/docs/latest/Reference/Type-Providers/) and [the official TypeBox provider](https://github.com/fastify/fastify-type-provider-typebox): request/response type inference from runtime schemas.
- [Fastify logging](https://fastify.dev/docs/latest/Reference/Logging/): request identifiers, serializers and redaction. Local installed 5.12.8 documentation supplies the newer LogController API.
- [Node TypeScript support](https://nodejs.org/docs/latest-v24.x/api/typescript.html): erasable syntax, explicit extensions and independent checking.
- [Ajv standalone validators](https://ajv.js.org/standalone.html): build-time validation code and browser compiler avoidance.
- [Fastify Swagger](https://github.com/fastify/fastify-swagger): generated OpenAPI from registered routes.
