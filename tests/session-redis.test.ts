import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isRedirect, type Cookies, type RequestEvent } from '@sveltejs/kit';
import { createClient } from 'redis';
import { createServer, type ViteDevServer } from 'vite';
import { ADMIN_SESSION_MAX_AGE_SECONDS } from '../src/lib/server/authSessions';

const redisUrl = process.env.TEST_REDIS_URL;
if (!redisUrl) {
	if (process.env.CI) throw new Error('CI requires TEST_REDIS_URL for session integration tests.');
	console.log('Redis session integration skipped: TEST_REDIS_URL is not set.');
} else {
	const identifier = randomUUID().replaceAll('-', '');
	const prefix = `portfolio:session-integration:${identifier}:`;
	const username = `session_test_${identifier}`;
	const password = randomBytes(32).toString('hex');
	const authenticatedUrl = new URL(redisUrl);
	authenticatedUrl.username = username;
	authenticatedUrl.password = password;
	const previousUrl = process.env.REDIS_URL;
	const previousPrefix = process.env.REDIS_PREFIX;
	process.env.REDIS_URL = authenticatedUrl.href;
	process.env.REDIS_PREFIX = prefix;
	const control = createClient({ url: redisUrl, socket: { connectTimeout: 3_000, reconnectStrategy: false } });
	control.on('error', (error: unknown) => { console.error('Session integration Redis connection failed.', error); });
	const keys = new Set([`${prefix}auth:admin:session-generation`]);
	const root = fileURLToPath(new URL('..', import.meta.url));
	const virtualModule = '\0session-redis-test-boundaries';
	let server: ViteDevServer | undefined;
	let disconnectApplicationRedis: (() => void) | undefined;
	let userCreated = false;

	const exportedFunction = (module: unknown, name: string) => {
		assert.ok(typeof module === 'object' && module !== null);
		const value: unknown = Reflect.get(module, name);
		assert.ok(typeof value === 'function', `Missing integration module export: ${name}`);
		return value;
	};
	const keyFor = (token: string) => {
		assert.match(token, /^admin\.[A-Za-z0-9_-]{43}\.[1-9][0-9]{0,15}\.[A-Za-z0-9_-]{43}$/);
		return `${prefix}auth:admin:session:${token.split('.')[1]}`;
	};
	const makeEvent = (options: { token?: string; csrf?: 'valid' | 'invalid'; login?: boolean } = {}) => {
		const jar = new Map<string, string>([['csrf_token', `${Date.now()}.${randomBytes(32).toString('base64url')}`]]);
		if (options.token) jar.set('admin_session', options.token);
		const writes: { name: string; value: string; options: Parameters<Cookies['set']>[2] }[] = [];
		const deletions: string[] = [];
		const form = new FormData();
		form.set('csrfToken', options.csrf === 'invalid' ? 'incorrect' : jar.get('csrf_token') ?? '');
		if (options.login) {
			form.set('email', 'admin@session-test.example');
			form.set('password', 'test-password');
		}
		const url = new URL(options.login ? '/admin/login' : '/admin?/logout', 'https://portfolio.example');
		const event: RequestEvent = {
			url, request: new Request(url, { method: 'POST', body: form }), getClientAddress: () => '192.0.2.29',
			cookies: {
				get: (name) => jar.get(name), getAll: () => [...jar].map(([name, value]) => ({ name, value })),
				set: (name, value, cookieOptions) => {
					jar.set(name, value);
					writes.push({ name, value, options: cookieOptions });
					if (name === 'admin_session') keys.add(keyFor(value));
				},
				delete: (name) => { jar.delete(name); deletions.push(name); },
				serialize: (name, value) => `${name}=${value}`,
			},
			fetch, locals: {}, params: {}, platform: undefined, route: { id: null },
			setHeaders: () => undefined, isDataRequest: false, isSubRequest: false, isRemoteRequest: false,
			get tracing(): RequestEvent['tracing'] { throw new Error('Tracing is outside this session integration test.'); },
		};
		return { event, writes, deletions };
	};
	const tokenFor = (event: RequestEvent) => {
		const token = event.cookies.get('admin_session');
		assert.ok(token);
		return token;
	};
	const captureFailureLog = async (operation: () => Promise<unknown>) => {
		const previous = console.error;
		const messages: unknown[][] = [];
		console.error = (...message: unknown[]) => { messages.push(message); };
		try {
			const result: unknown = await operation();
			assert.ok(messages.length > 0, 'Authority failure is logged rather than silently swallowed');
			return result;
		} finally {
			console.error = previous;
		}
	};

	try {
		await control.connect();
		// A disposable ACL user lets genuine Redis command failures be exercised without stopping Redis.
		await control.sendCommand(['ACL', 'SETUSER', username, 'reset', 'on', `>${password}`, `~${prefix}*`, '+@connection', '+client', '+get', '+set', '+del']);
		userCreated = true;
		server = await createServer({
			configFile: false, root, appType: 'custom', logLevel: 'error',
			server: { middlewareMode: true, watch: null, ws: false },
			resolve: { alias: { '$lib': path.join(root, 'src/lib') } },
			plugins: [{
				name: 'session-redis-test-boundaries', enforce: 'pre',
				resolveId(source, importer) {
					if (['$app/environment', '$env/dynamic/private', '$lib/server/dataStore', '$lib/server/rateLimit'].includes(source)) return virtualModule;
					if (importer?.replaceAll('\\', '/').endsWith('/telemetry/audit.ts') && source === '../telemetryStore') return virtualModule;
					return null;
				},
				load(id) {
					if (id !== virtualModule) return null;
					return `
						export const dev = false;
						export const env = { ADMIN_SESSION_SECRET: 'session-integration-secret', ADMIN_SESSION_VERSION: '1', ADMIN_EMAIL: 'admin@session-test.example', ADMIN_PASSWORD: 'test-password' };
						const records = [];
						let auditFailure = false;
						export const readRecords = () => records;
						export const resetRecords = () => { records.length = 0; auditFailure = false; };
						export const setAuditFailure = (value) => { auditFailure = value; };
						export const createTrackingEvent = async (...record) => {
							if (auditFailure) throw new Error('Simulated telemetry storage outage');
							records.push(record);
						};
						export const rateLimit = async () => true;
						export const getAppointments = async () => [];
						export const getPosts = async () => [];
						export const getTestimonials = async () => [];
						export const getWorkItems = async () => [];
					`;
				},
			}],
		});
		const auth: unknown = await server.ssrLoadModule('/src/lib/server/auth.ts');
		const redis: unknown = await server.ssrLoadModule('/src/lib/server/redis.ts');
		const fixtures: unknown = await server.ssrLoadModule(virtualModule);
		const setSession = exportedFunction(auth, 'setAdminSession');
		const clearSession = exportedFunction(auth, 'clearAdminSession');
		const verifySession = exportedFunction(auth, 'verifySessionToken');
		const revokeAll = exportedFunction(auth, 'revokeAllAdminSessions');
		const readRecords = exportedFunction(fixtures, 'readRecords');
		const resetRecords = exportedFunction(fixtures, 'resetRecords');
		const setAuditFailure = exportedFunction(fixtures, 'setAuditFailure');
		assert.ok(typeof fixtures === 'object' && fixtures !== null);
		const environment: unknown = Reflect.get(fixtures, 'env');
		assert.ok(typeof environment === 'object' && environment !== null);
		const runtimeClient: unknown = await exportedFunction(redis, 'getRedisClient')();
		assert.ok(typeof runtimeClient === 'object' && runtimeClient !== null);
		disconnectApplicationRedis = () => { exportedFunction(runtimeClient, 'destroy').call(runtimeClient); };
		const createSession = async () => {
			const state = makeEvent();
			await setSession(state.event);
			return { ...state, token: tokenFor(state.event) };
		};
		const actionFor = async (pathname: string, name: string) => {
			const module: unknown = await server?.ssrLoadModule(pathname);
			assert.ok(typeof module === 'object' && module !== null);
			return exportedFunction(Reflect.get(module, 'actions'), name);
		};
		const logout = await actionFor('/src/routes/admin/+page.server.ts', 'logout');
		const login = await actionFor('/src/routes/admin/login/+page.server.ts', 'default');

		const first = await createSession();
		assert.deepEqual(first.writes[0].options, {
			path: '/', httpOnly: true, sameSite: 'strict', secure: true, maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
		}, 'Actual session adapter preserves production cookie flags and lifetime');
		assert.equal(await verifySession(first.token), true);
		const stored = await control.get(keyFor(first.token));
		assert.ok(stored);
		const record: unknown = JSON.parse(stored);
		assert.ok(typeof record === 'object' && record !== null && 'sessionId' in record && 'issuedAt' in record && 'expiresAt' in record && 'version' in record && 'generation' in record);
		assert.equal(record.sessionId, first.token.split('.')[1]);
		assert.equal(record.issuedAt, Number(first.token.split('.')[2]));
		assert.equal(record.expiresAt, Number(first.token.split('.')[2]) + ADMIN_SESSION_MAX_AGE_SECONDS * 1000);
		assert.equal(record.version, '1');
		assert.equal(record.generation, await control.get(`${prefix}auth:admin:session-generation`));
		const ttl = await control.ttl(keyFor(first.token));
		assert.ok(ttl > 0 && ttl <= ADMIN_SESSION_MAX_AGE_SECONDS, 'Authoritative session record has a bounded Redis TTL');
		assert.equal(await verifySession(`${first.token.slice(0, -1)}${first.token.endsWith('A') ? 'B' : 'A'}`), false);
		const independent = await createSession();
		assert.notEqual(first.token.split('.')[1], independent.token.split('.')[1]);
		const copied = makeEvent({ token: first.token });
		await clearSession(first.event);
		assert.equal(first.event.cookies.get('admin_session'), undefined);
		assert.deepEqual(first.deletions, ['admin_session']);
		assert.equal(await control.get(keyFor(first.token)), null, 'Actual logout deletes authoritative Redis state');
		assert.equal(await verifySession(tokenFor(copied.event)), false, 'A copied cookie cannot replay after actual clearAdminSession');
		assert.equal(await verifySession(independent.token), true, 'Current-session logout leaves other sessions active');

		Reflect.set(environment, 'ADMIN_SESSION_VERSION', '2');
		assert.equal(await verifySession(independent.token), false, 'Changing the deployed session version invalidates real stored sessions');
		const currentVersion = await createSession();
		const secondCurrent = await createSession();
		assert.equal(await verifySession(currentVersion.token), true);
		const previousGeneration = await control.get(`${prefix}auth:admin:session-generation`);
		await revokeAll();
		assert.notEqual(await control.get(`${prefix}auth:admin:session-generation`), previousGeneration);
		assert.equal(await verifySession(currentVersion.token), false);
		assert.equal(await verifySession(secondCurrent.token), false, 'Global revocation rejects all cookies from the previous Redis generation');
		const afterGlobal = await createSession();
		assert.equal(await verifySession(afterGlobal.token), true, 'New sessions authenticate after global revocation');

		const retryable = await createSession();
		await control.sendCommand(['ACL', 'SETUSER', username, '-del']);
		await assert.rejects(clearSession(retryable.event), /NOPERM/);
		assert.equal(tokenFor(retryable.event), retryable.token, 'Failed Redis revocation retains the cookie needed to retry');
		assert.deepEqual(retryable.deletions, []);
		assert.ok(await control.get(keyFor(retryable.token)));
		await control.sendCommand(['ACL', 'SETUSER', username, '+del']);
		await clearSession(retryable.event);
		assert.equal(await verifySession(retryable.token), false, 'Retry after authority recovery revokes the copied token');

		await control.sendCommand(['ACL', 'SETUSER', username, '-get']);
		assert.equal(await captureFailureLog(() => verifySession(afterGlobal.token)), false, 'Actual Redis read failures fail closed');
		const unavailableCreation = makeEvent();
		await assert.rejects(setSession(unavailableCreation.event), /NOPERM/);
		assert.equal(unavailableCreation.event.cookies.get('admin_session'), undefined, 'Authority failure cannot issue a browser session');
		await control.sendCommand(['ACL', 'SETUSER', username, '+get']);
		assert.equal(await verifySession(afterGlobal.token), true, 'Read failure does not corrupt unrelated active sessions');

		resetRecords();
		const invalidCsrfSession = await createSession();
		const invalidCsrf = makeEvent({ token: invalidCsrfSession.token, csrf: 'invalid' });
		const rejected: unknown = await logout(invalidCsrf.event);
		assert.ok(typeof rejected === 'object' && rejected !== null && 'status' in rejected && rejected.status === 403);
		assert.equal(await verifySession(invalidCsrfSession.token), true, 'Invalid CSRF cannot revoke a legitimate session');
		assert.deepEqual(invalidCsrf.deletions, []);
		assert.deepEqual(readRecords(), [], 'CSRF rejection cannot generate authoritative logout activity');

		const normalLogout = makeEvent({ token: invalidCsrfSession.token });
		await assert.rejects(logout(normalLogout.event), (error: unknown) => isRedirect(error) && error.status === 303 && error.location === '/admin/login');
		assert.equal(normalLogout.event.cookies.get('admin_session'), undefined);
		assert.equal(await verifySession(invalidCsrfSession.token), false, 'Successful logout action revokes copied cookies');
		const auditRows: unknown = readRecords();
		assert.ok(Array.isArray(auditRows) && auditRows.length === 1 && Array.isArray(auditRows[0]));
		assert.equal(auditRows[0][0], 'admin_audit');
		assert.equal(auditRows[0][1], 'logout');
		assert.deepEqual(auditRows[0][7], { actorType: 'admin', source: 'server' });
		assert.equal(JSON.stringify(auditRows).includes(invalidCsrfSession.token), false, 'Logout audit cannot leak a replayable cookie');

		resetRecords();
		const auditOutageSession = await createSession();
		setAuditFailure(true);
		await assert.rejects(logout(auditOutageSession.event), /Simulated telemetry storage outage/);
		assert.equal(auditOutageSession.event.cookies.get('admin_session'), undefined);
		assert.equal(await control.get(keyFor(auditOutageSession.token)), null);
		assert.equal(await verifySession(auditOutageSession.token), false, 'Telemetry failure never prevents actual Redis logout revocation');
		resetRecords();

		const failedActionSession = await createSession();
		await control.sendCommand(['ACL', 'SETUSER', username, '-del']);
		const failedLogout: unknown = await captureFailureLog(() => logout(failedActionSession.event));
		assert.ok(typeof failedLogout === 'object' && failedLogout !== null && 'status' in failedLogout && failedLogout.status === 503);
		assert.equal(tokenFor(failedActionSession.event), failedActionSession.token);
		assert.equal(await verifySession(failedActionSession.token), true);
		await control.sendCommand(['ACL', 'SETUSER', username, '+del']);
		const retry = makeEvent({ token: failedActionSession.token });
		await assert.rejects(logout(retry.event), (error: unknown) => isRedirect(error) && error.status === 303);
		assert.equal(await verifySession(failedActionSession.token), false, 'Failed logout action can be retried with its retained cookie');

		resetRecords();
		const existingSession = await createSession();
		const loginEvent = makeEvent({ token: existingSession.token, login: true });
		await assert.rejects(login(loginEvent.event), (error: unknown) => isRedirect(error) && error.status === 303 && error.location === '/admin');
		const newLoginToken = tokenFor(loginEvent.event);
		assert.notEqual(newLoginToken.split('.')[1], existingSession.token.split('.')[1], 'Actual login replaces a presented session ID with fresh random state');
		assert.equal(await verifySession(newLoginToken), true);
		const loginAudit: unknown = readRecords();
		assert.ok(Array.isArray(loginAudit) && loginAudit.length === 1 && Array.isArray(loginAudit[0]));
		assert.equal(loginAudit[0][1], 'login');
		assert.deepEqual(loginAudit[0][7], { actorType: 'admin', source: 'server' });
		console.log('Redis authority, cookie flags, logout replay, version/global revocation, CSRF, login and failure integration tests passed');
	} finally {
		disconnectApplicationRedis?.();
		await server?.close();
		try {
			if (control.isReady) {
				await control.del([...keys]);
				if (userCreated) await control.sendCommand(['ACL', 'DELUSER', username]);
			}
		} finally {
			if (control.isOpen) control.destroy();
			if (previousUrl === undefined) delete process.env.REDIS_URL;
			else process.env.REDIS_URL = previousUrl;
			if (previousPrefix === undefined) delete process.env.REDIS_PREFIX;
			else process.env.REDIS_PREFIX = previousPrefix;
		}
	}
}
