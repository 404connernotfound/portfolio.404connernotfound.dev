import type { Actions, PageServerLoad } from './$types';
import { fail, type RequestEvent } from '@sveltejs/kit';
import {
	getSiteSettings,
	restoreSiteSettingsDefaults,
	updateSiteSettings,
	type SiteSettingsDefaultSection,
} from '$lib/server/dataStore';
import { requireAdminCached } from '$lib/server/auth';
import { getCsrfToken, validateCsrfToken } from '$lib/server/csrf';

export const load: PageServerLoad = async (event) => {
	await requireAdminCached(event);
	return {
		siteSettings: await getSiteSettings(),
		csrfToken: getCsrfToken(event),
	};
};

export const actions: Actions = {
	updateSite: async (event) => {
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
			heroHeadline: String(data.get('heroHeadline') ?? '').trim(),
			heroSubheadline: String(data.get('heroSubheadline') ?? '').trim(),
			heroNoteTitle: String(data.get('heroNoteTitle') ?? '').trim(),
			heroNoteBody: String(data.get('heroNoteBody') ?? '').trim(),
			heroHighlightsTitle: String(data.get('heroHighlightsTitle') ?? '').trim(),
			heroHighlightsBody: String(data.get('heroHighlightsBody') ?? '').trim(),
			focusHeadline: String(data.get('focusHeadline') ?? '').trim(),
			focusBody: String(data.get('focusBody') ?? '').trim(),
		});

		return { success: true, message: 'Site settings saved.' };
	},
	restoreHeroDefaults: (event) => restoreDefaults(event, 'hero'),
	restoreFocusDefaults: (event) => restoreDefaults(event, 'focus'),
};

const restoreDefaults = async (event: RequestEvent, section: SiteSettingsDefaultSection) => {
	await requireAdminCached(event);
	const data = await event.request.formData();
	if (!validateCsrfToken(event, data)) {
		return fail(403, { message: 'Invalid CSRF token.' });
	}

	await restoreSiteSettingsDefaults(section);
	return {
		success: true,
		message: `${section === 'hero' ? 'Hero' : 'Focus'} copy restored to the portfolio defaults.`,
	};
};
