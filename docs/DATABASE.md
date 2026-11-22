# Database setup and verification

Current local evidence: native PostgreSQL 17.11, 12 database tests and 31 application tests. Hosted Supabase Auth/deployment verification is separate. See [ADR 002](adr/002-postgres-studio-data.md) for permissions, boundaries and the ERD.

## This Windows workspace

The official EDB portable archive was downloaded through the PostgreSQL download page into ignored `work/tools/`. No Windows service, system-wide installation or external database account was created.

- Source: `https://get.enterprisedb.com/postgresql/postgresql-17.11-5-windows-x64-binaries.zip`
- SHA-256 observed: `80379b2c04d51c30225532e0ae04509899141e9957ed096fe749d7fd9df8f82f`
- Binary: `work/tools/postgresql-17.11/pgsql/bin/postgres.exe`
- Isolated cluster: `work/database/cluster`; loopback port 55432.
- Test-controller credentials: ignored `work/database/.env`.
- Restricted development API credentials: ignored `work/database/api.env`.

The observed hash records the downloaded artifact; it is not represented as an independently published vendor checksum. Use the official archive/source and verify the executable version when reproducing setup. Downloaded executables and database files are never committed.

```powershell
./scripts/start-local-postgres.ps1
npm run db:local:setup
npm run dev:api
# In another terminal:
npm run dev -- --host localhost --port 5175 --strictPort
```

`db:local:setup` accepts only the isolated loopback controller account created by the helper. It creates `chakra_development`, applies migrations, seeds the initial public catalogue without overwriting edits, and provisions a restricted runtime login. It does not import the original customer archive. Re-running setup preserves its existing API environment.

`dev:api` loads the ignored local API environment, then optional root `.env` overrides. Leave `DATABASE_URL` absent/commented in root `.env` when using the generated local connection. Production `start:api` never loads the `work` environment.

To stop the project-local database deliberately:

```powershell
./scripts/stop-local-postgres.ps1
```

## Linux and macOS

`scripts/start-local-postgres.sh` and `scripts/stop-local-postgres.sh` create and manage the same isolated cluster: `work/database/cluster`, the `chakra_test_admin` controller with SCRAM authentication, loopback port 55432 and ignored `work/database/.env`. They use `--bin-dir`/`PG_BIN` when given, otherwise `/opt/pg17/bin` if present, otherwise the `pg_ctl` on `PATH`; `--port`/`PG_PORT` changes the port. The start script warns if the server is not PostgreSQL 17 and refuses to replace an existing `.env` whose cluster is missing.

PostgreSQL will not run as root. When a script is started as root (for example in a container) the server runs as the `postgres` system user, or the user named in `PG_RUN_AS`; that user must be able to reach the project folder.

```sh
scripts/start-local-postgres.sh
npm run db:local:setup
npm run dev:api
# In another terminal:
npm run dev -- --host localhost --port 5175 --strictPort
# Later:
scripts/stop-local-postgres.sh
```

## Tests and a fresh checkout

```sh
npm ci
npm run contracts:check
npm run typecheck
npm test
npm run test:db
npm run format:check
npm run build
```

`test:db` requires an explicitly configured local `TEST_DATABASE_URL`, either from the shell or ignored `work/database/.env`. It fails instead of silently skipping database tests. The controller needs local create-database/create-role privileges because each run creates an isolated database and restricted login; the API does not receive those credentials. A fresh checkout can use a local PostgreSQL 17 instance, or the pinned PostgreSQL service defined in `.github/workflows/verify.yml`. Its plain-Postgres bootstrap is only a database-facing Auth fixture, not a production authentication service.

The suite checks migrations/history/rollback, seed idempotence, constraints, RLS and grants, MFA/allowlist context, pooled identity reset, transactional audits, concurrent imports and the real API repository. Its synthetic SQLite fixture is hashed before and after the preview/import command; timestamps retain PostgreSQL microseconds. It does not inspect the real archive.

CI also has a pinned CodeQL workflow. Remote runs, repository feature availability and branch protection still need verification when the code is pushed. A YAML file is not a scan result.

## Hosted migration and runtime configuration

Supply separate server-side connections; never use `VITE_` variables:

- `MIGRATION_DATABASE_URL`: privileged migration connection, direct or session mode. The script rejects the common transaction-pooler port 6543; operators must also choose the correct provider mode.
- `DATABASE_URL`: restricted NOINHERIT runtime login, member of `chakra_runtime`, without superuser, BYPASSRLS, role/database creation or replication rights.
- `DATABASE_POOL_MAX`: 1–10, default 4 per API instance. Budget this across replicas against provider limits.
- `DATABASE_CA_CERT_FILE`: optional trusted certificate file. Remote TLS verification is always enabled; put no SSL override options in the URL.

The migration creates `catalog`, `studio`, `chakra_meta` and a NOLOGIN runtime membership role. Supabase already supplies `anon`, `authenticated`, `auth.users`, `auth.uid()` and `auth.jwt()`. **Do not run `tests/database/bootstrap.sql` on a managed project.** No existing `public.bookings` table is altered by the new migrations.

```sh
npm run db:migrate
# Optional, deliberate first catalogue import:
npm run db:migrate -- --seed-catalogue
```

Seeding is an explicit operation, preserves existing IDs/edits and does not invent a tarot price. Once a migration is applied, add a new migration instead of editing it. The runner refuses changed historical SQL. Startup validates the runtime role; a configured catalogue query failure gives a controlled 503 rather than silently inventing live data.

Production runtime login passwords, owner invitations/allowlist entries, actual Auth/MFA verification, backup/restore drills and hosted connection behaviour remain later gates. The public API currently has no private consultation/admin endpoint.

## Legacy archive migration

Keep any original SQLite file/private `public.bookings` table and its access-controlled backup intact. The tool supports the existing SQLite file and the private `public.bookings` table on the migration connection. Live execution still needs deliberate backup and reconciliation.

```sh
# Preview validation only. No target connection needed; the source opens read-only.
npm run db:import-legacy -- --source /absolute/path/to/archive.sqlite --source-key original_sqlite
# Apply only to the intended private migration database:
npm run db:import-legacy -- --source /absolute/path/to/archive.sqlite --source-key original_sqlite --apply
```

For the retained PostgreSQL/Supabase table, use `--from-postgres --source-key original_supabase` in place of `--source /path/to/archive.sqlite`, first as a preview and then with `--apply`. It reads a fixed private table and preserves microseconds; it never updates or deletes source rows.

Use a stable source key on retries. Each old reference maps to one private consultation with its original status and content hash. Identical retries are unchanged; changed content fails atomically. Unknown consent/payment states remain unknown/unrecorded, and original timestamps are retained. Validation failures preserve the source. Never print/export customer rows into logs or fixtures. Reconcile source count, imported/unchanged totals and private mapping rows before considering any later archive retirement. This milestone does not authorize or perform archive deletion.
