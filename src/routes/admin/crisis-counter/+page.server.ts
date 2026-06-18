import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import {
	getCrisisItems,
	createCrisisItem,
	updateCrisisItem,
	deleteCrisisItem
} from '$lib/server/dataStore';
import { requireAdminCached } from '$lib/server/auth';
import { getCsrfToken, validateCsrfToken } from '$lib/server/csrf';

const parseNumber = (value: FormDataEntryValue | null, fallback = 0) => {
	if (typeof value !== 'string') return fallback;
	const parsed = Number(value);
	return Number.isNaN(parsed) ? fallback : parsed;
};

const parseText = (value: FormDataEntryValue | null) => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
};

export const load: PageServerLoad = async (event) => {
	await requireAdminCached(event);
	return {
		crisisItems: await getCrisisItems(),
		csrfToken: getCsrfToken(event)
	};
};

export const actions: Actions = {
	createCrisis: async (event) => {
		await requireAdminCached(event);
		const data = await event.request.formData();
		if (!validateCsrfToken(event, data)) {
			return fail(403, { action: 'createCrisis', message: 'Invalid CSRF token.' });
		}

		const title = String(data.get('title') ?? '').trim();
		const description = parseText(data.get('description'));
		const category = parseText(data.get('category'));
		if (!title) {
			return fail(400, {
				action: 'createCrisis',
				message: 'Title is required.',
				fieldErrors: { title: 'Title is required.' }
			});
		}

		await createCrisisItem(title, description, category, parseNumber(data.get('sort')));
		return { success: true, message: 'Crisis added.', action: 'createCrisis' };
	},
	updateCrisis: async (event) => {
		await requireAdminCached(event);
		const data = await event.request.formData();
		if (!validateCsrfToken(event, data)) {
			return fail(403, { action: 'updateCrisis', message: 'Invalid CSRF token.' });
		}

		const id = parseNumber(data.get('id'), -1);
		const title = String(data.get('title') ?? '').trim();
		const description = parseText(data.get('description'));
		const category = parseText(data.get('category'));
		if (id <= 0 || !title) {
			return fail(400, {
				action: 'updateCrisis',
				message: 'Title is required.',
				itemId: id,
				fieldErrors: { title: 'Title is required.' }
			});
		}

		await updateCrisisItem(id, title, description, category, parseNumber(data.get('sort')));
		return { success: true, message: 'Crisis updated.', action: 'updateCrisis', itemId: id };
	},
	deleteCrisis: async (event) => {
		await requireAdminCached(event);
		const data = await event.request.formData();
		if (!validateCsrfToken(event, data)) {
			return fail(403, { action: 'deleteCrisis', message: 'Invalid CSRF token.' });
		}
		const id = parseNumber(data.get('id'), -1);
		if (id <= 0) {
			return fail(400, { action: 'deleteCrisis', message: 'Invalid crisis.' });
		}
		await deleteCrisisItem(id);
		return { success: true, message: 'Crisis deleted.', action: 'deleteCrisis', itemId: id };
	}
};
