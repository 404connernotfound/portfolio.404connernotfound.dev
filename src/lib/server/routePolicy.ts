export type RouteClass = 'system' | 'admin-auth' | 'admin' | 'visitor-telemetry' | 'public';

const normalizePath = (pathname: string) => {
	// Match SvelteKit's decoding of path segments without decoding reserved slashes.
	const decoded = pathname.split('%25').map((segment) => decodeURI(segment)).join('%25');
	return decoded === '/' ? decoded : decoded.replace(/\/+$/, '');
};

export const classifyRoute = (pathname: string): RouteClass => {
	const path = normalizePath(pathname);
	if (path === '/healthz') return 'system';
	if (path === '/admin/login') return 'admin-auth';
	if (path === '/admin' || path.startsWith('/admin/')) return 'admin';
	if (path === '/tracking/events' || path === '/tracking/pixel') return 'visitor-telemetry';
	return 'public';
};

export const isMaintenanceExempt = (pathname: string) => {
	const route = classifyRoute(pathname);
	return route === 'system' || route === 'admin' || route === 'admin-auth' || normalizePath(pathname) === '/maintenance';
};

export const requiresAdminSession = (pathname: string) =>
	classifyRoute(pathname) === 'admin' || ['/collaborate', '/subscribe'].includes(normalizePath(pathname));
