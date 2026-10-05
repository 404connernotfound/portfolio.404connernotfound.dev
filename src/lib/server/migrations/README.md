PostgreSQL schema changes use `runner.ts` and numbered, immutable migration modules.
The modules contain PostgreSQL SQL and are bundled with the application, so schema
initialization works in both the built server and the migration CLI.

`001_baseline` is the previously deployed schema initializer, including its safe
`IF NOT EXISTS` column additions and historical metadata backfills. On existing
databases it preserves tables and rows, fills the supported historical omissions,
then records the baseline. On fresh databases it creates the same schema. Existing
schemas that cannot accept the baseline fail startup with the migration identifier.
No existing database is assumed fresh, and no baseline is marked applied without
executing its compatibility SQL. Playground structures remain in the baseline.

`002_tracking_actors` separates public telemetry from server admin activity. Existing
events are visitor/legacy: historical browser claims are never elevated to trusted
administrative activity.

`003_sqlite_nullability` preserves SQLite's historically nullable ordering values
and integer flags in PostgreSQL. It drops only the mismatched `NOT NULL` constraints;
defaults and all stored values are retained. Transfers never replace a supported
NULL with a fabricated zero or silently skip the row.

The runner requires unique ascending IDs and an unbroken applied prefix, checks immutable SQL checksums, and
records IDs, checksums and UTC application timestamps in `schema_migrations`.
An advisory transaction lock serializes concurrent startup. Pending migrations
and their records commit together; an error rolls them back and fails startup.
Future changes require a new ordered migration rather than editing applied SQL.
Rollbacks use restored backups or a forward correction migration; automated down
migrations are deliberately outside this initial framework.

The SQLite transfer CLI preflights all supported tables and columns, rejects
missing or unknown source data fields, copies one source snapshot in a single
PostgreSQL transaction, and resets sequences. Upgrade older SQLite schemas with
the application's SQLite migrations before transfer. Legacy tracking sources
without actor columns are explicitly imported as visitor/legacy. Schema migration
records and SQLite sequence bookkeeping are engine-specific and are not copied.
Configured PostgreSQL failures propagate instead of silently writing SQLite.

Run `npm test` with `TEST_DATABASE_URL` for real PostgreSQL integration coverage.
The test uses a unique temporary schema on that connection and a temporary SQLite
file; it never truncates, overwrites or deletes existing application schemas/data.
CI requires the test connection. Without it, local SQLite checks run and the test
reports the PostgreSQL integration skip explicitly.
