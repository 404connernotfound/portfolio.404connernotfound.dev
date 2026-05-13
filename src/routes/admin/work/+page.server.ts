import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import {
	getSiteSettings,
	updateSiteSettings,
	getWorkItems,
	createWorkItem,
	updateWorkItem,
	deleteWorkItem
} from '$lib/server/dataStore';
import { requireAdminCached } from '$lib/server/auth';
import { getCsrfToken, validateCsrfToken } from '$lib/server/csrf';
import { parseExternalImageUrl } from '$lib/server/contentValidation';

const MAX_LENGTHS = {
	title: 120,
	description: 500,
	longDescription: 4000,
	highlights: 600,
	role: 80,
	tech: 80,
	link: 2048,
	imageAlt: 180
};

const WORK_MEDIA_DIR = path.resolve('static/assets/work');
const ALLOWED_IMAGE_MIME = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
	'image/avif'
]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

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

const parseCheckbox = (data: FormData, name: string) =>
	data.getAll(name).some((value) => value === '1') ? 1 : 0;

const isSafeUrl = (value: string) => {
	if (value.startsWith('/') || value.startsWith('#')) return true;
	try {
		const url = new URL(value);
		return ['http:', 'https:', 'mailto:'].includes(url.protocol);
	} catch {
		return false;
	}
};

const ensureMaxLength = (value: string, max: number, label: string) =>
	value.length > max ? `${label} must be ${max} characters or fewer.` : null;

const ensureOptionalMaxLength = (value: string | null, max: number, label: string) =>
	value ? ensureMaxLength(value, max, label) : null;

const sanitizeFilename = (value: string) =>
	value
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9._-]/g, '')
		.replace(/^-+|-+$/g, '') || 'work-image';

const parseImageFile = (value: FormDataEntryValue | null) => {
	if (!(value instanceof File)) return null;
	if (!value.name || value.size <= 0) return null;
	return value;
};

const saveWorkImage = async (file: File) => {
	const original = path.basename(file.name);
	const safeName = sanitizeFilename(original);
	const filename = `${Date.now()}-${safeName}`;
	fs.mkdirSync(WORK_MEDIA_DIR, { recursive: true });
	const buffer = Buffer.from(await file.arrayBuffer());
	const fullPath = path.join(WORK_MEDIA_DIR, filename);
	fs.writeFileSync(fullPath, buffer);
	return `/assets/work/${filename}`;
};

const deleteWorkImage = (publicPath: string | null) => {
	if (!publicPath) return;
	const staticRoot = path.resolve('static');
	const resolved = path.resolve(staticRoot, publicPath.replace(/^\/+/, ''));
	if (!resolved.startsWith(WORK_MEDIA_DIR)) return;
	if (fs.existsSync(resolved)) {
		fs.unlinkSync(resolved);
	}
};

export const load: PageServerLoad = async (event) => {
	await requireAdminCached(event);
	return {
		siteSettings: await getSiteSettings(),
		workItems: await getWorkItems(),
		csrfToken: getCsrfToken(event)
	};
};

