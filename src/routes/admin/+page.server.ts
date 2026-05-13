import type { Actions, PageServerLoad } from './$types';
import { requireAdminCached, clearAdminSession } from '$lib/server/auth';
import { getCsrfToken, validateCsrfToken } from '$lib/server/csrf';
import { getPosts, getWorkItems } from '$lib/server/dataStore';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	await requireAdminCached(event);
	const [posts, workItems] = await Promise.all([getPosts(), getWorkItems()]);

	return {
		stats: {
			posts: posts.length,
			publishedPosts: posts.filter((post) => post.draft === 0).length,
			draftPosts: posts.filter((post) => post.draft === 1).length,
			workItems: workItems.length,
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
		clearAdminSession(event);
		throw redirect(303, '/admin/login');
	},
};
