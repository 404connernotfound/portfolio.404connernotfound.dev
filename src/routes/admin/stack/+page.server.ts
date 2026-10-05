import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import {
	getSiteSettings,
	updateSiteSettings,
	getStackItems,
	createStackItem,
	updateStackItem,
	deleteStackItem,
	reorderStackItems
} from '$lib/server/dataStore';
import { requireAdminCached } from '$lib/server/auth';
import { recordAdminActivity } from '$lib/server/telemetry/audit';
import { getCsrfToken, validateCsrfToken } from '$lib/server/csrf';

const parseNumber = (value: FormDataEntryValue | null, fallback = 0) => {
	if (typeof value !== 'string') return fallback;
	const parsed = Number(value);
	return Number.isNaN(parsed) ? fallback : parsed;
};

export const load: PageServerLoad = async (event) => {
	await requireAdminCached(event);
	return {
		siteSettings: await getSiteSettings(),
		stackItems: await getStackItems(),
		csrfToken: getCsrfToken(event)
	};
};

export const actions: Actions = {
	updateStackSection: async (event) => {
		await requireAdminCached(event);
		const data = await event.request.formData();
		if (!validateCsrfToken(event, data)) {
			return fail(403, { action: 'updateStackSection', message: 'Invalid CSRF token.' });
		}

			const current = await getSiteSettings();
			const { id: _id, ...rest } = current;
			void _id;
			await updateSiteSettings({
			...rest,
			stackTitle: String(data.get('stackTitle') ?? '').trim(),
			stackIntro: String(data.get('stackIntro') ?? '').trim()
		});
		await recordAdminActivity(event, { action: 'settings_change', resource: 'stack' });

		return { success: true, message: 'Stack section saved.', action: 'updateStackSection' };
	},
	createStack: async (event) => {
		await requireAdminCached(event);
		const data = await event.request.formData();
		if (!validateCsrfToken(event, data)) {
			return fail(403, { action: 'createStack', message: 'Invalid CSRF token.' });
		}

		const label = String(data.get('label') ?? '').trim();
		const detail = String(data.get('detail') ?? '').trim();
		const category = String(data.get('category') ?? '').trim();
		if (!label) {
			return fail(400, { action: 'createStack', message: 'Label is required.', fieldErrors: { label: 'Label is required.' } });
		}

		await createStackItem(label, detail || null, category || null, parseNumber(data.get('sort')));
		await recordAdminActivity(event, { action: 'create', resource: 'stack' });
		return { success: true, message: 'Stack item added.', action: 'createStack' };
	},
	updateStack: async (event) => {
		await requireAdminCached(event);
		const data = await event.request.formData();
		if (!validateCsrfToken(event, data)) {
			return fail(403, { action: 'updateStack', message: 'Invalid CSRF token.' });
		}

		const id = parseNumber(data.get('id'), -1);
		const label = String(data.get('label') ?? '').trim();
		const detail = String(data.get('detail') ?? '').trim();
		const category = String(data.get('category') ?? '').trim();
		if (id <= 0 || !label) {
			return fail(400, { action: 'updateStack', message: 'Label is required.', itemId: id, fieldErrors: { label: 'Label is required.' } });
		}

		await updateStackItem(id, label, detail || null, category || null, parseNumber(data.get('sort')));
		await recordAdminActivity(event, { action: 'update', resource: 'stack', resourceId: id });
		return { success: true, message: 'Stack item updated.', action: 'updateStack', itemId: id };
	},
	reorderStack: async (event) => {
		await requireAdminCached(event);
		const data = await event.request.formData();
		if (!validateCsrfToken(event, data)) {
			return fail(403, { action: 'reorderStack', message: 'Invalid CSRF token.' });
		}

		const rawOrder = String(data.get('order') ?? '').trim();
		if (!rawOrder) {
			return fail(400, { action: 'reorderStack', message: 'Invalid stack order.' });
		}

		const orderedIds = rawOrder
			.split(',')
			.map((value) => Number(value.trim()))
			.filter((value) => Number.isInteger(value) && value > 0);

		if (!orderedIds.length) {
			return fail(400, { action: 'reorderStack', message: 'Invalid stack order.' });
		}

		await reorderStackItems(orderedIds);
		await recordAdminActivity(event, { action: 'update', resource: 'stack_order' });
		return { success: true, message: 'Stack order updated.', action: 'reorderStack' };
	},
	deleteStack: async (event) => {
		await requireAdminCached(event);
		const data = await event.request.formData();
		if (!validateCsrfToken(event, data)) {
			return fail(403, { action: 'deleteStack', message: 'Invalid CSRF token.' });
		}
		const id = parseNumber(data.get('id'), -1);
		if (id <= 0) {
			return fail(400, { action: 'deleteStack', message: 'Invalid item.' });
		}
		await deleteStackItem(id);
		await recordAdminActivity(event, { action: 'delete', resource: 'stack', resourceId: id });
		return { success: true, message: 'Stack item deleted.', action: 'deleteStack', itemId: id };
	}
};
