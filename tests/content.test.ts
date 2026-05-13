import assert from 'node:assert/strict';
import path from 'node:path';

const testDbPath = path.join('/tmp', `portfolio-content-${process.pid}-${Date.now()}.sqlite`);
process.env.DB_PATH = testDbPath;
process.env.DB_AUTO_SEED = 'true';
process.env.NODE_ENV = 'test';
delete process.env.DATABASE_URL;

const {
	renderMarkdown,
	resolveWorkCoverImage
} = await import('../src/lib/utils/content');
const { parseBlogReferencesForm, parseExternalImageUrl } = await import(
	'../src/lib/server/contentValidation'
);
const db = await import('../src/lib/server/db');

const assertMarkdownRendering = () => {
	const html = renderMarkdown(`# Heading

This is **bold** with [a safe link](https://example.com/docs).

<script>alert("xss")</script>

[bad](javascript:alert(1))
`);

	assert.match(html, /<h1>Heading<\/h1>/);
	assert.match(html, /<strong>bold<\/strong>/);
	assert.match(html, /href="https:\/\/example.com\/docs"/);
	assert.match(html, /&lt;script&gt;alert\(&quot;xss&quot;\)&lt;\/script&gt;/);
	assert.doesNotMatch(html, /<script/i);
	assert.doesNotMatch(html, /href="javascript:/i);
};

const assertExtendedMarkdownFeatures = () => {
	const tableHtml = renderMarkdown(`| Name | Score |
|:-----|------:|
| Ada  |  99.5 |
| Lin  |   100 |`);
	assert.match(tableHtml, /<table>/);
	assert.match(tableHtml, /<th style="text-align: left">Name<\/th>/);
	assert.match(tableHtml, /<th style="text-align: right">Score<\/th>/);
	assert.match(tableHtml, /<td style="text-align: right">99.5<\/td>/);

	const strikeHtml = renderMarkdown('Old ~~deprecated~~ approach.');
	assert.match(strikeHtml, /<del>deprecated<\/del>/);

	const taskHtml = renderMarkdown(`- [x] Ship feature
- [ ] Write docs`);
	assert.match(taskHtml, /<li class="task-list-item"><input type="checkbox" disabled checked \/> Ship feature<\/li>/);
	assert.match(taskHtml, /<li class="task-list-item"><input type="checkbox" disabled \/> Write docs<\/li>/);

	const imgHtml = renderMarkdown('![alt text](https://cdn.example.com/pic.png "Caption")');
	assert.match(imgHtml, /<img src="https:\/\/cdn.example.com\/pic.png" alt="alt text" title="Caption"/);
	assert.match(imgHtml, /data-image-fallback="1"/);

	const blockedImg = renderMarkdown('![bad](javascript:alert(1))');
	assert.doesNotMatch(blockedImg, /<img/);
	assert.doesNotMatch(blockedImg, /src=/);

	const autoHtml = renderMarkdown('Visit <https://example.com/spec> for details.');
	assert.match(autoHtml, /<a href="https:\/\/example.com\/spec"[^>]*>https:\/\/example.com\/spec<\/a>/);

	const bareHtml = renderMarkdown('See https://example.com/path for info.');
	assert.match(bareHtml, /<a href="https:\/\/example.com\/path"[^>]*>https:\/\/example.com\/path<\/a>/);

	const ruleHtml = renderMarkdown('Above\n\n---\n\nBelow');
	assert.match(ruleHtml, /<hr \/>/);

	const codeHtml = renderMarkdown('```ts\nconst x: number = 1;\n```');
	assert.match(codeHtml, /<pre><code class="language-ts">const x: number = 1;<\/code><\/pre>/);

	const inlineCodeXss = renderMarkdown('Try `<img onerror=alert(1)>` here.');
	assert.match(inlineCodeXss, /<code>&lt;img onerror=alert\(1\)&gt;<\/code>/);
	assert.doesNotMatch(inlineCodeXss, /<img onerror/);
};

const assertReferenceParsing = () => {
	const form = new FormData();
	form.append('referenceLabel', 'Spec');
	form.append('referenceUrl', 'https://example.com/spec');
	form.append('referenceNote', 'Primary source');
	form.append('referenceLabel', 'Changelog');
	form.append('referenceUrl', 'https://example.com/changelog');
	form.append('referenceNote', '');

	const result = parseBlogReferencesForm(form);
	assert.deepEqual(result.errors, {});
	assert.deepEqual(result.references, [
		{ label: 'Spec', url: 'https://example.com/spec', note: 'Primary source' },
		{ label: 'Changelog', url: 'https://example.com/changelog', note: null }
	]);

	const invalid = new FormData();
	invalid.append('referenceLabel', 'Bad');
	invalid.append('referenceUrl', 'javascript:alert(1)');
	invalid.append('referenceNote', '');
	assert.equal(parseBlogReferencesForm(invalid).errors.references, 'Each reference URL must be a valid HTTPS or HTTP URL.');
};

const assertExternalCoverValidation = () => {
	const valid = parseExternalImageUrl('https://cdn.example.com/cover.webp');
	assert.equal(valid.imageUrl, 'https://cdn.example.com/cover.webp');
	assert.equal(valid.error, null);

	const invalid = parseExternalImageUrl('data:text/html,<script>alert(1)</script>');
	assert.equal(invalid.imageUrl, null);
	assert.equal(invalid.error, 'Cover image URL must be a valid HTTPS or HTTP URL.');
};

const assertPersistence = () => {
	const markdown = '# Stored Markdown\n\n- one\n- two';
	const references = [{ label: 'Source', url: 'https://example.com/source', note: 'Read this' }];
	db.createPost(
		'Markdown Persistence',
		'Excerpt',
		markdown,
		'test',
		0,
		0,
		'2026-05-12',
		'markdown-persistence',
		references
	);
	const storedPost = db.getPostBySlug('markdown-persistence');
	assert.equal(storedPost?.content, markdown);
	assert.deepEqual(storedPost?.references, references);

	const editedReferences = [
		{ label: 'Updated', url: 'https://example.com/updated', note: null },
		{ label: 'Second', url: 'https://example.com/second', note: 'More context' }
	];
	db.updatePost(
		storedPost?.id ?? -1,
		'Markdown Persistence',
		'Excerpt',
		markdown,
		'test',
		0,
		0,
		'2026-05-12',
		'markdown-persistence',
		editedReferences
	);
	assert.deepEqual(db.getPostBySlug('markdown-persistence')?.references, editedReferences);
};

const assertWorkCoverPersistence = () => {
	db.createWorkItem(
		'External Cover',
		'**Markdown** description',
		'Long markdown',
		null,
		null,
		null,
		null,
		null,
		'External cover alt',
		0,
		90,
		'https://cdn.example.com/work.png'
	);
	const external = db.getWorkItems().find((item) => item.title === 'External Cover');
	assert.equal(external?.imageUrl, 'https://cdn.example.com/work.png');
	assert.equal(resolveWorkCoverImage(external!), 'https://cdn.example.com/work.png');

	db.createWorkItem(
		'Upload Cover',
		'Description',
		null,
		null,
		null,
		null,
		null,
		'/assets/work/local.png',
		'Uploaded cover alt',
		0,
		91,
		'https://cdn.example.com/fallback.png'
	);
	const uploaded = db.getWorkItems().find((item) => item.title === 'Upload Cover');
	assert.equal(resolveWorkCoverImage(uploaded!), '/assets/work/local.png');
};

assertMarkdownRendering();
assertExtendedMarkdownFeatures();
assertReferenceParsing();
assertExternalCoverValidation();
assertPersistence();
assertWorkCoverPersistence();

console.log('content tests passed');
