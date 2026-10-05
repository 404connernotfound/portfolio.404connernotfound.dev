import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getCsrfToken, validateCsrfToken } from '$lib/server/csrf';
import { isAdminAuthenticatedCached, setAdminSession, verifyAdminCredentials } from '$lib/server/auth';
import { rateLimit } from '$lib/server/rateLimit';
import { recordAdminActivity } from '$lib/server/telemetry/audit';

export const load: PageServerLoad = async (event) => {
	if (await isAdminAuthenticatedCached(event)) {
		throw redirect(303, '/admin');
	}

	return {
		csrfToken: getCsrfToken(event)
	};
};

export const actions: Actions = {
	default: async (event) => {
		const ip = event.getClientAddress();
		if (!(await rateLimit(`admin-login:${ip}`, { windowMs: 10 * 60 * 1000, max: 5 }))) {
			return fail(429, { message: 'Too many login attempts. Try again later.' });
		}

		const data = await event.request.formData();
		if (!validateCsrfToken(event, data)) {
			return fail(403, { message: 'Invalid CSRF token.' });
		}

		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '');

		if (!email || !password) {
			return fail(400, { message: 'Email and password are required.' });
		}

		let credentialsValid = false;
		try {
			credentialsValid = verifyAdminCredentials(email, password);
		} catch (error) {
			return fail(500, { message: 'Admin credentials are not configured.' });
		}

		if (!credentialsValid) {
			return fail(401, { message: 'Invalid credentials.' });
		}

		try {
			await setAdminSession(event);
		} catch (error) {
			console.error('[auth] failed to create admin session', error);
			return fail(503, { message: 'Admin login is temporarily unavailable.' });
		}
		await recordAdminActivity(event, { action: 'login', resource: 'session' });
		throw redirect(303, '/admin');
	}
};
