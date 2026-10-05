import { randomUUID } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';

export const MAX_RESUME_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 24_000_000;
const rasterMime = new Map([
	['jpeg', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp'],
	['gif', 'image/gif'], ['heif', 'image/avif'],
]);

export class UploadError extends Error {}

const readUpload = async (file: File, limit: number) => {
	if (file.size <= 0 || file.size > limit) {
		throw new UploadError('File must be non-empty and 8MB or smaller.');
	}
	const bytes = Buffer.from(await file.arrayBuffer());
	if (bytes.length !== file.size || bytes.length > limit) {
		throw new UploadError('Invalid upload size.');
	}
	return bytes;
};

export const parseResumeUpload = async (file: File) => {
	if (path.extname(file.name).toLowerCase() !== '.pdf' || file.type !== 'application/pdf') {
		throw new UploadError('Resume must have a .pdf extension and application/pdf MIME type.');
	}
	const bytes = await readUpload(file, MAX_RESUME_BYTES);
	if (!/^%PDF-(?:1\.[0-7]|2\.0)(?:\r\n|\n|\r)/.test(bytes.subarray(0, 16).toString('latin1')) ||
		!bytes.subarray(-1024).toString('latin1').trimEnd().endsWith('%%EOF')) {
		throw new UploadError('Resume must contain a PDF signature and end marker.');
	}
	return bytes;
};

export const parseWorkImageUpload = async (file: File) => {
	if (![...rasterMime.values()].includes(file.type)) {
		throw new UploadError('Image must be JPEG, PNG, WEBP, GIF, or AVIF.');
	}
	const input = await readUpload(file, MAX_IMAGE_BYTES);
	try {
		const image = sharp(input, { failOn: 'warning', limitInputPixels: MAX_IMAGE_PIXELS });
		const metadata = await image.metadata();
		if (!metadata.format || rasterMime.get(metadata.format) !== file.type ||
			(metadata.format === 'heif' && metadata.compression !== 'av1')) {
			throw new UploadError('Image contents must match a supported raster MIME type.');
		}
		// Decode all pixels, strip metadata/active content, and use a server-chosen extension.
		const bytes = await image.rotate().webp({ quality: 85 }).toBuffer();
		if (bytes.length > MAX_IMAGE_BYTES) throw new UploadError('Encoded image is too large.');
		return { bytes, filename: `${randomUUID()}.webp` };
	} catch (error) {
		if (error instanceof UploadError) throw error;
		throw new UploadError('Image cannot be decoded safely.', { cause: error });
	}
};

export const resolveWorkImagePath = (directory: string, publicPath: string) => {
	if (!publicPath.startsWith('/assets/work/')) return null;
	const filename = publicPath.slice('/assets/work/'.length);
	const hasControl = [...filename].some((character) => character.charCodeAt(0) < 32);
	if (!filename || filename === '.' || filename === '..' || /[/\\:]/.test(filename) || hasControl) return null;
	return path.join(directory, filename);
};
