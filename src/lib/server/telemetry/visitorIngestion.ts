import { createHash } from 'node:crypto';
import type { RequestEvent } from '@sveltejs/kit';
import { parseVisitorEvent, type VisitorEvent } from '../../telemetry/visitor';

export const MAX_VISITOR_REQUEST_BYTES = 2_048;
type IngestionEvent = Pick<RequestEvent, 'request' | 'url' | 'getClientAddress'>;
type IngestionDependencies = {
	rateLimit: (key: string, options: { windowMs: number; max: number }) => Promise<boolean>;
	record: (event: VisitorEvent, referrerOrigin: string | null) => Promise<void>;
};

const sameOrigin = (event: IngestionEvent, requireReferrer = false) => {
	const origin = event.request.headers.get('origin');
	if (origin) return origin === event.url.origin;
	const site = event.request.headers.get('sec-fetch-site');
	if (site && site !== 'same-origin' && site !== 'none') return false;
	const referrer = event.request.headers.get('referer');
	if (!referrer) return !requireReferrer;
	try { return new URL(referrer).origin === event.url.origin; } catch { return false; }
};

const referrerOrigin = (request: Request) => {
	try { return new URL(request.headers.get('referer') ?? '').origin; } catch { return null; }
};

const readBoundedJson = async (request: Request): Promise<{ kind: 'value'; value: unknown } | { kind: 'invalid' | 'too-large' }> => {
	const length = request.headers.get('content-length');
	if (length && (!/^\d+$/.test(length) || Number(length) > MAX_VISITOR_REQUEST_BYTES)) return { kind: 'too-large' };
	const reader = request.body?.getReader();
	if (!reader) return { kind: 'invalid' };
	const chunks: Uint8Array[] = [];
	let bytes = 0;
	try {
		let chunk = await reader.read();
		while (!chunk.done) {
			bytes += chunk.value.byteLength;
			if (bytes > MAX_VISITOR_REQUEST_BYTES) {
				await reader.cancel();
				return { kind: 'too-large' };
			}
			chunks.push(chunk.value);
			chunk = await reader.read();
		}
		const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
		return { kind: 'value', value };
	} catch { return { kind: 'invalid' }; }
	finally { reader.releaseLock(); }
};

const allowRequest = (event: IngestionEvent, dependencies: IngestionDependencies) => {
	// This short-lived pseudonym only keys the limiter; visitor addresses are never persisted.
	const addressHash = createHash('sha256').update(`${new Date().toISOString().slice(0, 10)}:${event.getClientAddress()}`).digest('hex');
	return dependencies.rateLimit(`visitor-telemetry:${addressHash}`, { windowMs: 60_000, max: 120 });
};

export const createVisitorIngestion = (dependencies: IngestionDependencies) => ({
	options: (event: IngestionEvent) => new Response(null, { status: sameOrigin(event) ? 204 : 403 }),
	post: async (event: IngestionEvent) => {
		if (!sameOrigin(event)) return new Response('Forbidden origin.', { status: 403 });
		if (event.request.headers.get('dnt') === '1') return new Response(null, { status: 204 });
		if (event.request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return new Response('Expected JSON.', { status: 415 });
		if (!(await allowRequest(event, dependencies))) return new Response('Too Many Requests', { status: 429 });
		const parsed = await readBoundedJson(event.request);
		if (parsed.kind === 'too-large') return new Response('Payload too large.', { status: 413 });
		if (parsed.kind !== 'value') return new Response('Invalid JSON.', { status: 400 });
		const visitorEvent = parseVisitorEvent(parsed.value);
		if (!visitorEvent || visitorEvent.type === 'pixel') return new Response('Invalid visitor event.', { status: 400 });
		await dependencies.record(visitorEvent, referrerOrigin(event.request));
		return new Response(null, { status: 204 });
	},
	pixel: async (event: IngestionEvent) => {
		if (!sameOrigin(event, true)) return new Response('Forbidden origin.', { status: 403 });
		if (event.url.search.length > MAX_VISITOR_REQUEST_BYTES) return new Response('Payload too large.', { status: 413 });
		if ([...event.url.searchParams.keys()].some((key) => !['event', 'name', 'path', 'page'].includes(key))) return new Response('Invalid visitor event.', { status: 400 });
		const visitorEvent = parseVisitorEvent({ type: 'pixel', name: event.url.searchParams.get('event') ?? event.url.searchParams.get('name'), path: event.url.searchParams.get('path') ?? event.url.searchParams.get('page') });
		if (!visitorEvent) return new Response('Invalid visitor event.', { status: 400 });
		if (event.request.headers.get('dnt') !== '1') {
			if (!(await allowRequest(event, dependencies))) return new Response('Too Many Requests', { status: 429 });
			await dependencies.record(visitorEvent, referrerOrigin(event.request));
		}
		return new Response(Buffer.from('R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64'), { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
	},
});
