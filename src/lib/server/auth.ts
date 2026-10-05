import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { redirect } from '@sveltejs/kit';
import crypto from 'node:crypto';
import type { RequestEvent } from '@sveltejs/kit';
import { getRedisClient, withRedisPrefix } from '$lib/server/redis';
import {
	ADMIN_SESSION_MAX_AGE_SECONDS,
	createAdminSessionService,
	SessionStoreUnavailableError,
	type AdminSessionStore,
} from './authSessions';

export const ADMIN_SESSION_COOKIE = 'admin_session';
const generationKey = withRedisPrefix('auth:admin:session-generation');
const sessionKey = (sessionId: string) => withRedisPrefix(`auth:admin:session:${sessionId}`);

const safeEqual = (a: string, b: string) => {
	const aBuf = Buffer.from(a);
	const bBuf = Buffer.from(b);
	return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
};

const getSessionVersion = () => env.ADMIN_SESSION_VERSION?.trim() || '1';

export const verifyAdminCredentials = (email: string, password: string) => {
	const adminEmail = env.ADMIN_EMAIL;
	const adminPassword = env.ADMIN_PASSWORD;
	if (!adminEmail || !adminPassword) {
		throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required for admin login.');
	}
	const emailMatch = safeEqual(email.trim().toLowerCase(), adminEmail.trim().toLowerCase());
	const passwordMatch = safeEqual(password, adminPassword);
	return emailMatch && passwordMatch;
};

const getSessionSecret = () => {
	const secret = env.ADMIN_SESSION_SECRET;
	if (!secret) throw new Error('ADMIN_SESSION_SECRET is required to sign admin sessions.');
	return secret;
};

const requireSessionRedis = async () => {
	const client = await getRedisClient();
	if (!client) throw new SessionStoreUnavailableError();
	return client;
};

const sessionStore: AdminSessionStore = {
	async getGeneration() {
		return (await requireSessionRedis()).get(generationKey);
	},
	async initializeGeneration() {
		const client = await requireSessionRedis();
		await client.set(generationKey, crypto.randomBytes(32).toString('base64url'), { NX: true });
		const generation = await client.get(generationKey);
		if (!generation) throw new SessionStoreUnavailableError();
		return generation;
	},
	async read(sessionId) {
		const raw = await (await requireSessionRedis()).get(sessionKey(sessionId));
		if (raw === null) return null;
		const parsed: unknown = JSON.parse(raw);
		return parsed;
	},
	async create(session, ttlSeconds) {
		const client = await requireSessionRedis();
		const result = await client.set(sessionKey(session.sessionId), JSON.stringify(session), {
			EX: ttlSeconds,
			NX: true,
		});
		if (result !== 'OK') throw new Error('Failed to persist a unique admin session.');
	},
	async revoke(sessionId) {
		await (await requireSessionRedis()).del(sessionKey(sessionId));
	},
	async revokeAll() {
		// Replacing the generation invalidates every existing session without scanning Redis.
		await (await requireSessionRedis()).set(generationKey, crypto.randomBytes(32).toString('base64url'));
	},
};

const sessions = createAdminSessionService({
	store: sessionStore,
	secret: getSessionSecret,
	version: getSessionVersion,
});

export const createSessionToken = () => sessions.create();

export const verifySessionToken = async (token: string) => {
	try {
		return await sessions.verify(token);
	} catch (error) {
		console.error('[auth] authoritative session verification failed', error);
		return false;
	}
};

export const setAdminSession = async (event: RequestEvent) => {
	const token = await createSessionToken();
	event.cookies.set(ADMIN_SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		secure: !dev,
		maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
	});
};

export const clearAdminSession = async (event: RequestEvent) => {
	const token = event.cookies.get(ADMIN_SESSION_COOKIE);
	if (token) await sessions.revoke(token);
	// Keep the cookie on authority failure so the failed logout can be retried.
	event.cookies.delete(ADMIN_SESSION_COOKIE, { path: '/' });
};

export const revokeAllAdminSessions = () => sessions.revokeAll();

export const isAdminAuthenticated = async (event: RequestEvent) => {
	const token = event.cookies.get(ADMIN_SESSION_COOKIE);
	return token ? verifySessionToken(token) : false;
};

export const requireAdmin = async (event: RequestEvent) => {
	if (!(await isAdminAuthenticated(event))) throw redirect(303, '/admin/login');
};

// Preserve existing callers while removing validation caches and stateless fallback.
export const isAdminAuthenticatedCached = isAdminAuthenticated;
export const requireAdminCached = requireAdmin;
