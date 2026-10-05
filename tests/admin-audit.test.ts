import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RequestEvent } from '@sveltejs/kit';
import { createServer, transformWithEsbuild } from 'vite';
import sharp from 'sharp';
import { activeCookie } from './fixtures/telemetryAdmin';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixturePath = path.join(root, 'tests/fixtures/telemetryAdmin.ts');
const fixtureId = 'virtual:portfolio-telemetry-admin-fixture.ts';
const resolvedFixtureId = `\0${fixtureId}`;
const databaseDirectory = mkdtempSync(path.join(tmpdir(), 'portfolio-audit-test-'));
const databasePath = path.join(databaseDirectory, 'unexpected-fallback.sqlite');
process.env.DB_PATH = databasePath;
delete process.env.DATABASE_URL;
process.env.REDIS_URL = '';
let fixtureLoads = 0;
const boundaryResolutions: { source: string; importer: string | undefined }[] = [];
const server = await createServer({
	configFile: false, root, appType: 'custom', logLevel: 'error',
	server: { middlewareMode: true, ws: false, watch: null },
	resolve: { alias: [
		{ find: '$lib/server/auth', replacement: fixtureId },
		{ find: '$lib/server/dataStore', replacement: fixtureId },
		{ find: '$app/environment', replacement: fixtureId },
		{ find: 'node:fs', replacement: fixtureId },
		{ find: '$lib', replacement: path.join(root, 'src/lib') },
	] },
	plugins: [{
		name: 'admin-audit-test-boundaries', enforce: 'pre',
		resolveId(source, importer) {
			if (source.includes('telemetryStore') || source === '../rateLimit') boundaryResolutions.push({ source, importer });
			if ([fixtureId, '$lib/server/auth', '$lib/server/dataStore', '$app/environment'].includes(source)) return resolvedFixtureId;
			if (importer?.replaceAll('\\', '/').endsWith('/telemetry/audit.ts') && ['../auth', '../telemetryStore'].includes(source)) return resolvedFixtureId;
			if (importer?.replaceAll('\\', '/').endsWith('/telemetry/visitorServer.ts') && ['../rateLimit', '../telemetryStore'].includes(source)) return resolvedFixtureId;
			if (source === 'node:fs' && ['/admin/work/+page.server.ts', '/admin/resume/+page.server.ts'].some((suffix) => importer?.replaceAll('\\', '/').endsWith(suffix))) return resolvedFixtureId;
			return null;
		},
		async load(id) {
			// One virtual identity keeps all mocked boundaries on the same stateful instance.
			if (id === resolvedFixtureId) fixtureLoads++;
			return id === resolvedFixtureId ? transformWithEsbuild(readFileSync(fixturePath, 'utf8'), fixturePath, { loader: 'ts' }) : null;
		},
	}],
});

// Loaded modules are narrowed before their exported functions are called.
const exportedFunction = (module: unknown, name: string) => {
	assert.ok(typeof module === 'object' && module !== null);
	const value: unknown = Reflect.get(module, name);
	assert.ok(typeof value === 'function', `Missing test module export: ${name}`);
	return value;
};
const makeEvent = (route: string, fields: Readonly<Record<string, string | File>>, cookie = activeCookie): RequestEvent => {
	const cookies = new Map([['admin_session', cookie], ['csrf_token', `${Date.now()}.test-csrf-token`]]);
	const form = new FormData();
	for (const [name, value] of Object.entries(fields)) form.set(name, value);
	form.set('csrfToken', typeof fields.csrfToken === 'string' ? fields.csrfToken : cookies.get('csrf_token') ?? '');
	const url = new URL(`/admin/${route}`, 'https://portfolio.example');
	return {
		url, request: new Request(url, { method: 'POST', body: form }), getClientAddress: () => '192.0.2.28',
		cookies: {
			get: (name) => cookies.get(name), getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
			set: (name, value) => { cookies.set(name, value); }, delete: (name) => { cookies.delete(name); },
			serialize: (name, value) => `${name}=${value}`,
		},
		fetch, locals: {}, params: {}, platform: undefined, route: { id: null },
		setHeaders: () => undefined, isDataRequest: false, isSubRequest: false, isRemoteRequest: false,
		get tracing(): RequestEvent['tracing'] { throw new Error('Tracing is outside this action test.'); },
	};
};

