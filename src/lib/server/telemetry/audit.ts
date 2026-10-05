import type { RequestEvent } from '@sveltejs/kit';
import { isAdminAuthenticatedCached } from '../auth';
import { createTrackingEvent } from '../telemetryStore';
import { adminActivityPayload, type AdminActivity } from './adminActivity';

export const recordAdminActivity = async (event: RequestEvent, activity: AdminActivity) => {
	if (!(await isAdminAuthenticatedCached(event))) throw new Error('Admin audit requires an active authenticated session.');
	const cookie = event.cookies.get('admin_session');
	if (!cookie) throw new Error('Admin audit requires a session cookie.');
	await createTrackingEvent('admin_audit', activity.action, event.url.pathname, null, null, null,
		adminActivityPayload(activity, cookie), { actorType: 'admin', source: 'server' });
};
