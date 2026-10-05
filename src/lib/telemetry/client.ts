import { dev } from '$app/environment';
import { visitorPath, type VisitorEventType } from './visitor';

export type TrackingPayload = { type?: VisitorEventType; name?: string; path?: string };

export const trackEvent = (payload: TrackingPayload) => {
	if (dev || typeof window === 'undefined') return;
	const currentPath = visitorPath(window.location.pathname);
	if (currentPath === null) return;
	if (navigator.doNotTrack === '1') return;
	const path = visitorPath(payload.path ?? currentPath);
	if (path === null) return;
	const body = JSON.stringify({ type: payload.type ?? 'cta_click', name: payload.name ?? null, path });
	if (navigator.sendBeacon?.('/tracking/events', new Blob([body], { type: 'application/json' }))) return;
	void fetch('/tracking/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true })
		.catch((error: unknown) => { if (dev) console.warn('Visitor telemetry failed.', error); });
};

export const trackPageview = (path?: string) => trackEvent({ type: 'pageview', path });
