import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parseVisitorEvent, visitorPath, type VisitorEvent } from '../src/lib/telemetry/visitor';
import { createVisitorIngestion, MAX_VISITOR_REQUEST_BYTES } from '../src/lib/server/telemetry/visitorIngestion';
import { adminActivityPayload } from '../src/lib/server/telemetry/adminActivity';

const origin = 'https://portfolio.example';
const records: { event: VisitorEvent; referrer: string | null }[] = [];
const rateKeys: string[] = [];
let rateAllowed = true;
const ingestion = createVisitorIngestion({
	rateLimit: (key, options) => {
		rateKeys.push(key);
		assert.deepEqual(options, { windowMs: 60_000, max: 120 });
		return Promise.resolve(rateAllowed);
	},
	record: (event, referrer) => {
		records.push({ event, referrer });
		return Promise.resolve();
	},
});
const eventFor = (path: string, init?: RequestInit) => {
	const url = new URL(path, origin);
	return { url, request: new Request(url, init), getClientAddress: () => '192.0.2.27' };
};
const post = (value: unknown, headers?: HeadersInit) => ingestion.post(eventFor('/tracking/events', {
	method: 'POST', body: JSON.stringify(value), headers: { 'content-type': 'application/json', ...headers },
}));

for (const type of ['pageview', 'navigation', 'cta_click', 'form_submit', 'form_outcome', 'client_error', 'pixel']) {
	assert.deepEqual(parseVisitorEvent({ type, name: 'public_action:success', path: '/contact?email=secret@example.com#private' }), {
		type, name: 'public_action:success', path: '/contact',
	});
}
for (const value of [null, [], 'pageview', {}, { type: 'admin_audit' }, { type: 'login' },
	{ type: 'pageview', actorType: 'admin' }, { type: 'pageview', source: 'server' },
	{ type: 'pageview', authenticated: true }, { type: 'pageview', sessionHash: 'forged' },
	{ type: 'pageview', payload: 'arbitrary' }, { type: 'cta_click', name: 'person@example.com' },
	{ type: 'client_error', name: 'Secret stack trace and submitted text' },
	{ type: 'pageview', name: 'a'.repeat(81) }, { type: 'pageview', name: 1 },
	{ type: 'pageview', path: '/admin/site' }, { type: 'pageview', path: '/admin' },
	{ type: 'pageview', path: '/%61dmin/site' }, { type: 'pageview', path: '/admin/%6cogin' },
	{ type: 'pageview', path: '/%61dmin' }, { type: 'pageview', path: '/%broken' },
	{ type: 'pageview', path: '/private%0Avalue' }, { type: 'pageview', path: '/%5Cattacker.example' },
	{ type: 'pageview', path: '//attacker.example' }, { type: 'pageview', path: 'https://attacker.example' },
	{ type: 'pageview', path: '/\\attacker.example' }, { type: 'pageview', path: '/secret\nvalue' },
	{ type: 'pageview', path: `/${'a'.repeat(512)}` },
]) assert.equal(parseVisitorEvent(value), null, JSON.stringify(value));
assert.equal(visitorPath('/blog?token=secret#email'), '/blog');
assert.equal(visitorPath(`/${'a'.repeat(511)}`)?.length, 512);

const response = await post({ type: 'pageview', path: '/blog?token=secret#private' }, {
	origin, referer: `${origin}/contact?email=secret@example.com`, 'user-agent': 'Sensitive browser detail',
});
assert.equal(response.status, 204, 'Public visitors can submit without an admin cookie');
assert.deepEqual(records, [{ event: { type: 'pageview', name: null, path: '/blog' }, referrer: origin }]);
assert.match(rateKeys[0], /^visitor-telemetry:[a-f0-9]{64}$/);
assert.equal(rateKeys[0].includes('192.0.2.27'), false, 'The limiter receives only a short-lived address hash');
assert.equal(JSON.stringify(records).includes('secret'), false, 'Query and fragment data are removed');
assert.equal(JSON.stringify(records).includes('192.0.2.27'), false, 'Visitor IP is never passed to persistence');
assert.equal(JSON.stringify(records).includes('Sensitive browser'), false, 'Visitor user agent is never passed to persistence');

