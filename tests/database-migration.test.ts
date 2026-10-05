import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { Pool, types } from 'pg';
import { postgresMigrations, runPostgresMigrations } from '../src/lib/server/migrations/runner';
import { inspectSqliteMigrationSource, migrateSqliteToPostgres, sqliteTableSpecs } from '../src/lib/server/migrations/sqlite-transfer';

const directory = mkdtempSync(path.join(tmpdir(), 'portfolio-migration-'));
// Application queries expose BIGINT IDs as numbers, matching SQLite's driver.
types.setTypeParser(20, Number);
process.env.DB_PATH = path.join(directory, 'source.sqlite');
process.env.DB_AUTO_SEED = 'true';
process.env.NODE_ENV = 'test';
const db = await import('../src/lib/server/db');
const sqlite = db.getDb();
type Column = { name: string; type: string; notnull: number; pk: number };

function readColumns(table: string): Column[] {
	return sqlite.prepare(`PRAGMA table_info(${table})`).all().map((value: unknown) => {
		if (typeof value !== 'object' || value === null || !('name' in value) || typeof value.name !== 'string'
			|| !('type' in value) || typeof value.type !== 'string'
			|| !('notnull' in value) || typeof value.notnull !== 'number'
			|| !('pk' in value) || typeof value.pk !== 'number') throw new Error('Invalid test schema.');
		return { name: value.name, type: value.type, notnull: value.notnull, pk: value.pk };
	});
}

const expectedRows = new Map<string, Record<string, unknown>[]>();
sqlite.transaction(() => {
	for (const spec of [...sqliteTableSpecs].reverse()) sqlite.prepare(`DELETE FROM ${spec.name}`).run();
	for (const spec of sqliteTableSpecs) {
		const columns = readColumns(spec.name);
		const rows: Record<string, unknown>[] = [];
		for (const id of spec.name === 'site_settings' ? [1] : [1, 2, 3]) {
			const row: Record<string, unknown> = {};
			for (const column of columns) {
				const values: Record<string, unknown> = {
					id, session_id: `session-${id}`, playset_id: id, ws_id: `socket-${id}`,
					rating: id === 1 ? 2 : 5, approved: id === 1 ? -1 : 1,
					actor_type: id === 1 ? 'visitor' : 'admin', source: id === 1 ? 'public' : 'server',
					references_json: JSON.stringify([{ label: 'Reference α', url: 'https://example.com/source' }]),
					payload: JSON.stringify({ meaningful: true, sequence: id }),
					lifecycle: 'ACTIVE', owner: 'Owner α', domain: 'Systems', version: 'v1.2.3',
					subsystems: 'Parser\nRuntime', trace: 'trace-123', status: 'pending',
					starts_at: `2027-01-0${id}T15:00:00.000Z`, visitor_timezone: 'America/Los_Angeles',
				};
				let value: unknown;
				if (column.name in values) value = values[column.name];
				else if (column.name.endsWith('_at')) value = '2026-10-05T21:00:00.000Z';
				else if (column.type.includes('INT')) value = ['draft', 'featured', 'public', 'enabled', 'external', 'maintenance_enabled'].includes(column.name) ? (id === 1 ? 0 : 1) : id + 20;
				else value = `${spec.name}-${column.name}-${id}-α`;
				if (id === 2 && column.notnull === 0 && column.pk === 0 && column.name !== 'ws_id') value = null;
				row[column.name] = value;
			}
			sqlite.prepare(`INSERT INTO ${spec.name} (${columns.map((column) => column.name).join(',')}) VALUES (${columns.map(() => '?').join(',')})`).run(...Object.values(row));
			rows.push(row);
		}
		expectedRows.set(spec.name, rows);
	}
})();

