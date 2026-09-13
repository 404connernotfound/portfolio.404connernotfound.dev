import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { createTestimonial } from '$lib/server/dataStore';
import { rateLimit } from '$lib/server/rateLimit';
import { parseReviewRating } from '$lib/reviews/reviewSubmission';
import { reviewFingerprint } from '$lib/server/reviewFingerprint';

const MAX_NAME_LENGTH = 120;
const MAX_CONTEXT_LENGTH = 180;
const MAX_REVIEW_LENGTH = 2_000;

export const actions: Actions = {
	submit: async (event) => {
		const data = await event.request.formData();
		const name = String(data.get('name') ?? '').trim();
		const company = String(data.get('company') ?? '').trim();
		const project = String(data.get('project') ?? '').trim();
		const quote = String(data.get('review') ?? '').trim();
		const ratingValue = String(data.get('rating') ?? '').trim();
		const website = String(data.get('website') ?? '').trim();
		const fields = { name, company, project, quote, rating: ratingValue };

		if (website) return { success: true };

		const ip = event.getClientAddress();
		if (!(await rateLimit(`review:${ip}`, { windowMs: 24 * 60 * 60 * 1000, max: 3 }))) {
			return fail(429, { message: 'Review limit reached. Please try again tomorrow.', fields });
		}

		const rating = parseReviewRating(ratingValue);
		if (!name || !quote || !rating) {
			return fail(400, { message: 'Add your name, a star rating, and your review.', fields });
		}
		if (
			name.length > MAX_NAME_LENGTH ||
			company.length > MAX_CONTEXT_LENGTH ||
			project.length > MAX_CONTEXT_LENGTH
		) {
			return fail(400, { message: 'Name, company, or project is longer than expected.', fields });
		}
		if (quote.length < 20 || quote.length > MAX_REVIEW_LENGTH) {
			return fail(400, { message: 'Please write between 20 and 2,000 characters.', fields });
		}

		try {
			const created = await createTestimonial(
				name,
				null,
				company || null,
				quote,
				project || null,
				null,
				null,
				rating,
				reviewFingerprint({ name, quote, clientAddress: ip }),
			);
			if (!created) {
				return fail(409, { message: 'This review has already been received.', fields });
			}
		} catch {
			return fail(500, {
				message: 'I could not save your review. Please try again shortly.',
				fields,
			});
		}

		return { success: true };
	},
};
