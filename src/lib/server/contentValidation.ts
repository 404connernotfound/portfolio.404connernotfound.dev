import {
	normalizeHttpUrl,
	type BlogReference
} from '../utils/content';

const MAX_REFERENCES = 20;
const MAX_REFERENCE_LABEL = 160;
const MAX_REFERENCE_NOTE = 500;
const MAX_EXTERNAL_IMAGE_URL = 2048;

const getRepeatedText = (data: FormData, name: string) =>
	data.getAll(name).map((value) => (typeof value === 'string' ? value.trim() : ''));

export const parseBlogReferencesForm = (data: FormData) => {
	const labels = getRepeatedText(data, 'referenceLabel');
	const urls = getRepeatedText(data, 'referenceUrl');
	const notes = getRepeatedText(data, 'referenceNote');
	const maxRows = Math.min(Math.max(labels.length, urls.length, notes.length), MAX_REFERENCES);
	const references: BlogReference[] = [];
	const errors: Record<string, string> = {};

	for (let index = 0; index < maxRows; index += 1) {
		const label = labels[index] ?? '';
		const urlValue = urls[index] ?? '';
		const note = notes[index] ?? '';

		if (!label && !urlValue && !note) continue;
		if (!label) {
			errors.references = 'Each reference needs a label and an HTTPS or HTTP URL.';
			continue;
		}
		if (label.length > MAX_REFERENCE_LABEL) {
			errors.references = `Reference labels must be ${MAX_REFERENCE_LABEL} characters or fewer.`;
			continue;
		}
		const url = normalizeHttpUrl(urlValue);
		if (!url) {
			errors.references = 'Each reference URL must be a valid HTTPS or HTTP URL.';
			continue;
		}
		if (note.length > MAX_REFERENCE_NOTE) {
			errors.references = `Reference notes must be ${MAX_REFERENCE_NOTE} characters or fewer.`;
			continue;
		}

		references.push({ label, url, note: note || null });
	}

	return { references, errors };
};

export const parseExternalImageUrl = (value: FormDataEntryValue | null) => {
	if (typeof value !== 'string') return { imageUrl: null, error: null };
	const trimmed = value.trim();
	if (!trimmed) return { imageUrl: null, error: null };
	if (trimmed.length > MAX_EXTERNAL_IMAGE_URL) {
		return { imageUrl: null, error: 'Cover image URL must be 2048 characters or fewer.' };
	}
	const imageUrl = normalizeHttpUrl(trimmed);
	if (!imageUrl) {
		return { imageUrl: null, error: 'Cover image URL must be a valid HTTPS or HTTP URL.' };
	}
	return { imageUrl, error: null };
};
