import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getPlaysetById, getPlaysetBySlug } from '$lib/server/dataStore';
import { rateLimit } from '$lib/server/rateLimit';
import { isAdminAuthenticatedCached } from '$lib/server/auth';
import { playgroundConfig } from '$lib/server/playground/config';
import { createRuntimeSession, terminateSessionWithToken } from '$lib/server/playground/runtime';
import {
	ensurePlaygroundWebSocketServer,
	getPlaygroundWsClientUrl,
} from '$lib/server/playground/ws';

type SessionCreateBody = {
	playsetId?: number;
	playsetSlug?: string;
};

type SessionDeleteBody = {
	sessionId?: string;
	joinToken?: string;
};

const parseJson = async <T>(request: Request): Promise<T | null> => {
	const contentType = request.headers.get('content-type') ?? '';
	if (!contentType.includes('application/json')) return null;
	try {
		return (await request.json()) as T;
	} catch {
		return null;
	}
};

const hasAllowedOrigin = (request: Request, origin: string) => {
	const requestOrigin = request.headers.get('origin');
	if (!requestOrigin) return true;
	return requestOrigin === origin;
};

export const POST: RequestHandler = async (event) => {
	if (!playgroundConfig.enabled) {
		return json({ ok: false, message: 'Playground is disabled.' }, { status: 503 });
	}
	if (!(await isAdminAuthenticatedCached(event))) {
		return json(
			{ ok: false, message: 'Playground requires admin authentication.' },
			{ status: 403 },
		);
	}
	if (playgroundConfig.enforceSameOrigin && !hasAllowedOrigin(event.request, event.url.origin)) {
		return json({ ok: false, message: 'Forbidden origin.' }, { status: 403 });
	}

	const ip = event.getClientAddress();
	if (
		!(await rateLimit(`playground:create:${ip}`, {
			windowMs: 60_000,
			max: playgroundConfig.createRateLimitPerMinute,
		}))
	) {
		return json(
			{ ok: false, message: 'Rate limit exceeded. Try again in a minute.' },
			{ status: 429 },
		);
	}

	ensurePlaygroundWebSocketServer();

	const body = (await parseJson<SessionCreateBody>(event.request)) ?? {};
	const playsetId = Number(body.playsetId ?? 0);
	const playsetSlug = typeof body.playsetSlug === 'string' ? body.playsetSlug.trim() : '';

	const playset =
		playsetId > 0
			? await getPlaysetById(playsetId)
			: playsetSlug
				? await getPlaysetBySlug(playsetSlug)
				: undefined;
	if (!playset) {
		return json({ ok: false, message: 'Playset not found.' }, { status: 404 });
	}
	if (playset.enabled !== 1) {
		return json({ ok: false, message: 'Playset is disabled.' }, { status: 403 });
	}

	try {
		const runtimeSession = await createRuntimeSession(
			playset.id,
			ip,
			event.request.headers.get('user-agent'),
		);
		if (runtimeSession.status !== 'active') {
			return json(
				{
					ok: false,
					message: runtimeSession.reason ?? 'Unable to activate session.',
				},
				{ status: 503 },
			);
		}

		return json({
			ok: true,
			session: {
				sessionId: runtimeSession.sessionId,
				joinToken: runtimeSession.joinToken,
				status: runtimeSession.status,
			},
			playset: {
				id: runtimeSession.playset.id,
				name: runtimeSession.playset.name,
				slug: runtimeSession.playset.slug,
				runtime: runtimeSession.playset.runtime,
				defaultCommand: runtimeSession.playset.defaultCommand,
			},
			wsUrl: getPlaygroundWsClientUrl(event.url),
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to create playground session.';
		return json({ ok: false, message }, { status: 400 });
	}
};

export const DELETE: RequestHandler = async (event) => {
	if (!(await isAdminAuthenticatedCached(event))) {
		return json(
			{ ok: false, message: 'Playground requires admin authentication.' },
			{ status: 403 },
		);
	}
	if (playgroundConfig.enforceSameOrigin && !hasAllowedOrigin(event.request, event.url.origin)) {
		return json({ ok: false, message: 'Forbidden origin.' }, { status: 403 });
	}

	const ip = event.getClientAddress();
	if (!(await rateLimit(`playground:delete:${ip}`, { windowMs: 60_000, max: 30 }))) {
		return json(
			{ ok: false, message: 'Rate limit exceeded. Try again in a minute.' },
			{ status: 429 },
		);
	}

	const body = (await parseJson<SessionDeleteBody>(event.request)) ?? {};
	const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
	const joinToken = typeof body.joinToken === 'string' ? body.joinToken.trim() : '';
	if (!sessionId || !joinToken) {
		return json({ ok: false, message: 'sessionId and joinToken are required.' }, { status: 400 });
	}

	const stopped = await terminateSessionWithToken(sessionId, joinToken, 'client-shutdown');
	if (!stopped) {
		return json({ ok: false, message: 'Session not found or already closed.' }, { status: 404 });
	}

	return json({ ok: true });
};
