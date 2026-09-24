<p align="right"><a href="README.md">Русский</a> | <a href="README.en.md">English</a></p>

<p align="center">
  <img src="docs/logo.svg" width="480" alt="Pitch Signal">
</p>

<p align="center">
  <a href="https://github.com/akoody/pitch-signal/actions/workflows/ci.yml"><img src="https://github.com/akoody/pitch-signal/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-65d487.svg" alt="MIT license"></a>
</p>

# Pitch Signal

Pitch Signal analyzes recent football matches and reports trends in corners, cards, fouls, shots, possession, offsides, and goals by half. Reports include match history and sample size.

## Stack

- TypeScript, Node.js, Fastify, PostgreSQL
- React and Vite
- Footballdata.io data provider

## Structure

| Path | Purpose |
| --- | --- |
| `apps/api` | HTTP API, synchronization, database access, and migrations |
| `apps/web` | Russian-language report interface |
| `packages/core` | Domain types, statistics, and trend analysis |
| `packages/provider-footballdata-io` | Footballdata.io client and response mapping |
| `packages/provider-api-football` | API-Football client and response mapping |

## Run locally

Requirements: Node.js 20.19+, npm 11.6.2+, and Docker Compose.

```bash
cp .env.example .env
npm ci
docker compose up -d postgres
npm run demo:seed
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and select the date printed by the seed command. The API is available at `http://localhost:4100`.

To sync real fixtures, set `FOOTBALLDATA_IO_KEY` in `.env` and run:

```bash
npm run morning
```

To sync a specific date or check the quota:

```bash
npm run morning -- 2026-07-04
npm run quota
```

## API

| Endpoint | Description |
| --- | --- |
| `GET /health` | Process liveness |
| `GET /ready` | Database readiness |
| `GET /api/v1/report?date=YYYY-MM-DD` | Daily report |
| `GET /api/v1/sync/latest` | Latest sync status |

## Development

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Database migrations are in `apps/api/migrations`. Environment variables are documented in `.env.example`.

## License

MIT. See [LICENSE](LICENSE).