try {
	const fixture: unknown = await server.ssrLoadModule(fixtureId);
	const reset = exportedFunction(fixture, 'resetRecords');
	const readRecords = exportedFunction(fixture, 'readRecords');
	const readOperations = exportedFunction(fixture, 'readOperations');
	const setWriteFailure = exportedFunction(fixture, 'setWriteFailure');
	const setDraft = exportedFunction(fixture, 'setDraft');
	const readFiles = exportedFunction(fixture, 'readFiles');
	const setAuditFailure = exportedFunction(fixture, 'setAuditFailure');
	const audit: unknown = await server.ssrLoadModule('/src/lib/server/telemetry/audit.ts');
	const recordActivity = exportedFunction(audit, 'recordAdminActivity');
	await assert.rejects(recordActivity(makeEvent('blog', {}, 'forged-cookie'), { action: 'delete', resource: 'post' }), /active authenticated session/);
	assert.deepEqual(readRecords(), [], 'Unauthenticated callers cannot create trusted audit records');
	const visitorModule: unknown = await server.ssrLoadModule('/src/routes/tracking/events/+server.ts');
	const visitorPost = exportedFunction(visitorModule, 'POST');
	const visitorEvent = makeEvent('blog', {}, 'forged-admin-cookie');
	visitorEvent.url = new URL('https://portfolio.example/tracking/events');
	visitorEvent.request = new Request(visitorEvent.url, {
		method: 'POST', headers: { 'content-type': 'application/json', referer: 'https://portfolio.example/blog?email=secret', 'user-agent': 'private-agent' },
		body: JSON.stringify({ type: 'pageview', path: '/blog?email=secret' }),
	});
	const visitorResponse: unknown = await visitorPost(visitorEvent);
	assert.ok(visitorResponse instanceof Response && visitorResponse.status === 204);
	assert.equal(fixtureLoads, 1, `Fixture state must stay shared: ${JSON.stringify(boundaryResolutions)}`);
	assert.equal(existsSync(databasePath), false, `Mocks must prevent fallback storage: ${JSON.stringify(boundaryResolutions)}`);
	assert.deepEqual(readRecords(), [[
		'pageview', null, '/blog', 'https://portfolio.example', null, null, null,
		{ actorType: 'visitor', source: 'public' },
	]], `The actual public route assigns unprivileged actor fields and drops IP, user agent and arbitrary payload; resolutions=${JSON.stringify(boundaryResolutions)}`);
	reset();

	type Case = { route: string; action: string; audit: string; resource: string; fields?: Record<string, string>; resourceId?: number };
	const cases: Case[] = [
		{ route: 'about', action: 'updateAbout', audit: 'settings_change', resource: 'about' },
		{ route: 'contact', action: 'updateContact', audit: 'settings_change', resource: 'contact' },
		{ route: 'errors', action: 'updateErrors', audit: 'settings_change', resource: 'errors' },
		{ route: 'site', action: 'updateSite', audit: 'settings_change', resource: 'site' },
		{ route: 'site', action: 'restoreHeroDefaults', audit: 'settings_change', resource: 'hero' },
		{ route: 'site', action: 'restoreFocusDefaults', audit: 'settings_change', resource: 'focus' },
		{ route: 'appointments', action: 'setStatus', audit: 'status_change', resource: 'appointment', resourceId: 1, fields: { id: '1', status: 'confirmed' } },
		{ route: 'reviews', action: 'moderate', audit: 'moderate', resource: 'review', resourceId: 1, fields: { id: '1', moderation: 'approved' } },
		{ route: 'blog', action: 'updateBlogSection', audit: 'settings_change', resource: 'blog' },
		{ route: 'blog', action: 'createPost', audit: 'create', resource: 'post', fields: { title: 'Audit test', publishState: 'draft' } },
		{ route: 'blog', action: 'updatePost', audit: 'update', resource: 'post', resourceId: 1, fields: { id: '1', title: 'Audit test', publishState: 'draft' } },
		{ route: 'blog', action: 'deletePost', audit: 'delete', resource: 'post', resourceId: 1, fields: { id: '1' } },
		{ route: 'crisis-counter', action: 'createCrisis', audit: 'create', resource: 'crisis_item', fields: { title: 'Audit test' } },
		{ route: 'crisis-counter', action: 'updateCrisis', audit: 'update', resource: 'crisis_item', resourceId: 1, fields: { id: '1', title: 'Audit test' } },
		{ route: 'crisis-counter', action: 'deleteCrisis', audit: 'delete', resource: 'crisis_item', resourceId: 1, fields: { id: '1' } },
		{ route: 'footer', action: 'updateFooterCopy', audit: 'settings_change', resource: 'footer' },
		{ route: 'footer', action: 'createFooterLink', audit: 'create', resource: 'footer_link', fields: { section: 'Links', label: 'Audit test' } },
		{ route: 'footer', action: 'updateFooterLink', audit: 'update', resource: 'footer_link', resourceId: 1, fields: { id: '1', section: 'Links', label: 'Audit test' } },
		{ route: 'footer', action: 'deleteFooterLink', audit: 'delete', resource: 'footer_link', resourceId: 1, fields: { id: '1' } },
		{ route: 'stack', action: 'updateStackSection', audit: 'settings_change', resource: 'stack' },
		{ route: 'stack', action: 'createStack', audit: 'create', resource: 'stack', fields: { label: 'Audit test' } },
		{ route: 'stack', action: 'updateStack', audit: 'update', resource: 'stack', resourceId: 1, fields: { id: '1', label: 'Audit test' } },
		{ route: 'stack', action: 'deleteStack', audit: 'delete', resource: 'stack', resourceId: 1, fields: { id: '1' } },
		{ route: 'stack', action: 'reorderStack', audit: 'update', resource: 'stack_order', fields: { order: '1,2' } },
		{ route: 'work', action: 'updateWorkSection', audit: 'settings_change', resource: 'work_section' },
		{ route: 'work', action: 'createWork', audit: 'create', resource: 'work', fields: { title: 'Audit work', description: 'Description' } },
		{ route: 'work', action: 'updateWork', audit: 'update', resource: 'work', resourceId: 1, fields: { id: '1', title: 'Audit work', description: 'Description' } },
		{ route: 'work', action: 'deleteWork', audit: 'delete', resource: 'work', resourceId: 1, fields: { id: '1' } },
	];
	const actionFor = async (route: string, action: string) => {
		const module: unknown = await server.ssrLoadModule(`/src/routes/admin/${route}/+page.server.ts`);
		assert.ok(typeof module === 'object' && module !== null);
		const actions: unknown = Reflect.get(module, 'actions');
		return exportedFunction(actions, action);
	};
	for (const entry of cases) {
		reset();
		const action = await actionFor(entry.route, entry.action);
		const result: unknown = await action(makeEvent(entry.route, entry.fields ?? {}));
		assert.ok(typeof result === 'object' && result !== null && 'success' in result && result.success === true, entry.action);
		assert.deepEqual(readRecords(), [[
			'admin_audit', entry.audit, `/admin/${entry.route}`, null, null, null,
			JSON.stringify({ resource: entry.resource, ...(entry.resourceId === undefined ? {} : { resourceId: entry.resourceId }), sessionHash: createHash('sha256').update(activeCookie).digest('hex') }),
			{ actorType: 'admin', source: 'server' },
		]], `${entry.action} generates a server audit after a successful write`);
		reset();
		await action(makeEvent(entry.route, { ...entry.fields, csrfToken: 'incorrect' }));
		assert.deepEqual(readOperations(), [], `${entry.action}: CSRF rejection prevents mutation`);
		assert.deepEqual(readRecords(), [], `${entry.action}: CSRF rejection cannot be logged as successful administration`);
		await assert.rejects(action(makeEvent(entry.route, entry.fields ?? {}, 'forged-cookie')), /Unauthorized admin/);
		assert.deepEqual(readOperations(), [], `${entry.action}: unauthenticated requests cannot mutate`);
		assert.deepEqual(readRecords(), [], `${entry.action}: unauthenticated requests cannot produce audit activity`);
		setWriteFailure(true);
		if (entry.route === 'appointments') {
			const failure: unknown = await action(makeEvent(entry.route, entry.fields ?? {}));
			assert.ok(typeof failure === 'object' && failure !== null && 'status' in failure && failure.status === 500);
		} else {
			await assert.rejects(action(makeEvent(entry.route, entry.fields ?? {})), /Simulated persistence failure/);
		}
		assert.deepEqual(readRecords(), [], `${entry.action}: failed persistence cannot produce a success audit`);
	}
	for (const [actionName, previousDraft, state, expected] of [
		['createPost', 1, 'publish', 'publish'], ['updatePost', 1, 'publish', 'publish'], ['updatePost', 0, 'draft', 'unpublish'],
	] as const) {
		reset(); setDraft(previousDraft);
		await (await actionFor('blog', actionName))(makeEvent('blog', { id: '1', title: 'Publishing test', publishState: state }));
		const rows: unknown = readRecords();
		assert.ok(Array.isArray(rows));
		assert.equal(rows.length, 2, 'Publication change records content mutation and publication transition');
		assert.ok(Array.isArray(rows[1]));
		assert.equal(rows[1][1], expected);
	}
	const assertBadUpload = (result: unknown) => assert.ok(typeof result === 'object' && result !== null && 'status' in result && result.status === 400);
	const oldImage = path.resolve('static/assets/work/old.webp');
	const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#aabbcc' } }).png().toBuffer();
	const validImage = () => new File([png], '../../misleading.html', { type: 'image/png' });
	for (const actionName of ['createWork', 'updateWork']) {
		reset();
		const action = await actionFor('work', actionName);
		assertBadUpload(await action(makeEvent('work', { id: '1', title: 'Image test', description: 'Description', image: new File(['<html>harmless</html>'], 'fake.png', { type: 'image/png' }) })));
		assert.deepEqual(readOperations(), [], 'Invalid work-image bytes cause no filesystem or database mutation');
		assert.deepEqual(readRecords(), [], 'Invalid work-image bytes cause no successful audit');
		assert.deepEqual(readFiles(), [oldImage]);
	}
	for (const failure of ['database', 'audit']) {
		reset();
		if (failure === 'database') setWriteFailure(true);
		else setAuditFailure(true);
		await assert.rejects((await actionFor('work', 'updateWork'))(makeEvent('work', { id: '1', title: 'Image test', description: 'Description', image: validImage() })), /Simulated (persistence|audit) failure/);
		const files: unknown = readFiles();
		assert.ok(Array.isArray(files) && files.includes(oldImage), `${failure} failure retains the previously referenced image`);
		assert.deepEqual(readRecords(), [], 'A failed replacement cannot produce a successful audit');
	}
	reset();
	await (await actionFor('work', 'updateWork'))(makeEvent('work', { id: '1', title: 'Image test', description: 'Description', image: validImage() }));
	const replacementFiles: unknown = readFiles();
	assert.ok(Array.isArray(replacementFiles) && replacementFiles.length === 1 && !replacementFiles.includes(oldImage));
	assert.match(String(replacementFiles[0]), /[a-f0-9-]{36}\.webp$/);
	assert.deepEqual(readOperations(), ['fs_write', 'update_work', 'fs_delete'], 'Old image deletion follows the successful database update and server audit');
	const resumeAction = await actionFor('resume', 'upload');
	for (const file of [new File(['fake'], 'resume.pdf', { type: 'application/pdf' }), new File(['%PDF-1.7\n%%EOF'], 'resume.html', { type: 'application/pdf' })]) {
		reset();
		assertBadUpload(await resumeAction(makeEvent('resume', { resume: file })));
		assert.deepEqual(readOperations(), [], 'Invalid PDF bytes and filename cause no file writes');
		assert.deepEqual(readRecords(), [], 'Invalid resume cannot produce a successful audit');
	}
	reset();
	await resumeAction(makeEvent('resume', { resume: new File(['%PDF-1.7\n%%EOF'], 'resume.pdf', { type: 'application/pdf' }) }));
	assert.deepEqual(readOperations(), ['fs_write']);
	const resumeRecords: unknown = readRecords();
	assert.ok(Array.isArray(resumeRecords) && resumeRecords.length === 1 && Array.isArray(resumeRecords[0]));
	assert.equal(resumeRecords[0][1], 'update');
	assert.equal(resumeRecords[0][2], '/admin/resume');
	console.log('admin audit authentication, CSRF, failure and mutation coverage tests passed');
} finally {
	await server.close();
	assert.equal(path.dirname(databaseDirectory), path.resolve(tmpdir()));
	rmSync(databaseDirectory, { recursive: true, force: true });
}
