import { createHash } from 'node:crypto';

export type AdminActivity = {
	action: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'publish' | 'unpublish' | 'moderate' | 'status_change' | 'settings_change';
	resource: string;
	resourceId?: number | string;
};

export const adminActivityPayload = (activity: AdminActivity, sessionCookie: string) => JSON.stringify({
	resource: activity.resource,
	...(activity.resourceId === undefined ? {} : { resourceId: activity.resourceId }),
	sessionHash: createHash('sha256').update(sessionCookie).digest('hex'),
});
