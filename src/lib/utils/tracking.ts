import { dev } from '$app/environment';

export type TrackingPayload = {
	type?: string;
	name?: string;
	path?: string;
	data?: Record<string, unknown>;
};

const sendPayload = (payload: TrackingPayload) => {
	if (dev) return;
	if (typeof window === 'undefined') return;
	if (!window.location.pathname.startsWith('/admin')) return;

	const body = JSON.stringify({
		type: payload.type ?? 'event',
		name: payload.name ?? null,
		path: payload.path ?? null,
		...(payload.data ?? {}),
	});

	if (navigator.sendBeacon) {
		const blob = new Blob([body], { type: 'application/json' });
		navigator.sendBeacon('/tracking/events', blob);
		return;
	}

	fetch('/tracking/events', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body,
		keepalive: true,
	}).catch(() => undefined);
};

export const trackEvent = (payload: TrackingPayload) => {
	sendPayload(payload);
};

export const trackPageview = (path?: string) => {
	const pagePath = path ?? `${window.location.pathname}${window.location.search}`;
	sendPayload({
		type: 'pageview',
		name: document.title || 'pageview',
		path: pagePath,
	});
};
