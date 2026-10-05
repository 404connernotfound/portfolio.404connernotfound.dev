import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { requireAdminCached } from '$lib/server/auth';
import { getCsrfToken, validateCsrfToken } from '$lib/server/csrf';
import fs from 'node:fs';
import path from 'node:path';
import { parseResumeUpload, UploadError } from '$lib/server/uploads';
import { recordAdminActivity } from '$lib/server/telemetry/audit';

const RESUME_DIR = path.resolve('static/uploads/resume');
const RESUME_FILENAME = 'resume.pdf';

const getResumeMeta = () => {
	const filePath = path.join(RESUME_DIR, RESUME_FILENAME);
	if (!fs.existsSync(filePath)) {
		return null;
	}
	const stats = fs.statSync(filePath);
	return {
		path: `/uploads/resume/${RESUME_FILENAME}?v=${Math.trunc(stats.mtimeMs)}`,
		size: stats.size,
		updatedAt: stats.mtime.toISOString()
	};
};

export const load: PageServerLoad = async (event) => {
	await requireAdminCached(event);
	return {
		csrfToken: getCsrfToken(event),
		resume: getResumeMeta()
	};
};

export const actions: Actions = {
	upload: async (event) => {
		await requireAdminCached(event);
		const data = await event.request.formData();
		if (!validateCsrfToken(event, data)) {
			return fail(403, { message: 'Invalid CSRF token.' });
		}

		const file = data.get('resume');
		if (!(file instanceof File)) {
			return fail(400, { message: 'Please attach a PDF.' });
		}

		let buffer: Buffer;
		try {
			buffer = await parseResumeUpload(file);
		} catch (error) {
			if (!(error instanceof UploadError)) throw error;
			return fail(400, { message: error.message });
		}

		fs.mkdirSync(RESUME_DIR, { recursive: true });
		fs.writeFileSync(path.join(RESUME_DIR, RESUME_FILENAME), buffer);
		await recordAdminActivity(event, { action: 'update', resource: 'resume' });

		return { success: true, message: 'Resume uploaded.' };
	}
};
