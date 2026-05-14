# ShopHub backend

NestJS API for the ShopHub platform: authentication, shop CRUD, and the Kubernetes client that applies `Shop`, `DiscordChannel`, and `Wallet` custom resources on behalf of signed-in users.

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Language | TypeScript |
| Framework | NestJS 11 |
| Database | PostgreSQL via TypeORM |
| Tests | Jest (unit + e2e) + Testcontainers (integration) |

## Local development

All commands assume the `dev-ops` conda env is active so Node 20 is on `PATH`:

```bash
conda activate dev-ops
```

### Running the stack

The full stack (backend + frontend + Postgres) is orchestrated by `docker-compose.yml` at the repo root. From the repo root:

```bash
make up      # docker compose up -d --build
make down    # docker compose down (keeps the postgres-data volume)
```

By default the backend listens on `http://localhost:8080`, the frontend on `http://localhost:3000`, and Postgres on `localhost:5432` (override any of these via `.env`).

### Database connection

The backend reads `DATABASE_URL` from the environment and registers a TypeORM connection via `DatabaseModule`. When `DATABASE_URL` is unset, `DatabaseModule` mounts in no-op mode and emits a warning - this keeps unit and e2e tests runnable without a live database.

`docker-compose.yml` sets `DATABASE_URL=postgres://shophub:changeme@postgres:5432/shophub` for the backend container automatically.

### Migrations

TypeORM migrations live in `src/database/migrations/`. The migration history is tracked in the `shophub_migrations` table.

```bash
# Apply all pending migrations against $DATABASE_URL
npm run migration:run

# Revert the most recently applied migration
npm run migration:revert

# Generate a new migration from current entities vs the database schema
npm run migration:generate -- src/database/migrations/<MigrationName>
```

When running against the local docker-compose Postgres on the host, set `DATABASE_URL` to match the host port:

```bash
DATABASE_URL="postgres://shophub:changeme@localhost:5432/shophub" npm run migration:run
```

### Tests

```bash
npm test            # unit tests
npm run test:e2e    # HTTP end-to-end tests
npm run test:int    # integration tests (spins up Postgres via Testcontainers)
npm run test:all    # all three suites in sequence
```

From the repo root, `make test` is the convenience entrypoint that runs `test:all` inside `backend/`.

## Project layout

```
src/
  app.controller.ts     # root + /health endpoints
  app.module.ts         # wires DatabaseModule and feature modules
  database/
    data-source.ts      # TypeORM DataSource for the migration CLI
    database.module.ts  # NestJS module that wraps the runtime connection
    migrations/         # ordered, hand-written migrations
test/
  app.e2e-spec.ts                       # HTTP e2e tests
  integration/database.int-spec.ts      # Testcontainers integration tests
```
