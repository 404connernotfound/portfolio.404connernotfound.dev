import { normalizeHttpUrl, type BlogReference } from '../utils/content';

const MAX_REFERENCES = 20;
const MAX_REFERENCE_LABEL = 160;
const MAX_REFERENCE_NOTE = 500;
const MAX_REFERENCES_JSON_BYTES = 64 * 1024;
const MAX_EXTERNAL_IMAGE_URL = 2048;
const REFERENCES_JSON_FIELD = 'referencesJsonFile';

const getRepeatedText = (data: FormData, name: string) =>
	data.getAll(name).map((value) => (typeof value === 'string' ? value.trim() : ''));

const referenceFormatError =
	'References JSON must follow {"references":[{"label":"","url":"","note":""}]}.';

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const validateReference = (label: string, urlValue: string, note: string) => {
	if (!label || !urlValue) {
		return {
			reference: null,
			error: 'Each reference needs a label and an HTTPS or HTTP URL.',
		};
	}
	if (label.length > MAX_REFERENCE_LABEL) {
		return {
			reference: null,
			error: `Reference labels must be ${MAX_REFERENCE_LABEL} characters or fewer.`,
		};
	}
	const url = normalizeHttpUrl(urlValue);
	if (!url) {
		return {
			reference: null,
			error: 'Each reference URL must be a valid HTTPS or HTTP URL.',
		};
	}
	if (note.length > MAX_REFERENCE_NOTE) {
		return {
			reference: null,
			error: `Reference notes must be ${MAX_REFERENCE_NOTE} characters or fewer.`,
		};
	}

	return {
		reference: { label, url, note: note || null },
		error: null,
	};
};

const parseReferencesFromRows = (data: FormData) => {
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
		const result = validateReference(label, urlValue, note);
		if (result.error || !result.reference) {
			errors.references = result.error ?? 'Invalid reference.';
			continue;
		}

		references.push(result.reference);
	}

	return { references, errors };
};

const parseReferencesJsonFile = async (file: File) => {
	const references: BlogReference[] = [];
	const errors: Record<string, string> = {};

	if (file.size === 0) {
		errors.references = 'References JSON file cannot be empty.';
		return { references, errors };
	}
	if (file.size > MAX_REFERENCES_JSON_BYTES) {
		errors.references = 'References JSON file must be 64KB or smaller.';
		return { references, errors };
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(await file.text());
	} catch {
		errors.references = 'References JSON file is not valid JSON.';
		return { references, errors };
	}

	if (!isRecord(parsed) || !Array.isArray(parsed.references)) {
		errors.references = referenceFormatError;
		return { references, errors };
	}
	if (parsed.references.length > MAX_REFERENCES) {
		errors.references = `References JSON can include at most ${MAX_REFERENCES} references.`;
		return { references, errors };
	}

	for (const entry of parsed.references) {
		if (
			!isRecord(entry) ||
			typeof entry.label !== 'string' ||
			typeof entry.url !== 'string' ||
			typeof entry.note !== 'string'
		) {
			errors.references = referenceFormatError;
			return { references, errors };
		}

		const result = validateReference(entry.label.trim(), entry.url.trim(), entry.note.trim());
		if (result.error || !result.reference) {
			errors.references = result.error ?? 'Invalid reference.';
			return { references, errors };
		}
		references.push(result.reference);
	}

	return { references, errors };
};

const getReferencesJsonFile = (data: FormData) => {
	const value = data.get(REFERENCES_JSON_FIELD);
	if (!(value instanceof File)) return null;
	if (value.size === 0 && value.name === '') return null;
	return value;
};

export const parseBlogReferencesForm = async (data: FormData) => {
	const jsonFile = getReferencesJsonFile(data);
	if (jsonFile) return parseReferencesJsonFile(jsonFile);
	return parseReferencesFromRows(data);
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
