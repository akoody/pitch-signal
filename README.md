<p align="right"><a href="README.md">Русский</a> | <a href="README.en.md">English</a></p>

<p align="center">
  <img src="docs/logo.svg" width="480" alt="Pitch Signal">
</p>

<p align="center">
  <a href="https://github.com/akoody/pitch-signal/actions/workflows/ci.yml"><img src="https://github.com/akoody/pitch-signal/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-65d487.svg" alt="Лицензия MIT"></a>
</p>

# Pitch Signal

Pitch Signal анализирует недавние футбольные матчи и показывает статистику угловых, карточек, фолов, ударов, владения мячом, офсайдов и голов по таймам. В отчёте приведены история матчей и размер выборки.

## Стек

- TypeScript, Node.js, Fastify, PostgreSQL
- React и Vite
- Данные Footballdata.io

## Структура

| Путь | Назначение |
| --- | --- |
| `apps/api` | HTTP API, синхронизация, работа с базой данных и миграции |
| `apps/web` | Русскоязычный интерфейс отчётов |
| `packages/core` | Доменные типы, статистика и анализ трендов |
| `packages/provider-footballdata-io` | Клиент Footballdata.io и преобразование ответов |
| `packages/provider-api-football` | Клиент API-Football и преобразование ответов |

## Локальный запуск

Требуются Node.js 20.19+, npm 11.6.2+ и Docker Compose.

```bash
cp .env.example .env
npm ci
docker compose up -d postgres
npm run demo:seed
npm run dev
```

Откройте [http://localhost:5173](http://localhost:5173) и выберите дату, которую вывела команда заполнения демо-данными. API доступен на `http://localhost:4100`.

Для синхронизации реальных матчей укажите `FOOTBALLDATA_IO_KEY` в `.env` и запустите:

```bash
npm run morning
```

Синхронизация за указанную дату и просмотр квоты:

```bash
npm run morning -- 2026-07-04
npm run quota
```

## API

| Маршрут | Описание |
| --- | --- |
| `GET /health` | Проверка доступности процесса |
| `GET /ready` | Проверка подключения к базе данных |
| `GET /api/v1/report?date=YYYY-MM-DD` | Дневной отчёт |
| `GET /api/v1/sync/latest` | Статус последней синхронизации |

## Разработка

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Миграции базы данных находятся в `apps/api/migrations`. Переменные окружения описаны в `.env.example`.

## Лицензия

MIT. См. [LICENSE](LICENSE).
