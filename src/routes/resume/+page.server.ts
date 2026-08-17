import type { PageServerLoad } from './$types';
import fs from 'node:fs';
import path from 'node:path';

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

export const load: PageServerLoad = async () => {
	return {
		resume: getResumeMeta()
	};
};
