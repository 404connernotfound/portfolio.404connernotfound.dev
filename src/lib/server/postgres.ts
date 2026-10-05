import { Pool, types, type QueryResultRow } from 'pg';
import { runPostgresMigrations } from './migrations/runner';

const runtimeEnv = process.env;
const connectionString = runtimeEnv.DATABASE_URL?.trim();
const useSsl = runtimeEnv.PG_SSL === 'true';
const maxPoolSize = Number(runtimeEnv.PG_POOL_MAX ?? '10');

let pool: Pool | null = null;
let schemaReadyPromise: Promise<void> | null = null;

// Normalize int8/numeric counts to numbers for parity with SQLite call sites.
types.setTypeParser(20, (value) => Number(value));



export const isPostgresConfigured = () => Boolean(connectionString);

const getPool = () => {
	if (!connectionString) return null;
	if (!pool) {
		pool = new Pool({
			connectionString,
			ssl: useSsl ? { rejectUnauthorized: false } : undefined,
			max: Number.isFinite(maxPoolSize) ? maxPoolSize : 10,
		});
	}
	return pool;
};

export const ensurePostgresAppSchema = async () => {
	if (!isPostgresConfigured()) return false;
	if (!schemaReadyPromise) {
		schemaReadyPromise = (async () => {
			const activePool = getPool();
			if (!activePool) return;
			await runPostgresMigrations(activePool);
		})();
	}

	await schemaReadyPromise;
	return true;
};

export const ensureTelemetrySchema = ensurePostgresAppSchema;

export const queryPostgres = async <T extends QueryResultRow = QueryResultRow>(
	text: string,
	values: readonly unknown[] = [],
) => {
	const activePool = getPool();
	if (!activePool) {
		throw new Error('DATABASE_URL is not configured.');
	}
	const result = await activePool.query<T>(text, values as unknown[]);
	return result.rows;
};

export const executePostgres = async (text: string, values: readonly unknown[] = []) => {
	const activePool = getPool();
	if (!activePool) {
		throw new Error('DATABASE_URL is not configured.');
	}
	await activePool.query(text, values as unknown[]);
};

export const pingPostgres = async () => {
	if (!isPostgresConfigured()) {
		return { configured: false, ok: false };
	}

	try {
		const activePool = getPool();
		if (!activePool) return { configured: true, ok: false };
		await activePool.query('SELECT 1');
		return { configured: true, ok: true };
	} catch {
		return { configured: true, ok: false };
	}
};
