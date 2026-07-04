# Contributing

Pitch Signal uses a small TypeScript monorepo with strict package boundaries. Keep domain logic in `packages/core`, provider-specific transport code in a provider package, and application orchestration in `apps/api`.

## Local workflow

1. Create a focused branch from `main`.
2. Install the pinned toolchain with `npm ci`.
3. Copy `.env.example` to `.env` and start PostgreSQL with `docker compose up -d postgres`.
4. Make the smallest coherent change and add tests close to the affected code.
5. Run `npm run check` before opening a pull request.

Commits should explain one logical change. Pull requests should document user-visible behavior, validation, and any migration or quota impact.

## Engineering conventions

- Keep TypeScript strict and avoid unvalidated external data.
- Treat provider responses as untrusted input and parse them at the boundary.
- Use migrations for every schema change; never modify an applied migration.
- Keep statistical rules deterministic and cover threshold changes with tests.
- Do not log API keys, database credentials, or full provider response bodies.
