import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { getSiteSettings, updateSiteSettings } from '$lib/server/dataStore';
import { requireAdminCached } from '$lib/server/auth';
import { recordAdminActivity } from '$lib/server/telemetry/audit';
import { getCsrfToken, validateCsrfToken } from '$lib/server/csrf';

export const load: PageServerLoad = async (event) => {
	await requireAdminCached(event);
	return {
		siteSettings: await getSiteSettings(),
		csrfToken: getCsrfToken(event)
	};
};

export const actions: Actions = {
	updateErrors: async (event) => {
		await requireAdminCached(event);
		const data = await event.request.formData();
		if (!validateCsrfToken(event, data)) {
			return fail(403, { message: 'Invalid CSRF token.' });
		}

			const current = await getSiteSettings();
			const { id: _id, ...rest } = current;
			void _id;

			await updateSiteSettings({
			...rest,
			maintenanceEnabled: data.getAll('maintenanceEnabled').some((value) => value === '1') ? 1 : 0,
			maintenanceTitle: String(data.get('maintenanceTitle') ?? '').trim(),
			maintenanceBody: String(data.get('maintenanceBody') ?? '').trim(),
			error403Title: String(data.get('error403Title') ?? '').trim(),
			error403Body: String(data.get('error403Body') ?? '').trim(),
			error404Title: String(data.get('error404Title') ?? '').trim(),
			error404Body: String(data.get('error404Body') ?? '').trim(),
			error500Title: String(data.get('error500Title') ?? '').trim(),
			error500Body: String(data.get('error500Body') ?? '').trim()
		});
		await recordAdminActivity(event, { action: 'settings_change', resource: 'errors' });

		return { success: true, message: 'System pages saved.' };
	}
};