const recordsBeforeRejections = records.length;
for (const value of [
	{ type: 'admin_audit', name: 'delete', path: '/blog' },
	{ type: 'pageview', actorType: 'admin', source: 'server' },
	{ type: 'pageview', payload: { sessionHash: 'fake' } },
	{ type: 'pixel', path: '/blog' },
]) assert.equal((await post(value)).status, 400, 'Public JSON cannot inject privileged events or metadata');
assert.equal((await post({ type: 'pageview' }, { origin: 'https://attacker.example' })).status, 403);
assert.equal((await post({ type: 'pageview' }, { 'sec-fetch-site': 'cross-site' })).status, 403);
assert.equal((await post({ type: 'pageview' }, { referer: 'https://attacker.example/path' })).status, 403);
assert.equal((await post({ type: 'pageview' }, { referer: 'invalid-url' })).status, 403);
assert.equal((await post({ type: 'pageview' }, { 'content-type': 'text/plain' })).status, 415);
assert.equal((await ingestion.post(eventFor('/tracking/events', {
	method: 'POST', body: '{invalid', headers: { 'content-type': 'application/json' },
}))).status, 400);
assert.equal((await post({ type: 'pageview' }, { 'content-length': String(MAX_VISITOR_REQUEST_BYTES + 1) })).status, 413);
assert.equal((await post({ type: 'pageview' }, { 'content-length': 'invalid' })).status, 413);
assert.equal((await post({ type: 'pageview', name: 'a'.repeat(MAX_VISITOR_REQUEST_BYTES) })).status, 413,
	'Body bytes are bounded even without a Content-Length header');
assert.equal((await post({ type: 'pageview', name: 'é'.repeat(MAX_VISITOR_REQUEST_BYTES / 2) })).status, 413,
	'The limit counts UTF-8 bytes rather than characters');
rateAllowed = false;
assert.equal((await post({ type: 'pageview' })).status, 429);
rateAllowed = true;
assert.equal(records.length, recordsBeforeRejections, 'Rejected requests never persist');

const rateCallsBeforeDnt = rateKeys.length;
assert.equal((await post({ type: 'pageview' }, { dnt: '1' })).status, 204);
assert.equal(records.length, recordsBeforeRejections, 'Do Not Track suppresses visitor persistence');
assert.equal(rateKeys.length, rateCallsBeforeDnt, 'Do Not Track avoids generating an address pseudonym');
assert.equal(ingestion.options(eventFor('/tracking/events', { headers: { origin } })).status, 204);
const corsResponse = ingestion.options(eventFor('/tracking/events', { headers: { origin: 'https://attacker.example' } }));
assert.equal(corsResponse.status, 403);
assert.equal(corsResponse.headers.get('access-control-allow-origin'), null, 'Telemetry does not expose permissive CORS');

const pixelHeaders = { referer: `${origin}/blog?token=secret` };
const pixel = await ingestion.pixel(eventFor('/tracking/pixel?event=public_pixel&path=%2Fblog%3Ftoken%3Dsecret', { headers: pixelHeaders }));
assert.equal(pixel.status, 200);
assert.equal(pixel.headers.get('content-type'), 'image/gif');
assert.equal(pixel.headers.get('cache-control'), 'no-store');
assert.equal(pixel.headers.get('x-content-type-options'), 'nosniff');
assert.equal(Buffer.from(await pixel.arrayBuffer()).subarray(0, 6).toString(), 'GIF89a');
assert.deepEqual(records.at(-1), { event: { type: 'pixel', name: 'public_pixel', path: '/blog' }, referrer: origin });
const pixelCount = records.length;
assert.equal((await ingestion.pixel(eventFor('/tracking/pixel?event=ok'))).status, 403, 'Pixel requires same-origin provenance');
assert.equal((await ingestion.pixel(eventFor('/tracking/pixel?event=ok&actorType=admin', { headers: pixelHeaders }))).status, 400);
assert.equal((await ingestion.pixel(eventFor('/tracking/pixel?event=ok&path=%2Fadmin', { headers: pixelHeaders }))).status, 400);
assert.equal((await ingestion.pixel(eventFor(`/tracking/pixel?event=${'a'.repeat(MAX_VISITOR_REQUEST_BYTES)}`, { headers: pixelHeaders }))).status, 413);
rateAllowed = false;
assert.equal((await ingestion.pixel(eventFor('/tracking/pixel?event=ok', { headers: pixelHeaders }))).status, 429);
rateAllowed = true;
assert.equal((await ingestion.pixel(eventFor('/tracking/pixel?event=ok', { headers: { ...pixelHeaders, dnt: '1' } }))).status, 200);
assert.equal(records.length, pixelCount, 'Rejected and Do Not Track pixels never persist');

const cookie = 'admin.random-server-session.timestamp.signature';
const activity = adminActivityPayload({ action: 'update', resource: 'post', resourceId: 12 }, cookie);
assert.equal(activity.includes(cookie), false, 'Audit metadata cannot disclose a replayable cookie');
assert.deepEqual(JSON.parse(activity), {
	resource: 'post', resourceId: 12, sessionHash: createHash('sha256').update(cookie).digest('hex'),
});
console.log('visitor telemetry schema, size, origin, rate-limit and privacy tests passed');
