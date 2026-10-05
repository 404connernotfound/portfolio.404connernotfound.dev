import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;
export const ADMIN_SESSION_CLOCK_SKEW_MS = 60_000;

export type AdminSession = Readonly<{
	sessionId: string;
	issuedAt: number;
	expiresAt: number;
	version: string;
	generation: string;
}>;

export interface AdminSessionStore {
	getGeneration(): Promise<string | null>;
	initializeGeneration(): Promise<string>;
	read(sessionId: string): Promise<unknown>;
	create(session: AdminSession, ttlSeconds: number): Promise<void>;
	revoke(sessionId: string): Promise<void>;
	revokeAll(): Promise<void>;
}

const randomId = () => randomBytes(32).toString('base64url');
const identifierPattern = /^[A-Za-z0-9_-]{43}$/;
const cookiePattern = /^admin\.([A-Za-z0-9_-]{43})\.([1-9][0-9]{0,15})\.([A-Za-z0-9_-]{43})$/;

const parseCookie = (token: string) => {
	const match = cookiePattern.exec(token);
	if (!match) return null;
	const [, sessionId, timestamp, signature] = match;
	const issuedAt = Number(timestamp);
	if (!Number.isSafeInteger(issuedAt)) return null;
	return { sessionId, issuedAt, signature, payload: `admin.${sessionId}.${timestamp}` };
};

const parseSession = (value: unknown): AdminSession | null => {
	if (typeof value !== 'object' || value === null) return null;
	if (
		!('sessionId' in value) || typeof value.sessionId !== 'string' ||
		!identifierPattern.test(value.sessionId) ||
		!('issuedAt' in value) || typeof value.issuedAt !== 'number' ||
		!Number.isSafeInteger(value.issuedAt) || value.issuedAt <= 0 ||
		!('expiresAt' in value) || typeof value.expiresAt !== 'number' ||
		!Number.isSafeInteger(value.expiresAt) ||
		value.expiresAt !== value.issuedAt + ADMIN_SESSION_MAX_AGE_SECONDS * 1000 ||
		!('version' in value) || typeof value.version !== 'string' ||
		!('generation' in value) || typeof value.generation !== 'string' ||
		!identifierPattern.test(value.generation)
	) return null;
	return {
		sessionId: value.sessionId,
		issuedAt: value.issuedAt,
		expiresAt: value.expiresAt,
		version: value.version,
		generation: value.generation,
	};
};

export class SessionStoreUnavailableError extends Error {
	constructor() {
		super('The authoritative admin session store is unavailable.');
		this.name = 'SessionStoreUnavailableError';
	}
}

// Authentication always reads authoritative state; a valid signature alone grants nothing.
export const createAdminSessionService = (options: {
	store: AdminSessionStore;
	secret: () => string;
	version: () => string;
	now?: () => number;
}) => {
	const now = options.now ?? Date.now;
	const sign = (payload: string) =>
		createHmac('sha256', options.secret()).update(payload).digest('base64url');

	const authenticatedCookie = (token: string) => {
		const cookie = parseCookie(token);
		if (!cookie) return null;
		const actual = Buffer.from(cookie.signature);
		const expected = Buffer.from(sign(cookie.payload));
		return actual.length === expected.length && timingSafeEqual(actual, expected) ? cookie : null;
	};

	return {
		async create(): Promise<string> {
			const issuedAt = now();
			const sessionId = randomId();
			const payload = `admin.${sessionId}.${issuedAt}`;
			const token = `${payload}.${sign(payload)}`;
			const generation = await options.store.initializeGeneration();
			await options.store.create({
				sessionId,
				issuedAt,
				expiresAt: issuedAt + ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
				version: options.version(),
				generation,
			}, ADMIN_SESSION_MAX_AGE_SECONDS);
			return token;
		},
		async verify(token: string): Promise<boolean> {
			const cookie = authenticatedCookie(token);
			if (!cookie) return false;
			const currentTime = now();
			if (cookie.issuedAt > currentTime + ADMIN_SESSION_CLOCK_SKEW_MS ||
				currentTime >= cookie.issuedAt + ADMIN_SESSION_MAX_AGE_SECONDS * 1000) return false;
			const session = parseSession(await options.store.read(cookie.sessionId));
			if (!session || session.sessionId !== cookie.sessionId || session.issuedAt !== cookie.issuedAt ||
				session.expiresAt <= currentTime || session.version !== options.version()) return false;
			const generation = await options.store.getGeneration();
			return generation !== null && session.generation === generation;
		},
		async revoke(token: string): Promise<void> {
			// Permit expired cookies to be revoked, but never delete a key from an unsigned ID.
			const cookie = authenticatedCookie(token);
			if (cookie) await options.store.revoke(cookie.sessionId);
		},
		revokeAll: () => options.store.revokeAll(),
	};
};