export const actions: Actions = {
	updateWorkSection: async (event) => {
		await requireAdminCached(event);
		const data = await event.request.formData();
		if (!validateCsrfToken(event, data)) {
			return fail(403, { action: 'updateWorkSection', message: 'Invalid CSRF token.' });
		}
			const current = await getSiteSettings();
			const { id: _id, ...rest } = current;
			void _id;
			await updateSiteSettings({
			...rest,
			workTitle: String(data.get('workTitle') ?? '').trim(),
			workIntro: String(data.get('workIntro') ?? '').trim()
		});
		return { success: true, message: 'Work section saved.', action: 'updateWorkSection' };
	},
	createWork: async (event) => {
		await requireAdminCached(event);
		const data = await event.request.formData();
		if (!validateCsrfToken(event, data)) {
			return fail(403, { action: 'createWork', message: 'Invalid CSRF token.' });
		}

		const title = String(data.get('title') ?? '').trim();
		const description = String(data.get('description') ?? '').trim();
		const longDescription = parseText(data.get('longDescription'));
		const highlights = parseText(data.get('highlights'));
		const role = parseText(data.get('role'));
		const tech = parseText(data.get('tech'));
		const linkRaw = parseText(data.get('link'));
		const imageAlt = parseText(data.get('imageAlt'));
		const imageFile = parseImageFile(data.get('image'));
		const imageUrlResult = parseExternalImageUrl(data.get('imageUrl'));
		const errors: Record<string, string> = {};

		if (!title) errors.title = 'Title is required.';
		if (!description) errors.description = 'Description is required.';
		const titleError = ensureMaxLength(title, MAX_LENGTHS.title, 'Title');
		if (titleError) errors.title = titleError;
		const descError = ensureMaxLength(description, MAX_LENGTHS.description, 'Description');
		if (descError) errors.description = descError;
		const longError = ensureOptionalMaxLength(longDescription, MAX_LENGTHS.longDescription, 'Long description');
		if (longError) errors.longDescription = longError;
		const highlightError = ensureOptionalMaxLength(highlights, MAX_LENGTHS.highlights, 'Highlights');
		if (highlightError) errors.highlights = highlightError;
		const roleError = ensureOptionalMaxLength(role, MAX_LENGTHS.role, 'Role');
		if (roleError) errors.role = roleError;
		const techError = ensureOptionalMaxLength(tech, MAX_LENGTHS.tech, 'Tech');
		if (techError) errors.tech = techError;
		const imageAltError = ensureOptionalMaxLength(imageAlt, MAX_LENGTHS.imageAlt, 'Image alt');
		if (imageAltError) errors.imageAlt = imageAltError;
		if (imageUrlResult.error) errors.imageUrl = imageUrlResult.error;
		if (linkRaw && !isSafeUrl(linkRaw)) {
			errors.link = 'Link must be http(s), mailto, or a relative path.';
		}
		if (imageFile && !ALLOWED_IMAGE_MIME.has(imageFile.type)) {
			errors.image = 'Image must be JPEG, PNG, WEBP, GIF, or AVIF.';
		}
		if (imageFile && imageFile.size > MAX_IMAGE_BYTES) {
			errors.image = 'Image must be 8MB or smaller.';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, { action: 'createWork', message: 'Check the highlighted fields.', fieldErrors: errors });
		}

		const imagePath = imageFile ? await saveWorkImage(imageFile) : null;

		await createWorkItem(
			title,
			description,
			longDescription,
			highlights,
			role,
			tech,
			linkRaw,
			imagePath,
			imageAlt,
			parseCheckbox(data, 'featured'),
			parseNumber(data.get('sort')),
			imageUrlResult.imageUrl
		);

		return { success: true, message: 'Work item added.', action: 'createWork' };
	},
	updateWork: async (event) => {
		await requireAdminCached(event);
		const data = await event.request.formData();
		if (!validateCsrfToken(event, data)) {
			return fail(403, { action: 'updateWork', message: 'Invalid CSRF token.' });
		}

		const id = parseNumber(data.get('id'), -1);
		const title = String(data.get('title') ?? '').trim();
		const description = String(data.get('description') ?? '').trim();
		const longDescription = parseText(data.get('longDescription'));
		const highlights = parseText(data.get('highlights'));
		const role = parseText(data.get('role'));
		const tech = parseText(data.get('tech'));
		const linkRaw = parseText(data.get('link'));
		const imageAlt = parseText(data.get('imageAlt'));
		const imageFile = parseImageFile(data.get('image'));
		const imageUrlResult = parseExternalImageUrl(data.get('imageUrl'));
		const removeImage = data.getAll('removeImage').some((value) => value === '1');
		const errors: Record<string, string> = {};
		const current = (await getWorkItems()).find((item) => item.id === id);

		if (id <= 0) errors.id = 'Invalid item.';
		if (!current) errors.id = 'Work item not found.';
		if (!title) errors.title = 'Title is required.';
		if (!description) errors.description = 'Description is required.';
		const titleError = ensureMaxLength(title, MAX_LENGTHS.title, 'Title');
		if (titleError) errors.title = titleError;
		const descError = ensureMaxLength(description, MAX_LENGTHS.description, 'Description');
		if (descError) errors.description = descError;
		const longError = ensureOptionalMaxLength(longDescription, MAX_LENGTHS.longDescription, 'Long description');
		if (longError) errors.longDescription = longError;
		const highlightError = ensureOptionalMaxLength(highlights, MAX_LENGTHS.highlights, 'Highlights');
		if (highlightError) errors.highlights = highlightError;
		const roleError = ensureOptionalMaxLength(role, MAX_LENGTHS.role, 'Role');
		if (roleError) errors.role = roleError;
		const techError = ensureOptionalMaxLength(tech, MAX_LENGTHS.tech, 'Tech');
		if (techError) errors.tech = techError;
		const imageAltError = ensureOptionalMaxLength(imageAlt, MAX_LENGTHS.imageAlt, 'Image alt');
		if (imageAltError) errors.imageAlt = imageAltError;
		if (imageUrlResult.error) errors.imageUrl = imageUrlResult.error;
		if (linkRaw && !isSafeUrl(linkRaw)) {
			errors.link = 'Link must be http(s), mailto, or a relative path.';
		}
		if (imageFile && !ALLOWED_IMAGE_MIME.has(imageFile.type)) {
			errors.image = 'Image must be JPEG, PNG, WEBP, GIF, or AVIF.';
		}
		if (imageFile && imageFile.size > MAX_IMAGE_BYTES) {
			errors.image = 'Image must be 8MB or smaller.';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				action: 'updateWork',
				message: 'Check the highlighted fields.',
				fieldErrors: errors,
				itemId: id
			});
		}

		let imagePath = current?.imagePath ?? null;
		if (removeImage) {
			imagePath = null;
		}
		if (imageFile) {
			imagePath = await saveWorkImage(imageFile);
		}
		if ((removeImage || imageFile) && current?.imagePath) {
			deleteWorkImage(current.imagePath);
		}

		await updateWorkItem(
			id,
			title,
			description,
			longDescription,
			highlights,
			role,
			tech,
			linkRaw,
			imagePath,
			imageAlt,
			parseCheckbox(data, 'featured'),
			parseNumber(data.get('sort')),
			imageUrlResult.imageUrl
		);

		return { success: true, message: 'Work item updated.', action: 'updateWork', itemId: id };
	},
	deleteWork: async (event) => {
		await requireAdminCached(event);
		const data = await event.request.formData();
		if (!validateCsrfToken(event, data)) {
			return fail(403, { action: 'deleteWork', message: 'Invalid CSRF token.' });
		}
		const id = parseNumber(data.get('id'), -1);
		if (id <= 0) {
			return fail(400, { action: 'deleteWork', message: 'Invalid item.' });
		}
		const current = (await getWorkItems()).find((item) => item.id === id);
		await deleteWorkItem(id);
		if (current?.imagePath) {
			deleteWorkImage(current.imagePath);
		}
		return { success: true, message: 'Work item deleted.', action: 'deleteWork', itemId: id };
	}
};
