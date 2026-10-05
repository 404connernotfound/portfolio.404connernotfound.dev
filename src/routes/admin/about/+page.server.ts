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
	updateAbout: async (event) => {
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
			aboutHeadline: String(data.get('aboutHeadline') ?? '').trim(),
			aboutBody: String(data.get('aboutBody') ?? '').trim()
		});
		await recordAdminActivity(event, { action: 'settings_change', resource: 'about' });

		return { success: true, message: 'About content saved.' };
	}
};
