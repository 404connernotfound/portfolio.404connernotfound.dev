import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireAdminCached } from '$lib/server/auth';
import { getCsrfToken, validateCsrfToken } from '$lib/server/csrf';
import { getTestimonials, updateTestimonialApproval } from '$lib/server/dataStore';
import { isReviewModeration, moderationToDatabase } from '$lib/reviews/reviewSubmission';

export const load: PageServerLoad = async (event) => {
	await requireAdminCached(event);
	return { reviews: await getTestimonials(), csrfToken: getCsrfToken(event) };
};

export const actions: Actions = {
	moderate: async (event) => {
		await requireAdminCached(event);
		const data = await event.request.formData();
		if (!validateCsrfToken(event, data)) return fail(403, { message: 'Invalid CSRF token.' });
		const id = Number(data.get('id'));
		const moderation = String(data.get('moderation') ?? '');
		if (!Number.isInteger(id) || id < 1 || !isReviewModeration(moderation)) {
			return fail(400, { message: 'Invalid review update.' });
		}
		await updateTestimonialApproval(id, moderationToDatabase(moderation));
		return { success: true, message: 'Review moderation updated.' };
	},
};
