import type { RequestHandler } from './$types';
import { createTrackingEvent } from '$lib/server/telemetryStore';
import { rateLimit } from '$lib/server/rateLimit';
import { isAdminAuthenticatedCached } from '$lib/server/auth';

const PIXEL_BASE64 = 'R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
const MAX_NAME_LENGTH = 160;
const MAX_PATH_LENGTH = 2_048;
const MAX_PAYLOAD_BYTES = 2_048;
const MAX_REFERRER_LENGTH = 2_048;
const MAX_UA_LENGTH = 512;

const truncateBytes = (value: string, maxBytes: number) => {
	if (Buffer.byteLength(value) <= maxBytes) return value;
	let output = value;
	while (output.length > 0 && Buffer.byteLength(output) > maxBytes) {
		output = output.slice(0, -1);
	}
	return output;
};

const normalizeText = (value: string | null, maxBytes: number) => {
	if (!value) return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	return truncateBytes(trimmed, maxBytes);
};

const isSameSitePixel = (event: Parameters<RequestHandler>[0]) => {
	const origin = event.request.headers.get('origin');
	if (origin) {
		return origin === event.url.origin;
	}
	const referrer = event.request.headers.get('referer');
	if (!referrer) return false;
	try {
		return new URL(referrer).origin === event.url.origin;
	} catch {
		return false;
	}
};

export const GET: RequestHandler = async (event) => {
	if (!(await isAdminAuthenticatedCached(event))) {
		return new Response('Forbidden', { status: 403 });
	}

	if (!isSameSitePixel(event)) {
		return new Response('Forbidden', { status: 403 });
	}

	const ip = event.getClientAddress();
	if (!(await rateLimit(`tracking-pixel:${ip}`, { windowMs: 60_000, max: 240 }))) {
		return new Response('Too Many Requests', { status: 429 });
	}

	const url = event.url;
	const name = normalizeText(
		url.searchParams.get('event') ?? url.searchParams.get('name'),
		MAX_NAME_LENGTH,
	);
	const pathValue = normalizeText(
		url.searchParams.get('path') ?? url.searchParams.get('page'),
		MAX_PATH_LENGTH,
	);
	const referrer = normalizeText(event.request.headers.get('referer'), MAX_REFERRER_LENGTH);
	const userAgent = normalizeText(event.request.headers.get('user-agent'), MAX_UA_LENGTH);
	const payload = normalizeText(url.searchParams.get('payload'), MAX_PAYLOAD_BYTES);
	const safeIp = normalizeText(ip, 80);

	try {
		await createTrackingEvent('pixel', name, pathValue, referrer, userAgent, safeIp, payload);
	} catch {
		// Ignore tracking failures.
	}

	const buffer = Buffer.from(PIXEL_BASE64, 'base64');
	return new Response(buffer, {
		headers: {
			'Content-Type': 'image/gif',
			'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
			Pragma: 'no-cache',
			Expires: '0',
		},
	});
};
