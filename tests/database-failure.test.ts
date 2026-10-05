import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Reserve a local ephemeral port, then close it to exercise a real connection
// failure without connecting to or modifying any developer database.
const listener = createServer();
await new Promise<void>((resolve, reject) => {
	listener.once('error', reject);
	listener.listen(0, '127.0.0.1', resolve);
});
const address = listener.address();
if (!address || typeof address === 'string') throw new Error('Expected a local TCP port.');
const port = address.port;
await new Promise<void>((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));

const directory = mkdtempSync(path.join(tmpdir(), 'portfolio-database-failure-'));
const sqlitePath = path.join(directory, 'unexpected-fallback.sqlite');
process.env.DATABASE_URL = `postgres://test:test@127.0.0.1:${port}/test`;
process.env.DB_PATH = sqlitePath;
process.env.DB_AUTO_SEED = 'true';
process.env.REDIS_URL = '';
process.env.NODE_ENV = 'test';

const connectionRefused = (error: unknown) => typeof error === 'object' && error !== null &&
	'code' in error && error.code === 'ECONNREFUSED';

try {
	const postgres = await import('../src/lib/server/postgres');
	const data = await import('../src/lib/server/dataStore');
	const telemetry = await import('../src/lib/server/telemetryStore');
	await assert.rejects(postgres.ensurePostgresAppSchema(), connectionRefused);
	await assert.rejects(data.getSiteSettings(), connectionRefused);
	await assert.rejects(data.createStackItem('Must not write SQLite', null, null, 0), connectionRefused);
	await assert.rejects(telemetry.createInboundMessage('contact', 'Visitor', 'visitor@example.com', 'Message', null, null), connectionRefused);
	await assert.rejects(telemetry.createTrackingEvent('pageview', null, '/', null, null, null, null), connectionRefused);
	assert.equal(existsSync(sqlitePath), false, 'Configured PostgreSQL failure must never open a SQLite fallback');
	assert.deepEqual(await postgres.pingPostgres(), { configured: true, ok: false });
	console.log('Configured PostgreSQL startup/read/write/telemetry failures propagate without SQLite fallback');
} finally {
	rmSync(directory, { recursive: true, force: true });
}
