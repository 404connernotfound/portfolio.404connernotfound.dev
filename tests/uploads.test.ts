import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import {
	MAX_IMAGE_BYTES, MAX_RESUME_BYTES, parseResumeUpload, parseWorkImageUpload,
	resolveWorkImagePath, UploadError,
} from '../src/lib/server/uploads';

const pdf = readFileSync('static/uploads/resume/resume.pdf');
const pdfFile = (bytes: Uint8Array, name = 'resume.pdf', type = 'application/pdf') =>
	new File([Buffer.from(bytes)], name, { type });

test('PDF requires extension, MIME, signature, end marker, and bounded size', async () => {
	assert.deepEqual(await parseResumeUpload(pdfFile(pdf)), pdf);
	assert.deepEqual(await parseResumeUpload(pdfFile(pdf, '../../RESUME.PDF')), pdf);
	for (const file of [
		pdfFile(pdf, 'resume.html'), pdfFile(pdf, 'resume.pdf', 'text/html'),
		pdfFile(Buffer.from('<html>harmless</html>')),
		pdfFile(Buffer.from('%PDF-1.7\ninvalid without end marker')),
		pdfFile(Buffer.concat([Buffer.from('%PDF-1.7\n').map((byte) => byte | 128), Buffer.from('%%EOF')])),
		pdfFile(Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.from('%%EOF').map((byte) => byte | 128)])),
		pdfFile(Buffer.alloc(0)), pdfFile(Buffer.alloc(MAX_RESUME_BYTES + 1)),
	]) await assert.rejects(parseResumeUpload(file), UploadError);
});

test('supported raster images decode, re-encode and ignore misleading filenames', async () => {
	for (const format of ['png', 'jpeg', 'webp', 'gif', 'avif'] as const) {
		const bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#aabbcc' } })
			.toFormat(format).toBuffer();
		const mime = format === 'jpeg' ? 'image/jpeg' : `image/${format}`;
		const upload = await parseWorkImageUpload(new File([bytes], '../../unsafe.php.html', { type: mime }));
		assert.match(upload.filename, /^[a-f0-9-]{36}\.webp$/);
		assert.equal((await sharp(upload.bytes).metadata()).format, 'webp');
		assert.ok(upload.bytes.length <= MAX_IMAGE_BYTES);
		assert.doesNotMatch(upload.filename, /unsafe|php|html/);
	}
});

test('MIME metadata cannot disguise HTML, SVG, fake, corrupt, or oversized images', async () => {
	const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).png().toBuffer();
	for (const file of [
		new File([png], 'valid.png', { type: 'text/html' }),
		new File([png], 'valid.jpg', { type: 'image/jpeg' }),
		new File(['<html>harmless</html>'], 'image.png', { type: 'image/png' }),
		new File(['fake'], 'image.webp', { type: 'image/webp' }),
		new File(['<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>'], 'image.png', { type: 'image/png' }),
		new File([png.subarray(0, 40)], 'image.png', { type: 'image/png' }),
		new File([Buffer.alloc(MAX_IMAGE_BYTES + 1)], 'image.png', { type: 'image/png' }),
	]) await assert.rejects(parseWorkImageUpload(file), UploadError);
});

test('image file deletion cannot cross its owning directory', () => {
	const directory = path.resolve('static/assets/work');
	assert.equal(resolveWorkImagePath(directory, '/assets/work/valid.webp'), path.join(directory, 'valid.webp'));
	for (const publicPath of ['/assets/work/../other', '/assets/work/..\\other', '/assets/work/',
		'/assets/work/..', '/assets/work/a\u0000b', '/assets/work/a:stream', '/assets/work/a\nb',
		'/assets/work-other/file', '/uploads/resume/resume.pdf']) {
		assert.equal(resolveWorkImagePath(directory, publicPath), null);
	}
});
