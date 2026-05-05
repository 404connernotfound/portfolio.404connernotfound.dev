import type { RequestHandler } from './$types';
import { createTrackingEvent } from '$lib/server/telemetryStore';
import { rateLimit } from '$lib/server/rateLimit';
import { isAdminAuthenticatedCached } from '$lib/server/auth';

const MAX_REQUEST_BYTES = 8_192;
const MAX_PAYLOAD_BYTES = 4_096;
const MAX_TYPE_LENGTH = 40;
const MAX_NAME_LENGTH = 160;
const MAX_PATH_LENGTH = 2_048;
const MAX_REFERRER_LENGTH = 2_048;
const MAX_UA_LENGTH = 512;
const ALLOWED_EVENT_TYPES = new Set(['event', 'pageview', 'form_submit', 'pixel']);

const truncateBytes = (value: string, maxBytes: number) => {
	if (Buffer.byteLength(value) <= maxBytes) return value;
	let output = value;
	while (output.length > 0 && Buffer.byteLength(output) > maxBytes) {
		output = output.slice(0, -1);
	}
	return output;
};

const normalizeText = (value: unknown, maxBytes: number) => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	return truncateBytes(trimmed, maxBytes);
};

const getEventType = (value: unknown) => {
	const normalized = normalizeText(value, MAX_TYPE_LENGTH);
	if (!normalized) return 'event';
	return ALLOWED_EVENT_TYPES.has(normalized) ? normalized : 'event';
};

const isSameOrigin = (request: Request, origin: string) => {
	const requestOrigin = request.headers.get('origin');
	if (!requestOrigin) return true;
	return requestOrigin === origin;
};

const parsePayload = async (request: Request) => {
	const contentType = request.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		try {
			const json = (await request.json()) as Record<string, unknown>;
			return { data: json, raw: truncateBytes(JSON.stringify(json), MAX_PAYLOAD_BYTES) };
		} catch {
			return { data: {} as Record<string, unknown>, raw: null };
		}
	}
	if (
		contentType.includes('application/x-www-form-urlencoded') ||
		contentType.includes('multipart/form-data')
	) {
		const form = await request.formData();
		const entries = Object.fromEntries(form.entries()) as Record<string, unknown>;
		return { data: entries, raw: truncateBytes(JSON.stringify(entries), MAX_PAYLOAD_BYTES) };
	}
	return { data: {} as Record<string, unknown>, raw: null };
};

const tooLarge = (request: Request) => {
	const contentLengthRaw = request.headers.get('content-length');
	if (!contentLengthRaw) return false;
	const contentLength = Number(contentLengthRaw);
	if (!Number.isFinite(contentLength)) return false;
	return contentLength > MAX_REQUEST_BYTES;
};

export const OPTIONS: RequestHandler = (event) => {
	if (!isSameOrigin(event.request, event.url.origin)) {
		return new Response('Forbidden', { status: 403 });
	}
	return new Response(null, { status: 204 });
};

export const POST: RequestHandler = async (event) => {
	if (!(await isAdminAuthenticatedCached(event))) {
		return new Response(JSON.stringify({ ok: false, message: 'Forbidden.' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (!isSameOrigin(event.request, event.url.origin)) {
		return new Response(JSON.stringify({ ok: false, message: 'Forbidden origin.' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	if (tooLarge(event.request)) {
		return new Response(JSON.stringify({ ok: false, message: 'Payload too large.' }), {
			status: 413,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const ip = event.getClientAddress();
	if (!(await rateLimit(`tracking-events:${ip}`, { windowMs: 60_000, max: 120 }))) {
		return new Response(JSON.stringify({ ok: false, message: 'Rate limit exceeded.' }), {
			status: 429,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const { data, raw } = await parsePayload(event.request);
	const type = getEventType(data.type);
	const name = normalizeText(
		typeof data.event === 'string' ? data.event : data.name,
		MAX_NAME_LENGTH,
	);
	const pathValue = normalizeText(data.path, MAX_PATH_LENGTH);
	const referrer = normalizeText(event.request.headers.get('referer'), MAX_REFERRER_LENGTH);
	const userAgent = normalizeText(event.request.headers.get('user-agent'), MAX_UA_LENGTH);
	const safeIp = normalizeText(ip, 80);

	try {
		await createTrackingEvent(type, name, pathValue, referrer, userAgent, safeIp, raw);
	} catch {
		// Ignore tracking failures.
	}

	return new Response(JSON.stringify({ ok: true }), {
		headers: {
			'Content-Type': 'application/json',
		},
	});
};