try {
	assert.equal(sqlite.pragma('foreign_keys', { simple: true }), 1);
	inspectSqliteMigrationSource(sqlite);
	sqlite.exec('ALTER TABLE work_items ADD COLUMN unsupported_future_field TEXT');
	assert.throws(() => inspectSqliteMigrationSource(sqlite), /unsupported_future_field/);
	sqlite.exec('ALTER TABLE work_items DROP COLUMN unsupported_future_field');
	sqlite.exec('ALTER TABLE work_items RENAME COLUMN trace TO omitted_trace');
	assert.throws(() => inspectSqliteMigrationSource(sqlite), /missing \[trace\]/);
	sqlite.exec('ALTER TABLE work_items RENAME COLUMN omitted_trace TO trace');
	sqlite.exec('CREATE TABLE unsupported_future_table (id INTEGER)');
	assert.throws(() => inspectSqliteMigrationSource(sqlite), /Unsupported SQLite table/);
	sqlite.exec('DROP TABLE unsupported_future_table');
	sqlite.exec('DROP TABLE stack_items');
	assert.throws(() => inspectSqliteMigrationSource(sqlite), /Required SQLite table stack_items is missing/);
	sqlite.exec('CREATE TABLE stack_items (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL, detail TEXT, category TEXT, sort INTEGER DEFAULT 0)');
	for (const row of expectedRows.get('stack_items') ?? []) {
		sqlite.prepare('INSERT INTO stack_items (id, label, detail, category, sort) VALUES (?, ?, ?, ?, ?)')
			.run(row.id, row.label, row.detail, row.category, row.sort);
	}
	assert.throws(() => sqlite.prepare("INSERT INTO tracking_events(type, created_at, actor_type, source) VALUES ('spoof', 'now', 'admin', 'public')").run(), /CHECK constraint/);
	console.log('SQLite migration schema and telemetry trust-boundary tests passed');

	const connectionString = process.env.TEST_DATABASE_URL;
	if (!connectionString) {
		if (process.env.CI) throw new Error('CI requires TEST_DATABASE_URL for migration integration tests.');
		console.log('PostgreSQL integration skipped: TEST_DATABASE_URL is not set.');
	} else {
		const schema = `migration_test_${randomUUID().replaceAll('-', '')}`;
		const control = new Pool({ connectionString });
		const pool = new Pool({ connectionString, options: `-c search_path=${schema}`, max: 3 });
		try {
			await control.query(`CREATE SCHEMA ${schema}`);
			await assert.rejects(runPostgresMigrations(pool, [{ id: '002', sql: '' }, { id: '001', sql: '' }]), /ordered/);
			await assert.rejects(runPostgresMigrations(pool, [{ id: '001', sql: '' }, { id: '001', sql: '' }]), /unique/);
			await assert.rejects(runPostgresMigrations(pool, [{
				id: '001_failing_test', sql: 'CREATE TABLE rollback_probe (id INTEGER); SELECT * FROM missing_table;',
			}]), /001_failing_test failed/);
			assert.equal((await pool.query("SELECT to_regclass('schema_migrations') AS state, to_regclass('rollback_probe') AS probe")).rows[0].state, null);
			assert.equal((await pool.query("SELECT to_regclass('rollback_probe') AS probe")).rows[0].probe, null);
			// Simulate an existing deployment missing historical metadata, preserving its row.
			await pool.query(`CREATE TABLE work_items (
				id BIGSERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL,
				long_description TEXT, highlights TEXT, role TEXT, tech TEXT, link TEXT,
				image_path TEXT, image_alt TEXT, featured INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0
			); INSERT INTO work_items(title, description) VALUES ('Existing row', 'Keep me')`);
			await Promise.all([runPostgresMigrations(pool), runPostgresMigrations(pool)]);
			assert.equal((await pool.query('SELECT title FROM work_items')).rows[0].title, 'Existing row');
			const firstState = (await pool.query('SELECT id, checksum, applied_at FROM schema_migrations ORDER BY id')).rows;
			await runPostgresMigrations(pool);
			assert.deepEqual((await pool.query('SELECT id, checksum, applied_at FROM schema_migrations ORDER BY id')).rows, firstState);
			assert.deepEqual(firstState.map((row) => row.id), postgresMigrations.map((migration) => migration.id));
			await pool.query("INSERT INTO schema_migrations (id, checksum) VALUES ('999_unknown', 'unknown')");
			await assert.rejects(runPostgresMigrations(pool), /Unknown applied migration 999_unknown/);
			await pool.query("DELETE FROM schema_migrations WHERE id = '999_unknown'");
			await pool.query("DELETE FROM schema_migrations WHERE id = '001_baseline'");
			await assert.rejects(runPostgresMigrations(pool), /must be a prefix/);
			await pool.query('INSERT INTO schema_migrations (id, checksum, applied_at) VALUES ($1, $2, $3)', [
				firstState[0].id, firstState[0].checksum, firstState[0].applied_at,
			]);
			await assert.rejects(runPostgresMigrations(pool, [{ ...postgresMigrations[0], sql: 'SELECT 1' }, ...postgresMigrations.slice(1)]), /modified/);
			await assert.rejects(runPostgresMigrations(pool, [...postgresMigrations, {
				id: '999_failing_test', sql: 'CREATE TABLE rollback_probe (id INTEGER); SELECT * FROM missing_table;',
			}]), /999_failing_test failed/);
			assert.equal((await pool.query("SELECT to_regclass('rollback_probe') AS probe")).rows[0].probe, null);
			assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM schema_migrations')).rows[0].count, postgresMigrations.length);
			const counts = await migrateSqliteToPostgres(sqlite, pool);
			for (const spec of sqliteTableSpecs) {
				const columns = readColumns(spec.name).map((column) => column.name);
				const destinationColumns = (await pool.query<{ column_name: string }>('SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2', [schema, spec.name])).rows.map((row) => row.column_name);
				assert.deepEqual([...destinationColumns].sort(), [...columns].sort(), `${spec.name} schema parity`);
				const destinationNullability = (await pool.query<{ column_name: string; is_nullable: string }>(
					'SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2', [schema, spec.name],
				)).rows;
				for (const column of readColumns(spec.name)) {
					assert.equal(destinationNullability.find((destination) => destination.column_name === column.name)?.is_nullable,
						column.notnull || column.pk ? 'NO' : 'YES', `${spec.name}.${column.name} nullability parity`);
				}
				const rows = (await pool.query(`SELECT ${columns.join(',')} FROM ${spec.name} ORDER BY id`)).rows;
				assert.equal(counts[spec.name], expectedRows.get(spec.name)?.length);
				assert.deepEqual(rows, expectedRows.get(spec.name), `${spec.name} every field and row preserved`);
			}
			// Conflict reruns are idempotent and explicit-ID imports reset generated IDs.
			await migrateSqliteToPostgres(sqlite, pool);
			assert.equal((await pool.query("INSERT INTO crisis_items(title, created_at) VALUES ('next', 'now') RETURNING id")).rows[0].id, 4);
			await assert.rejects(pool.query("INSERT INTO tracking_events(type, created_at, actor_type, source) VALUES ('spoof', 'now', 'admin', 'public')"), /tracking_events_trust_boundary/);
			// Pre-remediation telemetry is deliberately imported as visitor/legacy.
			const legacyPath = path.join(directory, 'legacy.sqlite');
			await sqlite.backup(legacyPath);
			const legacySqlite = new Database(legacyPath);
			try {
				legacySqlite.exec('ALTER TABLE tracking_events DROP COLUMN source; ALTER TABLE tracking_events DROP COLUMN actor_type');
				await migrateSqliteToPostgres(legacySqlite, pool);
				assert.deepEqual((await pool.query('SELECT actor_type, source FROM tracking_events ORDER BY id')).rows, [
					{ actor_type: 'visitor', source: 'legacy' }, { actor_type: 'visitor', source: 'legacy' }, { actor_type: 'visitor', source: 'legacy' },
				]);
			} finally {
				legacySqlite.close();
			}
			await migrateSqliteToPostgres(sqlite, pool);
			// A late FK error must roll back already imported parent rows.
			sqlite.pragma('foreign_keys = OFF');
			sqlite.prepare("UPDATE work_items SET title = 'rollback marker' WHERE id = 1").run();
			sqlite.prepare('UPDATE playground_logs SET session_id = ? WHERE id = 1').run('missing-session');
			await assert.rejects(migrateSqliteToPostgres(sqlite, pool), /foreign key constraint/);
			assert.equal((await pool.query('SELECT title FROM work_items WHERE id = 1')).rows[0].title, expectedRows.get('work_items')?.[0].title);
			console.log('PostgreSQL migration parity, compatibility, ordering, idempotency and rollback tests passed');
		} finally {
			await pool.end();
			await control.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
			await control.end();
		}
	}
} finally {
	sqlite.close();
	rmSync(directory, { recursive: true, force: true });
}
