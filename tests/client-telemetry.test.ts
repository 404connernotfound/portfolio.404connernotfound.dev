import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({
	configFile: false, root, appType: 'custom', logLevel: 'error', server: { middlewareMode: true, ws: false, watch: null },
	resolve: { alias: { '$app/environment': path.join(root, 'tests/fixtures/telemetryAdmin.ts') } },
});
const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
const location = { pathname: '/blog' };
const browser = {
	doNotTrack: '0',
	sendBeacon: (url: string, body: Blob) => { beacons.push({ url, body }); return true; },
};
const beacons: { url: string; body: Blob }[] = [];
try {
	const module: unknown = await server.ssrLoadModule('/src/lib/telemetry/client.ts');
	assert.ok(typeof module === 'object' && module !== null && 'trackEvent' in module && typeof module.trackEvent === 'function');
	const track = module.trackEvent;
	track({ type: 'pageview' });
	assert.equal(beacons.length, 0, 'Server rendering never emits visitor beacons');
	Object.defineProperty(globalThis, 'window', { configurable: true, value: { location } });
	Object.defineProperty(globalThis, 'navigator', { configurable: true, value: browser });
	track({ type: 'pageview', path: '/blog?email=private#token' });
	track({ type: 'form_outcome', name: 'contact_success' });
	track({ type: 'form_outcome', name: 'contact_failure' });
	assert.equal(beacons.length, 3, 'Visitor pageviews and categorical success/failure events are dispatched');
	assert.equal(beacons[0].url, '/tracking/events');
	assert.equal(beacons[0].body.type, 'application/json');
	assert.deepEqual(JSON.parse(await beacons[0].body.text()), { type: 'pageview', name: null, path: '/blog' });
	assert.deepEqual(JSON.parse(await beacons[1].body.text()), { type: 'form_outcome', name: 'contact_success', path: '/blog' });
	assert.deepEqual(JSON.parse(await beacons[2].body.text()), { type: 'form_outcome', name: 'contact_failure', path: '/blog' });
	for (const pathname of ['/admin', '/admin/blog', '/%61dmin', '/%61dmin/blog', '/%broken']) {
		location.pathname = pathname;
		track({ type: 'pageview' });
		track({ type: 'cta_click', name: 'admin_click', path: '/blog' });
	}
	assert.equal(beacons.length, 3, 'Admin pages and encoded aliases never emit visitor activity, including path overrides');
	location.pathname = '/blog';
	track({ type: 'pageview', path: '/%61dmin/blog' });
	browser.doNotTrack = '1';
	track({ type: 'pageview' });
	assert.equal(beacons.length, 3, 'Invalid paths and Do Not Track suppress beacons');
	console.log('client telemetry dispatch, form outcomes and admin/privacy exclusion tests passed');
} finally {
	if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor);
	else Reflect.deleteProperty(globalThis, 'window');
	if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
	else Reflect.deleteProperty(globalThis, 'navigator');
	await server.close();
}
