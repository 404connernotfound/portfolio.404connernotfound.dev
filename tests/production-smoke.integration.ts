import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { Pool } from 'pg';
import { createClient } from 'redis';

const stopServer = async (child: ChildProcess) => {
	if (child.exitCode !== null || child.signalCode !== null) return;
	child.kill('SIGTERM');
	try { await once(child, 'exit', { signal: AbortSignal.timeout(3000) }); }
	catch {
		child.kill('SIGKILL');
		await once(child, 'exit');
	}
};

test('built production app: health, maintenance, cookies, replay, telemetry and PDF headers', { timeout: 60_000 }, async () => {
	const connectionString = process.env.TEST_DATABASE_URL;
	const redisUrl = process.env.TEST_REDIS_URL;
	assert.ok(connectionString && redisUrl, 'Production integration requires dedicated TEST_DATABASE_URL and TEST_REDIS_URL.');
	const schema = `production_smoke_${randomUUID().replaceAll('-', '')}`;
	const prefix = `${schema}:`;
	const directory = mkdtempSync(path.join(tmpdir(), 'portfolio-production-'));
	const database = new Pool({ connectionString });
	const redis = createClient({ url: redisUrl });
	redis.on('error', (error) => console.error('[production test redis]', error));
	await redis.connect();
	await database.query(`CREATE SCHEMA ${schema}`);
	const databaseUrl = new URL(connectionString);
	databaseUrl.searchParams.set('options', `-c search_path=${schema}`);
	const listener = createServer();
	listener.listen(0, '127.0.0.1');
	await once(listener, 'listening');
	const address = listener.address();
	assert.ok(address && typeof address !== 'string');
	const port = address.port;
	await new Promise<void>((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
	const origin = `http://127.0.0.1:${port}`;
	const password = randomUUID();
	const app = spawn(process.execPath, ['scripts/start-server.mjs'], {
		env: { ...process.env, NODE_ENV: 'production', HOST: '127.0.0.1', PORT: String(port), ORIGIN: origin,
			DATABASE_URL: databaseUrl.toString(), REDIS_URL: redisUrl, REDIS_PREFIX: prefix,
			DB_PATH: path.join(directory, 'fallback.sqlite'), DB_AUTO_SEED: 'true',
			ADMIN_EMAIL: 'smoke@example.test', ADMIN_PASSWORD: password, ADMIN_SESSION_SECRET: randomUUID(),
			ADMIN_SESSION_VERSION: 'smoke', HEALTHZ_VERBOSE: 'false', ADDRESS_HEADER: '', XFF_DEPTH: '',
			PROTOCOL_HEADER: '', HOST_HEADER: '', PORT_HEADER: '', SHUTDOWN_TIMEOUT: '1' },
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	let output = '';
	app.stdout.on('data', (data: Buffer) => { output = (output + data.toString()).slice(-10_000); });
	app.stderr.on('data', (data: Buffer) => { output = (output + data.toString()).slice(-10_000); });
	const cookies = new Map<string, string>();
	const request = async (pathname: string, options: RequestInit = {}, cookieOverride?: string) => {
		const headers = new Headers(options.headers);
		if (!headers.has('accept')) headers.set('accept', 'text/html');
		headers.set('cookie', cookieOverride ?? [...cookies].map(([name, value]) => `${name}=${value}`).join('; '));
		if (options.method === 'POST') headers.set('origin', origin);
		const response = await fetch(`${origin}${pathname}`, { ...options, headers, redirect: 'manual', signal: AbortSignal.timeout(5000) });
		if (cookieOverride === undefined) for (const cookie of response.headers.getSetCookie()) {
			const pair = cookie.split(';')[0];
			const equals = pair.indexOf('=');
			if (/max-age=0/i.test(cookie)) cookies.delete(pair.slice(0, equals));
			else cookies.set(pair.slice(0, equals), pair.slice(equals + 1));
		}
		return response;
	};
	try {
		let ready = false;
		for (let attempt = 0; attempt < 100; attempt++) {
			assert.equal(app.exitCode, null, output);
			try { const response = await request('/healthz'); ready = response.status === 200; await response.text(); }
			catch { /* The listener may not yet be open; retry within this bounded startup window. */ }
			if (ready) break;
			await delay(100);
		}
		assert.ok(ready, `Production server did not become healthy: ${output}`);
		assert.equal((await request('/')).status, 200);
		for (const pathname of ['/admin', '/%73ubscribe', '/%63ollaborate']) {
			assert.equal((await request(pathname)).status, 303, `Protected production route: ${pathname}`);
		}
		for (const pathname of ['/subscribe/__data.json', '/%73ubscribe/__data.json']) {
			const response = await request(pathname);
			// SvelteKit carries data-request redirects in a 200 JSON envelope.
			const result: unknown = await response.json();
			assert.ok(typeof result === 'object' && result !== null && 'type' in result && 'location' in result);
			assert.equal(result.type, 'redirect');
			assert.ok(typeof result.location === 'string');
			assert.match(result.location, /^\/admin\/login\?/);
		}
		const pdf = await request('/uploads/resume/resume.pdf', { method: 'HEAD' });
		assert.equal(pdf.status, 200);
		assert.match(pdf.headers.get('content-type') ?? '', /^application\/pdf(?:;|$)/);
		assert.equal(pdf.headers.get('x-content-type-options'), 'nosniff');
		await request('/admin/login');
		const credentials = new URLSearchParams({ email: 'smoke@example.test', password, csrfToken: cookies.get('csrf_token') ?? '' });
		const login = await request('/admin/login', { method: 'POST', body: credentials });
		assert.equal(login.status, 303, await login.text());
		const adminCookie = login.headers.getSetCookie().find((cookie) => cookie.startsWith('admin_session='));
		assert.ok(adminCookie);
		for (const attribute of [/HttpOnly/i, /Secure/i, /SameSite=Strict/i, /Max-Age=86400/i]) assert.match(adminCookie, attribute);
		const copiedCookie = `admin_session=${cookies.get('admin_session')}`;
		assert.equal((await request('/admin')).status, 200);
		const invalidLogout = await request('/admin?/logout', { method: 'POST', body: new URLSearchParams({ csrfToken: 'invalid' }) });
		assert.equal(invalidLogout.status, 403);
		assert.equal((await request('/admin')).status, 200, 'CSRF failure must not revoke the session');
		const visitor = await request('/tracking/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'pageview', name: 'pageview', path: '/' }) }, '');
		assert.equal(visitor.status, 204, await visitor.text());
		const spoof = await request('/tracking/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'admin_audit', name: 'login', path: '/', actorType: 'admin' }) }, '');
		assert.equal(spoof.status, 400);
		await database.query(`UPDATE ${schema}.site_settings SET maintenance_enabled = 1`);
		assert.equal((await request('/')).status, 307);
		const health = await request('/healthz');
		assert.equal(health.status, 200);
		assert.equal(health.headers.get('location'), null);
		assert.equal((await health.json()).status, 'ok');
		assert.equal((await request('/admin')).status, 200);
		const logout = await request('/admin?/logout', { method: 'POST', body: new URLSearchParams({ csrfToken: cookies.get('csrf_token') ?? '' }) });
		assert.equal(logout.status, 303, await logout.text());
		assert.equal(cookies.has('admin_session'), false);
		assert.equal((await request('/admin', {}, copiedCookie)).status, 303, 'A copied production cookie cannot survive logout');
		const events = await database.query(`SELECT type, name, actor_type, source, ip, user_agent FROM ${schema}.tracking_events`);
		assert.ok(events.rows.some((event) => event.actor_type === 'visitor' && event.source === 'public' && event.ip === null && event.user_agent === null));
		for (const action of ['login', 'logout']) assert.ok(events.rows.some((event) => event.type === 'admin_audit' && event.name === action && event.actor_type === 'admin' && event.source === 'server'));
		// Startup must reject incompatible migration history before it can listen.
		await stopServer(app);
		await database.query(`UPDATE ${schema}.schema_migrations SET checksum = 'incompatible' WHERE id = '001_baseline'`);
		const broken = spawn(process.execPath, ['scripts/start-server.mjs'], { env: {
			...process.env, NODE_ENV: 'production', HOST: '127.0.0.1', PORT: String(port), DATABASE_URL: databaseUrl.toString(),
			REDIS_URL: redisUrl, REDIS_PREFIX: prefix, DB_PATH: path.join(directory, 'fallback.sqlite'), DB_AUTO_SEED: 'false',
		}, stdio: ['ignore', 'pipe', 'pipe'] });
		let failureOutput = '';
		broken.stderr.on('data', (data: Buffer) => { failureOutput += data.toString(); });
		try {
			const [code] = await once(broken, 'exit', { signal: AbortSignal.timeout(5000) });
			assert.notEqual(code, 0);
			assert.match(failureOutput, /Applied migration 001_baseline was modified/);
		} finally { await stopServer(broken); }
		console.log('Built production HTTP and startup-failure integration passed');
	} finally {
		await stopServer(app);
		const keys: string[] = [];
		for await (const batch of redis.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) keys.push(...batch);
		if (keys.length) await redis.del(keys);
		await redis.quit();
		await database.query(`DROP SCHEMA ${schema} CASCADE`);
		await database.end();
		rmSync(directory, { recursive: true, force: true });
	}
});
