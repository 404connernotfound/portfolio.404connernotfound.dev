import type { Handle } from '@sveltejs/kit';
import { getSiteSettings } from '$lib/server/dataStore';
import { isAdminAuthenticatedCached } from '$lib/server/auth';

const shouldBypassMaintenance = (pathname: string) =>
	pathname.startsWith('/admin') || pathname === '/maintenance';

const loginRequiredPaths = new Set([
	'/assets',
	'/collaborate',
	'/create-testimonials',
	'/journey',
	'/playground',
	'/subscribe',
	'/testimonials',
	'/vision',
]);

const normalizePath = (pathname: string) => {
	if (pathname === '/') return pathname;
	return pathname.replace(/\/+$/, '');
};

const isAdminPath = (pathname: string) =>
	pathname.startsWith('/admin') && pathname !== '/admin/login';

const isTelemetryPath = (pathname: string) => pathname.startsWith('/tracking/');

const requiresLogin = (pathname: string) => {
	const normalized = normalizePath(pathname);
	return (
		loginRequiredPaths.has(normalized) || isAdminPath(normalized) || isTelemetryPath(normalized)
	);
};

const statusOverride = (pathname: string) => {
	if (pathname === '/403') return 403;
	if (pathname === '/404') return 404;
	if (pathname === '/500') return 500;
	return null;
};

export const handle: Handle = async ({ event, resolve }) => {
	const settings = await getSiteSettings();
	const pathname = event.url.pathname;

	if (requiresLogin(pathname) && !(await isAdminAuthenticatedCached(event))) {
		if (isTelemetryPath(pathname)) {
			return new Response('Forbidden', { status: 403 });
		}

		const next = `${pathname}${event.url.search}`;
		return new Response(null, {
			status: 303,
			headers: {
				location: `/admin/login?next=${encodeURIComponent(next)}`,
			},
		});
	}

	if (settings.maintenanceEnabled === 1 && !shouldBypassMaintenance(pathname)) {
		return new Response(null, {
			status: 307,
			headers: {
				location: '/maintenance',
			},
		});
	}

	const response = await resolve(event);
	const override = statusOverride(pathname);
	if (override) {
		return new Response(response.body, {
			status: override,
			headers: response.headers,
		});
	}

	return response;
};
