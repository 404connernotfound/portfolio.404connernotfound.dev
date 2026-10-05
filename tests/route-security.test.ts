import assert from 'node:assert/strict';
import type { RequestEvent } from '@sveltejs/kit';
import { classifyRoute, isMaintenanceExempt, requiresAdminSession } from '../src/lib/server/routePolicy';
import { createSecurityHandle } from '../src/lib/server/routeSecurity';

const makeEvent = (pathname: string, routeId: RequestEvent['route']['id'] = null): RequestEvent => {
	const url = new URL(pathname, 'https://portfolio.example');
	return {
		url, request: new Request(url), getClientAddress: () => '192.0.2.25',
		cookies: {
			get: () => undefined, getAll: () => [], set: () => undefined,
			delete: () => undefined, serialize: (name, value) => `${name}=${value}`,
		},
		fetch, locals: {}, params: {}, platform: undefined, route: { id: routeId },
		setHeaders: () => undefined, isDataRequest: false, isSubRequest: false, isRemoteRequest: false,
		get tracing(): RequestEvent['tracing'] { throw new Error('Tracing is outside this hook test.'); },
	};
};

for (const [path, expected] of [
	['/healthz', 'system'], ['/healthz/', 'system'], ['/admin/login', 'admin-auth'],
	['/admin/login/', 'admin-auth'], ['/admin', 'admin'], ['/admin/blog', 'admin'],
	['/%61dmin/blog', 'admin'], ['/%61dmin/%6cogin', 'admin-auth'], ['/%68ealthz', 'system'],
	['/admin/login/extra', 'admin'], ['/tracking/events', 'visitor-telemetry'],
	['/tracking/pixel/', 'visitor-telemetry'], ['/administrator', 'public'], ['/blog', 'public'],
] as const) assert.equal(classifyRoute(path), expected, path);

for (const path of ['/healthz', '/maintenance', '/maintenance/', '/admin', '/admin/login', '/admin/work']) {
	assert.equal(isMaintenanceExempt(path), true, path);
}
for (const path of ['/healthz/other', '/maintenance-other', '/blog', '/tracking/events']) {
	assert.equal(isMaintenanceExempt(path), false, path);
}
for (const path of ['/admin', '/admin/blog/', '/admin/login/extra', '/collaborate/', '/subscribe', '/%73ubscribe', '/%63ollaborate']) {
	assert.equal(requiresAdminSession(path), true, path);
}
for (const path of ['/admin/login', '/administrator', '/healthz', '/contact', '/book', '/reviews', '/tracking/events']) {
	assert.equal(requiresAdminSession(path), false, path);
}

let maintenanceEnabled = 1;
let authenticated = false;
let settingsAvailable = true;
let authenticationAvailable = true;
let settingsReads = 0;
let authenticationReads = 0;
let resolved = 0;
const handle = createSecurityHandle({
	getSiteSettings: () => {
		settingsReads++;
		if (!settingsAvailable) throw new Error('Settings storage unavailable.');
		return Promise.resolve({ maintenanceEnabled });
	},
	isAdminAuthenticated: () => {
		authenticationReads++;
		if (!authenticationAvailable) throw new Error('Session authority unavailable.');
		return Promise.resolve(authenticated);
	},
});
const dispatch = async (path: string, status = 200) => handle({
	event: makeEvent(path),
	resolve: () => {
		resolved++;
		return Promise.resolve(new Response('Resolved route', { status, headers: { 'x-route-response': 'preserved' } }));
	},
});

for (const [requestPath, routeId] of [
	['/%73ubscribe', '/subscribe'], ['/%63ollaborate', '/collaborate'],
	['/subscribe/__data.json', '/subscribe'], ['/collaborate/__data.json', '/collaborate'],
	['/%61dmin/blog/__data.json', '/admin/blog'],
] as const) {
	const response = await handle({
		event: makeEvent(requestPath, routeId),
		resolve: () => { throw new Error('Encoded protected routes must never resolve without a session.'); },
	});
	assert.equal(response.status, 303, `${requestPath} preserves protection of ${routeId}`);
	assert.equal(response.headers.get('location'), `/admin/login?next=${encodeURIComponent(routeId)}`);
}
const malformed = await dispatch('/%broken');
assert.equal(malformed.status, 400, 'Malformed encodings cannot bypass policy');
// The encoded-route tests use session checks; isolate the health assertions below.
authenticationReads = 0;

settingsAvailable = false;
authenticationAvailable = false;
for (const path of ['/healthz', '/healthz/']) {
	const response = await dispatch(path);
	assert.equal(response.status, 200, 'Maintenance and unavailable settings never redirect health checks');
	assert.equal(response.headers.get('location'), null);
	assert.equal(await response.text(), 'Resolved route');
}
assert.equal((await dispatch('/healthz', 503)).status, 503, 'The health route retains its dependency-failure response');
assert.equal(settingsReads, 0, 'Health never consults settings');
assert.equal(authenticationReads, 0, 'Health never consults session authority');
settingsAvailable = true;
authenticationAvailable = true;

for (const path of ['/admin/blog?post=3', '/admin/login/extra', '/collaborate', '/subscribe/']) {
	const before = resolved;
	const response = await dispatch(path);
	assert.equal(response.status, 303, 'Unauthenticated protected routes redirect to login during maintenance');
	assert.equal(response.headers.get('location'), `/admin/login?next=${encodeURIComponent(path)}`);
	assert.equal(resolved, before, 'Protected content is never resolved before authorization');
}
assert.equal((await dispatch('/admin/login')).status, 200, 'Login remains reachable during maintenance');
assert.equal((await dispatch('/maintenance')).status, 200, 'Maintenance page cannot redirect to itself');
for (const path of ['/blog', '/tracking/events', '/administrator']) {
	const response = await dispatch(path);
	assert.equal(response.status, 307);
	assert.equal(response.headers.get('location'), '/maintenance');
}

authenticated = true;
assert.equal((await dispatch('/admin/blog')).status, 200, 'Authenticated administration remains available during maintenance');
maintenanceEnabled = 0;
assert.equal((await dispatch('/blog')).status, 200);
assert.equal((await dispatch('/tracking/events')).status, 200, 'Public telemetry needs no admin session');
for (const [path, status] of [['/403', 403], ['/404', 404], ['/500', 500]] as const) {
	const response = await dispatch(path);
	assert.equal(response.status, status);
	assert.equal(response.headers.get('x-route-response'), 'preserved');
	assert.equal(await response.text(), 'Resolved route');
}
authenticationAvailable = false;
const beforeFailure = resolved;
await assert.rejects(dispatch('/admin/site'), /Session authority unavailable/);
assert.equal(resolved, beforeFailure, 'Session authority failure never resolves protected content');
console.log('route security tests passed');
