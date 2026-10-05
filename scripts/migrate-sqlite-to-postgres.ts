import Database from 'better-sqlite3';
import path from 'node:path';
import { Pool } from 'pg';
import { runPostgresMigrations } from '../src/lib/server/migrations/runner.ts';
import { inspectSqliteMigrationSource, migrateSqliteToPostgres } from '../src/lib/server/migrations/sqlite-transfer.ts';

async function main() {
	const connectionString = process.env.DATABASE_URL?.trim();
	if (!connectionString) throw new Error('DATABASE_URL must be set before running migration.');
	const dbPath = path.resolve(process.env.DB_PATH ?? 'data/portfolio.sqlite');
	const sqlite = new Database(dbPath, { readonly: true, fileMustExist: true });
	const pool = new Pool({ connectionString, ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
	try {
		inspectSqliteMigrationSource(sqlite);
		await runPostgresMigrations(pool);
		const counts = await migrateSqliteToPostgres(sqlite, pool);
		for (const [table, count] of Object.entries(counts)) console.log(`[ok] ${table} (${count} rows)`);
		console.log('SQLite to PostgreSQL migration complete.');
	} finally {
		sqlite.close();
		await pool.end();
	}
}

main().catch((error: unknown) => {
	console.error('Migration failed.', error);
	process.exitCode = 1;
});
