import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import {
	ADMIN_SESSION_CLOCK_SKEW_MS,
	ADMIN_SESSION_MAX_AGE_SECONDS,
	createAdminSessionService,
	type AdminSession,
	type AdminSessionStore,
} from '../src/lib/server/authSessions';

const secret = 'session-test-secret';
let now = 1_800_000_000_000;
let version = '1';
let generation: string | null = randomBytes(32).toString('base64url');
let unavailable = false;
const records = new Map<string, unknown>();
const requireAvailable = () => {
	if (unavailable) throw new Error('Simulated session store outage');
};
const store: AdminSessionStore = {
	getGeneration() {
		requireAvailable();
		return Promise.resolve(generation);
	},
	initializeGeneration() {
		requireAvailable();
		generation ??= randomBytes(32).toString('base64url');
		return Promise.resolve(generation);
	},
	read(id) {
		requireAvailable();
		return Promise.resolve(records.get(id) ?? null);
	},
	create(session, ttlSeconds) {
		requireAvailable();
		assert.equal(ttlSeconds, ADMIN_SESSION_MAX_AGE_SECONDS);
		records.set(session.sessionId, session);
		return Promise.resolve();
	},
	revoke(id) {
		requireAvailable();
		records.delete(id);
		return Promise.resolve();
	},
	revokeAll() {
		requireAvailable();
		generation = randomBytes(32).toString('base64url');
		return Promise.resolve();
	},
};
const sessions = createAdminSessionService({ store, secret: () => secret, version: () => version, now: () => now });

const signedToken = (id: string, issuedAt: number) => {
	const payload = `admin.${id}.${issuedAt}`;
	return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
};

// Include real authoritative state for timestamp tests: signatures alone never authenticate.
const sessionAt = (issuedAt: number) => {
	assert.ok(generation);
	const sessionId = randomBytes(32).toString('base64url');
	const session: AdminSession = {
		sessionId, issuedAt, expiresAt: issuedAt + ADMIN_SESSION_MAX_AGE_SECONDS * 1000, version, generation,
	};
	records.set(sessionId, session);
	return signedToken(sessionId, issuedAt);
};

const active = await sessions.create();
assert.equal(await sessions.verify(active), true, 'Active session is accepted');
const second = await sessions.create();
assert.notEqual(active.split('.')[1], second.split('.')[1], 'Logins have independent unpredictable IDs');

const tampered = `${active.slice(0, -1)}${active.endsWith('A') ? 'B' : 'A'}`;
assert.equal(await sessions.verify(tampered), false, 'Tampered signature is rejected');
assert.equal(await sessions.verify(signedToken(randomBytes(32).toString('base64url'), now)), false,
	'A valid signature for an unknown session cannot authenticate');
await sessions.revoke(active);
assert.equal(await sessions.verify(active), false, 'Revocation prevents replay of a copied logout cookie');
assert.equal(await sessions.verify(second), true, 'Current-session revocation leaves other sessions active');

assert.equal(await sessions.verify(sessionAt(now - ADMIN_SESSION_MAX_AGE_SECONDS * 1000)), false,
	'Expiration boundary is rejected even if Redis still contains a record');
assert.equal(await sessions.verify(sessionAt(now + ADMIN_SESSION_CLOCK_SKEW_MS + 1)), false,
	'Future timestamps cannot extend session lifetime beyond acceptable skew');
assert.equal(await sessions.verify(sessionAt(now + ADMIN_SESSION_CLOCK_SKEW_MS)), true,
	'The 60-second acceptable clock skew works');

version = '2';
assert.equal(await sessions.verify(second), false, 'Configured session version invalidates older sessions');
const beforeGlobalRevocation = await sessions.create();
assert.equal(await sessions.verify(beforeGlobalRevocation), true);
await sessions.revokeAll();
assert.equal(await sessions.verify(beforeGlobalRevocation), false, 'Global revocation invalidates all older sessions');
const afterGlobalRevocation = await sessions.create();
assert.equal(await sessions.verify(afterGlobalRevocation), true, 'New logins work after global revocation');

generation = null;
assert.equal(await sessions.verify(afterGlobalRevocation), false, 'Loss of authoritative generation fails closed');
const current = await sessions.create();
const currentId = current.split('.')[1];
const record = records.get(currentId);
assert.ok(typeof record === 'object' && record !== null);
records.set(currentId, { ...record, expiresAt: now + 1000 });
assert.equal(await sessions.verify(current), false, 'Corrupt server-side expiration state is rejected');
records.set(currentId, record);

unavailable = true;
await assert.rejects(sessions.verify(current), /store outage/, 'Authority failure never falls back to the signature');
await assert.rejects(sessions.create(), /store outage/, 'Unavailable authority prevents issuing cookies');
await assert.rejects(sessions.revoke(current), /store outage/, 'Failed revocation cannot be reported as success');
unavailable = false;

for (const malformed of ['', 'admin.1.1800000000000.signature', `${current}.extra`, current.replace('.180', '.0180')]) {
	assert.equal(await sessions.verify(malformed), false, 'Legacy and malformed cookies are rejected');
}

now += ADMIN_SESSION_MAX_AGE_SECONDS * 1000;
assert.equal(await sessions.verify(current), false, 'Existing sessions expire after the preserved 24-hour lifetime');
console.log('session tests passed');
