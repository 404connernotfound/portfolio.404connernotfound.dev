import type { Handle, RequestEvent } from '@sveltejs/kit';
import { classifyRoute, isMaintenanceExempt, requiresAdminSession } from './routePolicy';

type SecurityDependencies = {
	getSiteSettings: () => Promise<{ maintenanceEnabled: number }>;
	isAdminAuthenticated: (event: RequestEvent) => Promise<boolean>;
};

export const createSecurityHandle = (dependencies: SecurityDependencies): Handle => async ({ event, resolve }) => {
	// The matched route also covers encoded URLs and SvelteKit data requests.
	const pathname = event.route.id ?? event.url.pathname;
	try { classifyRoute(pathname); } catch {
		return new Response('Invalid request path.', { status: 400 });
	}
	// Health probes must reach dependency checks even when settings storage is unavailable.
	if (classifyRoute(pathname) === 'system') return resolve(event);
	if (requiresAdminSession(pathname) && !(await dependencies.isAdminAuthenticated(event))) {
		const next = `${pathname}${event.url.search}`;
		return new Response(null, { status: 303, headers: { location: `/admin/login?next=${encodeURIComponent(next)}` } });
	}
	if (!isMaintenanceExempt(pathname)) {
		const settings = await dependencies.getSiteSettings();
		if (settings.maintenanceEnabled === 1) return new Response(null, { status: 307, headers: { location: '/maintenance' } });
	}
	const response = await resolve(event);
	const override = new Map([['/403', 403], ['/404', 404], ['/500', 500]]).get(pathname);
	return override ? new Response(response.body, { status: override, headers: response.headers }) : response;
};
