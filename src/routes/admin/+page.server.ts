import type { Actions, PageServerLoad } from './$types';
import { requireAdminCached, clearAdminSession } from '$lib/server/auth';
import { getCsrfToken, validateCsrfToken } from '$lib/server/csrf';
import { getAppointments, getPosts, getTestimonials, getWorkItems } from '$lib/server/dataStore';
import { fail, redirect } from '@sveltejs/kit';
import { recordAdminActivity } from '$lib/server/telemetry/audit';

export const load: PageServerLoad = async (event) => {
	await requireAdminCached(event);
	const [posts, workItems, appointments, reviews] = await Promise.all([
		getPosts(),
		getWorkItems(),
		getAppointments(),
		getTestimonials(),
	]);

	return {
		stats: {
			posts: posts.length,
			publishedPosts: posts.filter((post) => post.draft === 0).length,
			draftPosts: posts.filter((post) => post.draft === 1).length,
			workItems: workItems.length,
			pendingAppointments: appointments.filter((appointment) => appointment.status === 'pending')
				.length,
			pendingReviews: reviews.filter((review) => review.approved === 0 || review.approved === null).length,
		},
		csrfToken: getCsrfToken(event),
	};
};

export const actions: Actions = {
	logout: async (event) => {
		await requireAdminCached(event);
		const data = await event.request.formData();
		if (!validateCsrfToken(event, data)) {
			return fail(403, { message: 'Invalid CSRF token.' });
		}
		let auditError: unknown;
		try {
			await recordAdminActivity(event, { action: 'logout', resource: 'session' });
		} catch (error) {
			auditError = error;
		}
		try {
			await clearAdminSession(event);
		} catch (error) {
			console.error('[auth] failed to revoke admin session', error);
			return fail(503, { message: 'Session revocation failed. Try logging out again.' });
		}
		// Telemetry storage failure must never keep an authenticated session alive.
		if (auditError) throw auditError;
		throw redirect(303, '/admin/login');
	},
};
