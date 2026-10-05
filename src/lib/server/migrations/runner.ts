import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { baselineSql } from './001-baseline';
import { trackingActorsSql } from './002-tracking-actors';
import { sqliteNullabilitySql } from './003-sqlite-nullability';

export type PostgresMigration = Readonly<{ id: string; sql: string }>;

export const postgresMigrations: readonly PostgresMigration[] = [
	{ id: '001_baseline', sql: baselineSql },
	{ id: '002_tracking_actors', sql: trackingActorsSql },
	{ id: '003_sqlite_nullability', sql: sqliteNullabilitySql },
];

export async function runPostgresMigrations(
	pool: Pool,
	migrations: readonly PostgresMigration[] = postgresMigrations,
) {
	const ids = migrations.map((migration) => migration.id);
	if (new Set(ids).size !== ids.length || ids.some((id, i) => i > 0 && id <= ids[i - 1])) {
		throw new Error('PostgreSQL migration identifiers must be unique and ordered.');
	}
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		// Serialize schema upgrades across application instances, releasing on commit/rollback.
		await client.query('SELECT pg_advisory_xact_lock(404, 1)');
		await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
			id TEXT PRIMARY KEY, checksum TEXT NOT NULL,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`);
		const applied = await client.query<{ id: string; checksum: string }>(
			'SELECT id, checksum FROM schema_migrations ORDER BY id',
		);
		for (const record of applied.rows) {
			if (!ids.includes(record.id)) throw new Error(`Unknown applied migration ${record.id}.`);
		}
		if (applied.rows.some((record, index) => record.id !== ids[index])) {
			throw new Error('Applied PostgreSQL migrations must be a prefix of the ordered migration list.');
		}
		for (const migration of migrations) {
			const checksum = createHash('sha256').update(migration.sql).digest('hex');
			const existing = applied.rows.find((record) => record.id === migration.id);
			if (existing) {
				if (existing.checksum !== checksum) {
					throw new Error(`Applied migration ${migration.id} was modified.`);
				}
				continue;
			}
			try {
				await client.query(migration.sql);
				await client.query('INSERT INTO schema_migrations (id, checksum) VALUES ($1, $2)', [
					migration.id, checksum,
				]);
			} catch (cause) {
				throw new Error(`PostgreSQL migration ${migration.id} failed.`, { cause });
			}
		}
		await client.query('COMMIT');
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}
