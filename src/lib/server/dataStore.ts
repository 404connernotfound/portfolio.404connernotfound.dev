import * as sqliteDb from '$lib/server/db';
import type {
	Asset,
	BlogPost,
	FooterLink,
	PlaygroundLog,
	PlaygroundOperationalCounts,
	PlaygroundSession,
	PlaygroundSessionListItem,
	Playset,
	SiteSettings,
	StackItem,
	Testimonial,
	TrackingEvent,
	WorkItem,
} from '$lib/server/db';
import { invalidateCached, invalidateCachedPrefix } from '$lib/server/cache';
import {
	ensurePostgresAppSchema,
	isPostgresConfigured,
	queryPostgres,
	executePostgres,
} from '$lib/server/postgres';

const runtimeEnv = process.env;
const isDev = runtimeEnv.NODE_ENV !== 'production';
const shouldAutoSeed = runtimeEnv.DB_AUTO_SEED ? runtimeEnv.DB_AUTO_SEED === 'true' : isDev;

const nowIso = () => new Date().toISOString();

let pgReadyPromise: Promise<boolean> | null = null;
let pgSeedPromise: Promise<void> | null = null;

const DEFAULT_SITE_SETTINGS: Omit<SiteSettings, 'id'> = {
	heroHeadline:
		'Conner - low-level systems engineer building embedded and hardware-specific software.',
	heroSubheadline:
		'I build Rust-heavy systems, filesystem tools, network appliances, language runtimes, and niche programs close to the machine.',
	heroNoteTitle: 'Best fit',
	heroNoteBody: 'Embedded systems, hardware-adjacent tooling, and low-level Rust work.',
	heroHighlightsTitle: 'Proof',
	heroHighlightsBody:
		'TinyOne, Unum.rs, PiFi2, and Winux PTree show language, ML runtime, network appliance, and filesystem indexing work.',
	aboutHeadline: 'I build low-level systems that turn constraints into working tools.',
	aboutBody:
		'My work sits close to hardware and OS boundaries: Rust programs, embedded-adjacent networking tools, filesystem indexers, language runtimes, and specialized software where correctness and practical constraints matter.',
	focusHeadline: 'Low-level systems, embedded fit',
	focusBody:
		'I am strongest when the problem involves hardware constraints, networking, filesystems, runtimes, or niche tooling that needs careful engineering instead of broad product glue.',
	stackTitle: 'Systems stack',
	stackIntro: 'Tools and domains I use for Rust-heavy, hardware-aware programs.',
	workTitle: 'Selected systems work',
	workIntro:
		'Rust, networking, language runtime, ML engine, and filesystem indexing projects that show how I build close to the machine.',
	blogTitle: 'Notes',
	blogIntro: 'Build logs, motion experiments, and deep dives.',
	contactTitle: "Let's connect.",
	contactBody: "Want to collaborate or just say hello? Drop a note and I'll get back to you.",
	contactEmail: 'contact@404connernotfound.dev',
	githubUrl: 'https://github.com/ConnerAdamsMaine',
	footerBadge: 'Conner',
	footerHeadline: 'Low-level systems engineer building hardware-specific software.',
	footerBody:
		'Rust-heavy systems, embedded-adjacent tooling, filesystem indexing, and network appliance work by Conner.',
	footerCtaLabel: 'Say hello',
	footerCtaHref: '/contact',
	maintenanceEnabled: 0,
	maintenanceTitle: 'Maintenance in progress',
	maintenanceBody: 'We are tuning things up. Please check back soon.',
	error403Title: 'Access denied',
	error403Body: 'You do not have permission to view this page.',
	error404Title: 'Page not found',
	error404Body: 'We could not find the page you were looking for.',
	error500Title: 'Something went wrong',
	error500Body: 'An unexpected error occurred. Please try again shortly.',
};

const DEFAULT_FOOTER_LINKS: Omit<FooterLink, 'id'>[] = [
	{ section: 'Pages', label: 'Home', href: '/', external: 0, sort: 1 },
	{ section: 'Pages', label: 'About', href: '/about', external: 0, sort: 2 },
	{ section: 'Pages', label: 'Work', href: '/work', external: 0, sort: 3 },
	{ section: 'Pages', label: 'Resume', href: '/resume', external: 0, sort: 4 },
	{ section: 'Pages', label: 'Contact', href: '/contact', external: 0, sort: 5 },
	{
		section: 'Links',
		label: 'GitHub',
		href: 'https://github.com/ConnerAdamsMaine',
		external: 1,
		sort: 1,
	},
	{ section: 'Links', label: 'Resume', href: '/resume', external: 0, sort: 2 },
	{
		section: 'Links',
		label: 'Email',
		href: 'mailto:contact@404connernotfound.dev',
		external: 0,
		sort: 3,
	},
];

const DEFAULT_STACK_ITEMS: Omit<StackItem, 'id'>[] = [
	{
		label: 'Rust systems',
		detail: 'Language runtimes, filesystem indexers, CLIs, daemons, and low-level tooling.',
		category: 'Core',
		sort: 10,
	},
	{
		label: 'Embedded fit',
		detail:
			'Hardware-specific applications, Raspberry Pi networking, and constrained environments.',
		category: 'Hardware',
		sort: 20,
	},
	{
		label: 'Networking',
		detail: 'AP/router/modem/switch workflows, firewall configuration, and appliance behavior.',
		category: 'Infrastructure',
		sort: 30,
	},
	{
		label: 'Filesystems and runtimes',
		detail:
			'Index lookup paths, background services, language implementation, and execution engines.',
		category: 'Systems',
		sort: 40,
	},
];

const DEFAULT_WORK_ITEMS: Omit<WorkItem, 'id'>[] = [
	{
		title: 'TinyOne',
		description: 'A tiny Turing-complete language written in Rust.',
		longDescription:
			'TinyOne is a compact language implementation focused on proving out a small Turing-complete runtime in Rust. It shows language design, parser/runtime work, and the ability to reduce a computing model to something understandable and executable.',
		highlights:
			'Turing-complete language implementation\nWritten in Rust with a small runtime surface\nProof of language and systems fundamentals',
		role: 'Language runtime',
		tech: 'Rust',
		link: 'https://github.com/ConnerAdamsMaine/TinyOne',
		imagePath: null,
		imageAlt: null,
		featured: 1,
		sort: 10,
	},
	{
		title: 'Unum.rs',
		description: 'A partially complete LLM training and inferencing engine.',
		longDescription:
			'Unum.rs is an in-progress Rust engine for LLM training and inference. The repository keeps its known design and implementation issues in problems.md, making the current state explicit instead of hiding incomplete work.',
		highlights:
			'Rust-based ML systems work\nTraining and inference engine architecture\nKnown problems tracked directly in the repository',
		role: 'ML systems',
		tech: 'Rust, LLMs',
		link: 'https://github.com/ConnerAdamsMaine/Unum.rs',
		imagePath: null,
		imageAlt: null,
		featured: 1,
		sort: 20,
	},
	{
		title: 'PiFi2',
		description: 'A Raspberry Pi networking program for AP, router, modem, and switch workflows.',
		longDescription:
			'PiFi2 is designed to turn a Raspberry Pi into a configurable network appliance with access point, router, modem, or switch behavior plus smart switching, quality-of-life controls, and firewall configuration.',
		highlights:
			'Targets Raspberry Pi hardware\nAP, router, modem, and switch use cases\nSmart switching, QoL, and firewall configuration',
		role: 'Network appliance',
		tech: 'Raspberry Pi, networking',
		link: 'https://github.com/ConnerAdamsMaine/PiFi2',
		imagePath: null,
		imageAlt: null,
		featured: 1,
		sort: 30,
	},
	{
		title: 'Winux PTree',
		description:
			'A Rust-based filesystem indexer with CLI lookups and a daemon for background indexing.',
		longDescription:
			'PTree is a Rust filesystem indexing system for Winux with command-line lookup integrations and a background daemon that keeps index data available for fast traversal and search workflows.',
		highlights:
			'Rust filesystem indexing\nCLI integration for index lookups\nBackground daemon for ongoing indexing',
		role: 'Filesystem tooling',
		tech: 'Rust, CLI, daemon',
		link: 'https://github.com/Winux-Core/Winux-PTree',
		imagePath: null,
		imageAlt: null,
		featured: 1,
		sort: 40,
	},
];

const DEFAULT_PLAYSETS: Omit<Playset, 'id' | 'createdAt' | 'updatedAt'>[] = [
	{
		name: 'Node.js Shell',
		slug: 'node-shell',
		runtime: 'node',
		description: 'Run Node commands and scripts inside an isolated container.',
		dockerImage: 'node:22-alpine',
		startCommand: 'tail -f /dev/null',
		defaultCommand: 'node -v',
		enabled: 1,
		maxSessions: 6,
		idleTimeoutSeconds: 900,
	},
	{
		name: 'Python Shell',
		slug: 'python-shell',
		runtime: 'python',
		description: 'Execute Python scripts in a disposable environment.',
		dockerImage: 'python:3.12-alpine',
		startCommand: 'tail -f /dev/null',
		defaultCommand: 'python --version',
		enabled: 1,
		maxSessions: 6,
		idleTimeoutSeconds: 900,
	},
	{
		name: 'Rust Shell',
		slug: 'rust-shell',
		runtime: 'rust',
		description: 'Compile and run Rust snippets from an isolated toolchain container.',
		dockerImage: 'rust:1.83-alpine3.20',
		startCommand: 'tail -f /dev/null',
		defaultCommand: 'rustc --version',
		enabled: 1,
		maxSessions: 4,
		idleTimeoutSeconds: 1200,
	},
];

const invalidateSiteCaches = async () => {
	await Promise.all([
		invalidateCached('layout:global'),
		invalidateCached('page:home'),
		invalidateCached('page:about'),
		invalidateCached('page:work'),
		invalidateCached('page:blog'),
		invalidateCached('site-settings'),
		invalidateCachedPrefix('xml:rss:'),
		invalidateCachedPrefix('xml:sitemap:'),
	]);
};

const invalidateStackCaches = async () => {
	await Promise.all([invalidateCached('page:home'), invalidateCached('page:about')]);
};

const invalidateWorkCaches = async () => {
	await Promise.all([invalidateCached('page:home'), invalidateCached('page:work')]);
};

const invalidatePostCaches = async () => {
	await Promise.all([
		invalidateCached('page:blog'),
		invalidateCachedPrefix('page:blog:post:'),
		invalidateCachedPrefix('xml:rss:'),
		invalidateCachedPrefix('xml:sitemap:'),
	]);
};

const invalidateFooterCaches = async () => {
	await invalidateCached('layout:global');
};

const invalidatePlaygroundCaches = async () => {
	await invalidateCachedPrefix('playground:status:');
};

const ensurePostgresPortfolioContent = async () => {
	await executePostgres(
		`UPDATE site_settings SET
			hero_headline = CASE
				WHEN hero_headline IN ($1, '') THEN $2
				ELSE hero_headline
			END,
			hero_subheadline = CASE
				WHEN hero_subheadline IN ($3, '') THEN $4
				ELSE hero_subheadline
			END,
			hero_note_title = CASE
				WHEN hero_note_title IN ($5, '') THEN $6
				ELSE hero_note_title
			END,
			hero_note_body = CASE
				WHEN hero_note_body IN ($7, '') THEN $8
				ELSE hero_note_body
			END,
			hero_highlights_title = CASE
				WHEN hero_highlights_title IN ($9, '') THEN $10
				ELSE hero_highlights_title
			END,
			hero_highlights_body = CASE
				WHEN hero_highlights_body IN ($11, '') THEN $12
				ELSE hero_highlights_body
			END,
			about_headline = CASE
				WHEN about_headline IN ($13, '') THEN $14
				ELSE about_headline
			END,
			about_body = CASE
				WHEN about_body IN ($15, '') THEN $16
				ELSE about_body
			END,
			focus_headline = CASE
				WHEN focus_headline IN ($17, '') THEN $18
				ELSE focus_headline
			END,
			focus_body = CASE
				WHEN focus_body IN ($19, '') THEN $20
				ELSE focus_body
			END,
			stack_title = CASE
				WHEN stack_title IN ($21, '') THEN $22
				ELSE stack_title
			END,
			stack_intro = CASE
				WHEN stack_intro IN ($23, '') THEN $24
				ELSE stack_intro
			END,
			work_title = CASE
				WHEN work_title IN ($25, '') THEN $26
				ELSE work_title
			END,
			work_intro = CASE
				WHEN work_intro IN ($27, '') THEN $28
				ELSE work_intro
			END,
			footer_badge = CASE
				WHEN footer_badge IN ($29, '') THEN $30
				ELSE footer_badge
			END,
			footer_headline = CASE
				WHEN footer_headline IN ($31, '') THEN $32
				ELSE footer_headline
			END,
			footer_body = CASE
				WHEN footer_body IN ($33, '') THEN $34
				ELSE footer_body
			END,
			updated_at = $35
		WHERE id = 1`,
		[
			'404ConnerNotFound - Building immersive applications across web, desktop, embedding, and networks.',
			DEFAULT_SITE_SETTINGS.heroHeadline,
			'Proficiency over promises.',
			DEFAULT_SITE_SETTINGS.heroSubheadline,
			'In the lab',
			DEFAULT_SITE_SETTINGS.heroNoteTitle,
			'Payload CMS, media pipelines, and richer case studies.',
			DEFAULT_SITE_SETTINGS.heroNoteBody,
			'Highlights',
			DEFAULT_SITE_SETTINGS.heroHighlightsTitle,
			'Latest focus, experiments, and releases.',
			DEFAULT_SITE_SETTINGS.heroHighlightsBody,
			'I build shit to prove others wrong.',
			DEFAULT_SITE_SETTINGS.aboutHeadline,
			'This site is my live workspace. I iterate, interoperate, and dedicate for the sake of advancements.',
			DEFAULT_SITE_SETTINGS.aboutBody,
			'I build, I break, I fix',
			DEFAULT_SITE_SETTINGS.focusHeadline,
			'Like I came, I saw, I conquered but I made, I tried, and I failed... then I succeeded.',
			DEFAULT_SITE_SETTINGS.focusBody,
			'My stack',
			DEFAULT_SITE_SETTINGS.stackTitle,
			'The tools I reach for when shipping immersive, reliable work.',
			DEFAULT_SITE_SETTINGS.stackIntro,
			'My work',
			DEFAULT_SITE_SETTINGS.workTitle,
			'Selected projects, prototypes, and experiments.',
			DEFAULT_SITE_SETTINGS.workIntro,
			'404connernotfound',
			DEFAULT_SITE_SETTINGS.footerBadge,
			'Building loud, expressive web experiences.',
			DEFAULT_SITE_SETTINGS.footerHeadline,
			'Personal portfolio, experiments, and shipping logs. Content updates as the archive grows.',
			DEFAULT_SITE_SETTINGS.footerBody,
			nowIso(),
		],
	);

	await executePostgres(
		`DELETE FROM footer_links
		 WHERE href IS NULL
			OR href = ''
			OR (label = 'YouTube' AND href = '#')
			OR (label = 'Blog' AND href = '/blog')
			OR (section = 'Links' AND label IN ('About', 'Work') AND href IN ('/about', '/work'))`,
	);

	const footerRows = await queryPostgres<{ section: string; label: string }>(
		'SELECT section, label FROM footer_links',
	);
	const knownFooterLinks = new Set(footerRows.map((row) => `${row.section}:${row.label}`));
	for (const rowData of DEFAULT_FOOTER_LINKS) {
		if (knownFooterLinks.has(`${rowData.section}:${rowData.label}`)) {
			await executePostgres(
				'UPDATE footer_links SET href = $1, external = $2, sort = $3 WHERE section = $4 AND label = $5',
				[rowData.href, rowData.external, rowData.sort, rowData.section, rowData.label],
			);
			continue;
		}
		await executePostgres(
			'INSERT INTO footer_links (section, label, href, external, sort) VALUES ($1, $2, $3, $4, $5)',
			[rowData.section, rowData.label, rowData.href, rowData.external, rowData.sort],
		);
	}

	const stackCount = await queryPostgres<{ count: number }>(
		'SELECT COUNT(*)::int as count FROM stack_items',
	);
	if ((stackCount[0]?.count ?? 0) === 0) {
		for (const rowData of DEFAULT_STACK_ITEMS) {
			await executePostgres(
				'INSERT INTO stack_items (label, detail, category, sort) VALUES ($1, $2, $3, $4)',
				[rowData.label, rowData.detail, rowData.category, rowData.sort],
			);
		}
	}

	const workCount = await queryPostgres<{ count: number }>(
		'SELECT COUNT(*)::int as count FROM work_items',
	);
	if ((workCount[0]?.count ?? 0) === 0) {
		for (const rowData of DEFAULT_WORK_ITEMS) {
			await executePostgres(
				`INSERT INTO work_items (
					title, description, long_description, highlights, role, tech, link,
					image_path, image_alt, featured, sort
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
				[
					rowData.title,
					rowData.description,
					rowData.longDescription,
					rowData.highlights,
					rowData.role,
					rowData.tech,
					rowData.link,
					rowData.imagePath,
					rowData.imageAlt,
					rowData.featured,
					rowData.sort,
				],
			);
		}
	}
};

const ensurePostgresSeeded = async (force = false) => {
	if (!shouldAutoSeed && !force) return;

	const row = await queryPostgres<{ count: number }>(
		'SELECT COUNT(*)::int as count FROM site_settings',
	);
	if ((row[0]?.count ?? 0) === 0) {
		const now = nowIso();
		await executePostgres(
			`INSERT INTO site_settings (
				id, hero_headline, hero_subheadline, hero_note_title, hero_note_body,
				hero_highlights_title, hero_highlights_body, about_headline, about_body,
				focus_headline, focus_body, stack_title, stack_intro, work_title, work_intro,
				blog_title, blog_intro, contact_title, contact_body, contact_email, github_url,
				footer_badge, footer_headline, footer_body, footer_cta_label, footer_cta_href,
				maintenance_enabled, maintenance_title, maintenance_body,
				error_403_title, error_403_body, error_404_title, error_404_body, error_500_title, error_500_body,
				updated_at
			) VALUES (
				1, $1, $2, $3, $4,
				$5, $6, $7, $8,
				$9, $10, $11, $12, $13, $14,
				$15, $16, $17, $18, $19, $20,
				$21, $22, $23, $24, $25,
				$26, $27, $28,
				$29, $30, $31, $32, $33, $34,
				$35
			)`,
			[
				DEFAULT_SITE_SETTINGS.heroHeadline,
				DEFAULT_SITE_SETTINGS.heroSubheadline,
				DEFAULT_SITE_SETTINGS.heroNoteTitle,
				DEFAULT_SITE_SETTINGS.heroNoteBody,
				DEFAULT_SITE_SETTINGS.heroHighlightsTitle,
				DEFAULT_SITE_SETTINGS.heroHighlightsBody,
				DEFAULT_SITE_SETTINGS.aboutHeadline,
				DEFAULT_SITE_SETTINGS.aboutBody,
				DEFAULT_SITE_SETTINGS.focusHeadline,
				DEFAULT_SITE_SETTINGS.focusBody,
				DEFAULT_SITE_SETTINGS.stackTitle,
				DEFAULT_SITE_SETTINGS.stackIntro,
				DEFAULT_SITE_SETTINGS.workTitle,
				DEFAULT_SITE_SETTINGS.workIntro,
				DEFAULT_SITE_SETTINGS.blogTitle,
				DEFAULT_SITE_SETTINGS.blogIntro,
				DEFAULT_SITE_SETTINGS.contactTitle,
				DEFAULT_SITE_SETTINGS.contactBody,
				DEFAULT_SITE_SETTINGS.contactEmail,
				DEFAULT_SITE_SETTINGS.githubUrl,
				DEFAULT_SITE_SETTINGS.footerBadge,
				DEFAULT_SITE_SETTINGS.footerHeadline,
				DEFAULT_SITE_SETTINGS.footerBody,
				DEFAULT_SITE_SETTINGS.footerCtaLabel,
				DEFAULT_SITE_SETTINGS.footerCtaHref,
				DEFAULT_SITE_SETTINGS.maintenanceEnabled,
				DEFAULT_SITE_SETTINGS.maintenanceTitle,
				DEFAULT_SITE_SETTINGS.maintenanceBody,
				DEFAULT_SITE_SETTINGS.error403Title,
				DEFAULT_SITE_SETTINGS.error403Body,
				DEFAULT_SITE_SETTINGS.error404Title,
				DEFAULT_SITE_SETTINGS.error404Body,
				DEFAULT_SITE_SETTINGS.error500Title,
				DEFAULT_SITE_SETTINGS.error500Body,
				now,
			],
		);
	}

	const footerCount = await queryPostgres<{ count: number }>(
		'SELECT COUNT(*)::int as count FROM footer_links',
	);
	if ((footerCount[0]?.count ?? 0) === 0) {
		for (const rowData of DEFAULT_FOOTER_LINKS) {
			await executePostgres(
				'INSERT INTO footer_links (section, label, href, external, sort) VALUES ($1, $2, $3, $4, $5)',
				[rowData.section, rowData.label, rowData.href, rowData.external, rowData.sort],
			);
		}
	}

	const playsetCount = await queryPostgres<{ count: number }>(
		'SELECT COUNT(*)::int as count FROM playsets',
	);
	if ((playsetCount[0]?.count ?? 0) === 0) {
		const now = nowIso();
		for (const rowData of DEFAULT_PLAYSETS) {
			await executePostgres(
				`INSERT INTO playsets (
					name, slug, runtime, description, docker_image, start_command, default_command,
					artifact_type, artifact_path, extracted_path, compose_path, verify_status, verify_log, last_verified_at,
					enabled, max_sessions, idle_timeout_seconds, created_at, updated_at
				) VALUES (
					$1, $2, $3, $4, $5, $6, $7,
					$8, $9, $10, $11, $12, $13, $14,
					$15, $16, $17, $18, $19
				)`,
				[
					rowData.name,
					rowData.slug,
					rowData.runtime,
					rowData.description,
					rowData.dockerImage,
					rowData.startCommand,
					rowData.defaultCommand,
					rowData.runtime,
					rowData.dockerImage,
					'',
					null,
					'pending',
					null,
					null,
					rowData.enabled,
					rowData.maxSessions,
					rowData.idleTimeoutSeconds,
					now,
					now,
				],
			);
		}
	}

	await ensurePostgresPortfolioContent();
};

const ensurePostgresReady = async () => {
	if (!isPostgresConfigured()) return false;
	if (!pgReadyPromise) {
		pgReadyPromise = ensurePostgresAppSchema()
			.then(() => true)
			.catch(() => false);
	}
	const ready = await pgReadyPromise;
	if (!ready) return false;

	if (!pgSeedPromise) {
		pgSeedPromise = ensurePostgresSeeded().catch(() => undefined);
	}
	await pgSeedPromise;
	return true;
};

const withDbFallback = async <T>(primary: () => Promise<T>, fallback: () => T | Promise<T>) => {
	const ready = await ensurePostgresReady();
	if (ready) {
		try {
			return await primary();
		} catch {
			return fallback();
		}
	}

	return fallback();
};

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)+/g, '');

const slugifyPlayset = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)+/g, '');

const ensureUniquePostSlugPg = async (slug: string, currentId?: number) => {
	const base = slug || 'post';
	let candidate = base;
	let suffix = 1;
	for (;;) {
		const existing = await queryPostgres<{ id: number }>('SELECT id FROM posts WHERE slug = $1', [
			candidate,
		]);
		if (existing.length === 0 || (currentId && existing[0].id === currentId)) {
			return candidate;
		}
		candidate = `${base}-${suffix}`;
		suffix += 1;
	}
};

const ensureUniquePlaysetSlugPg = async (slug: string, currentId?: number) => {
	const base = slug || 'playset';
	let candidate = base;
	let suffix = 1;
	for (;;) {
		const existing = await queryPostgres<{ id: number }>(
			'SELECT id FROM playsets WHERE slug = $1',
			[candidate],
		);
		if (existing.length === 0 || (currentId && existing[0].id === currentId)) {
			return candidate;
		}
		candidate = `${base}-${suffix}`;
		suffix += 1;
	}
};

export const seedDatabase = async () => {
	await sqliteDb.seedDatabase();
	if (isPostgresConfigured()) {
		await ensurePostgresAppSchema();
		await ensurePostgresSeeded(true);
	}
};

export const getSiteSettings = async (): Promise<SiteSettings> =>
	withDbFallback(
		async () => {
			const rows = await queryPostgres<SiteSettings>(
				`SELECT
					id,
					hero_headline as "heroHeadline",
					hero_subheadline as "heroSubheadline",
					hero_note_title as "heroNoteTitle",
					hero_note_body as "heroNoteBody",
					hero_highlights_title as "heroHighlightsTitle",
					hero_highlights_body as "heroHighlightsBody",
					about_headline as "aboutHeadline",
					about_body as "aboutBody",
					focus_headline as "focusHeadline",
					focus_body as "focusBody",
					stack_title as "stackTitle",
					stack_intro as "stackIntro",
					work_title as "workTitle",
					work_intro as "workIntro",
					blog_title as "blogTitle",
					blog_intro as "blogIntro",
					contact_title as "contactTitle",
					contact_body as "contactBody",
					contact_email as "contactEmail",
					github_url as "githubUrl",
					footer_badge as "footerBadge",
					footer_headline as "footerHeadline",
					footer_body as "footerBody",
					footer_cta_label as "footerCtaLabel",
					footer_cta_href as "footerCtaHref",
					maintenance_enabled as "maintenanceEnabled",
					maintenance_title as "maintenanceTitle",
					maintenance_body as "maintenanceBody",
					error_403_title as "error403Title",
					error_403_body as "error403Body",
					error_404_title as "error404Title",
					error_404_body as "error404Body",
					error_500_title as "error500Title",
					error_500_body as "error500Body"
				FROM site_settings
				WHERE id = 1`,
			);
			if (!rows[0]) {
				throw new Error(
					'Database is not initialized. Run `npm run db:seed` or set DB_AUTO_SEED=true.',
				);
			}
			return rows[0];
		},
		() => sqliteDb.getSiteSettings(),
	);

export const updateSiteSettings = async (payload: Omit<SiteSettings, 'id'>) => {
	await withDbFallback(
		async () => {
			const now = nowIso();
			await executePostgres(
				`UPDATE site_settings SET
					hero_headline = $1,
					hero_subheadline = $2,
					hero_note_title = $3,
					hero_note_body = $4,
					hero_highlights_title = $5,
					hero_highlights_body = $6,
					about_headline = $7,
					about_body = $8,
					focus_headline = $9,
					focus_body = $10,
					stack_title = $11,
					stack_intro = $12,
					work_title = $13,
					work_intro = $14,
					blog_title = $15,
					blog_intro = $16,
					contact_title = $17,
					contact_body = $18,
					contact_email = $19,
					github_url = $20,
					footer_badge = $21,
					footer_headline = $22,
					footer_body = $23,
					footer_cta_label = $24,
					footer_cta_href = $25,
					maintenance_enabled = $26,
					maintenance_title = $27,
					maintenance_body = $28,
					error_403_title = $29,
					error_403_body = $30,
					error_404_title = $31,
					error_404_body = $32,
					error_500_title = $33,
					error_500_body = $34,
					updated_at = $35
				WHERE id = 1`,
				[
					payload.heroHeadline,
					payload.heroSubheadline,
					payload.heroNoteTitle,
					payload.heroNoteBody,
					payload.heroHighlightsTitle,
					payload.heroHighlightsBody,
					payload.aboutHeadline,
					payload.aboutBody,
					payload.focusHeadline,
					payload.focusBody,
					payload.stackTitle,
					payload.stackIntro,
					payload.workTitle,
					payload.workIntro,
					payload.blogTitle,
					payload.blogIntro,
					payload.contactTitle,
					payload.contactBody,
					payload.contactEmail,
					payload.githubUrl,
					payload.footerBadge,
					payload.footerHeadline,
					payload.footerBody,
					payload.footerCtaLabel,
					payload.footerCtaHref,
					payload.maintenanceEnabled,
					payload.maintenanceTitle,
					payload.maintenanceBody,
					payload.error403Title,
					payload.error403Body,
					payload.error404Title,
					payload.error404Body,
					payload.error500Title,
					payload.error500Body,
					now,
				],
			);
		},
		() => sqliteDb.updateSiteSettings(payload),
	);
	await invalidateSiteCaches();
};

export const getStackItems = async (): Promise<StackItem[]> =>
	withDbFallback(
		() =>
			queryPostgres<StackItem>(
				'SELECT id, label, detail, category, sort FROM stack_items ORDER BY sort ASC, id DESC',
			),
		() => sqliteDb.getStackItems(),
	);

export const createStackItem = async (
	label: string,
	detail: string | null,
	category: string | null,
	sort: number,
) => {
	await withDbFallback(
		() =>
			executePostgres(
				'INSERT INTO stack_items (label, detail, category, sort) VALUES ($1, $2, $3, $4)',
				[label, detail, category, sort],
			),
		() => sqliteDb.createStackItem(label, detail, category, sort),
	);
	await invalidateStackCaches();
};

export const updateStackItem = async (
	id: number,
	label: string,
	detail: string | null,
	category: string | null,
	sort: number,
) => {
	await withDbFallback(
		() =>
			executePostgres(
				'UPDATE stack_items SET label = $1, detail = $2, category = $3, sort = $4 WHERE id = $5',
				[label, detail, category, sort, id],
			),
		() => sqliteDb.updateStackItem(id, label, detail, category, sort),
	);
	await invalidateStackCaches();
};

export const reorderStackItems = async (orderedIds: number[]) => {
	await withDbFallback(
		async () => {
			const currentIds = await queryPostgres<{ id: number }>(
				'SELECT id FROM stack_items ORDER BY sort ASC, id DESC',
			);
			if (currentIds.length === 0) return;
			const known = new Set(currentIds.map((row) => row.id));
			const deduped = Array.from(new Set(orderedIds.filter((id) => known.has(id))));
			const missing = currentIds.map((row) => row.id).filter((id) => !deduped.includes(id));
			const finalOrder = [...deduped, ...missing];
			for (let index = 0; index < finalOrder.length; index += 1) {
				await executePostgres('UPDATE stack_items SET sort = $1 WHERE id = $2', [
					(index + 1) * 10,
					finalOrder[index],
				]);
			}
		},
		() => sqliteDb.reorderStackItems(orderedIds),
	);
	await invalidateStackCaches();
};

export const deleteStackItem = async (id: number) => {
	await withDbFallback(
		() => executePostgres('DELETE FROM stack_items WHERE id = $1', [id]),
		() => sqliteDb.deleteStackItem(id),
	);
	await invalidateStackCaches();
};

export const getWorkItems = async (): Promise<WorkItem[]> =>
	withDbFallback(
		() =>
			queryPostgres<WorkItem>(
				`SELECT id, title, description, long_description as "longDescription", highlights, role, tech, link,
				 image_path as "imagePath", image_alt as "imageAlt", featured, sort
				 FROM work_items
				 ORDER BY sort ASC, id DESC`,
			),
		() => sqliteDb.getWorkItems(),
	);

export const getFeaturedWork = async (): Promise<WorkItem[]> =>
	withDbFallback(
		() =>
			queryPostgres<WorkItem>(
				`SELECT id, title, description, long_description as "longDescription", highlights, role, tech, link,
				 image_path as "imagePath", image_alt as "imageAlt", featured, sort
				 FROM work_items
				 WHERE featured = 1
				 ORDER BY sort ASC, id DESC`,
			),
		() => sqliteDb.getFeaturedWork(),
	);

export const createWorkItem = async (
	title: string,
	description: string,
	longDescription: string | null,
	highlights: string | null,
	role: string | null,
	tech: string | null,
	link: string | null,
	imagePath: string | null,
	imageAlt: string | null,
	featured: number,
	sort: number,
) => {
	await withDbFallback(
		() =>
			executePostgres(
				`INSERT INTO work_items (
					title, description, long_description, highlights, role, tech, link, image_path, image_alt, featured, sort
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
				[
					title,
					description,
					longDescription,
					highlights,
					role,
					tech,
					link,
					imagePath,
					imageAlt,
					featured,
					sort,
				],
			),
		() =>
			sqliteDb.createWorkItem(
				title,
				description,
				longDescription,
				highlights,
				role,
				tech,
				link,
				imagePath,
				imageAlt,
				featured,
				sort,
			),
	);
	await invalidateWorkCaches();
};

export const updateWorkItem = async (
	id: number,
	title: string,
	description: string,
	longDescription: string | null,
	highlights: string | null,
	role: string | null,
	tech: string | null,
	link: string | null,
	imagePath: string | null,
	imageAlt: string | null,
	featured: number,
	sort: number,
) => {
	await withDbFallback(
		() =>
			executePostgres(
				`UPDATE work_items
				 SET title = $1, description = $2, long_description = $3, highlights = $4, role = $5, tech = $6, link = $7,
					 image_path = $8, image_alt = $9, featured = $10, sort = $11
				 WHERE id = $12`,
				[
					title,
					description,
					longDescription,
					highlights,
					role,
					tech,
					link,
					imagePath,
					imageAlt,
					featured,
					sort,
					id,
				],
			),
		() =>
			sqliteDb.updateWorkItem(
				id,
				title,
				description,
				longDescription,
				highlights,
				role,
				tech,
				link,
				imagePath,
				imageAlt,
				featured,
				sort,
			),
	);
	await invalidateWorkCaches();
};

export const deleteWorkItem = async (id: number) => {
	await withDbFallback(
		() => executePostgres('DELETE FROM work_items WHERE id = $1', [id]),
		() => sqliteDb.deleteWorkItem(id),
	);
	await invalidateWorkCaches();
};

export const getPosts = async (): Promise<BlogPost[]> =>
	withDbFallback(
		() =>
			queryPostgres<BlogPost>(
				`SELECT id, title, slug, excerpt, content, tags, draft, featured, published_at as "publishedAt", created_at as "createdAt"
				 FROM posts
				 ORDER BY published_at DESC, created_at DESC`,
			),
		() => sqliteDb.getPosts(),
	);

export const getPublishedPosts = async (): Promise<BlogPost[]> =>
	withDbFallback(
		() =>
			queryPostgres<BlogPost>(
				`SELECT id, title, slug, excerpt, content, tags, draft, featured, published_at as "publishedAt", created_at as "createdAt"
				 FROM posts
				 WHERE draft = 0
				 ORDER BY published_at DESC, created_at DESC`,
			),
		() => sqliteDb.getPublishedPosts(),
	);

export const getPostBySlug = async (slug: string): Promise<BlogPost | undefined> =>
	withDbFallback(
		async () => {
			const rows = await queryPostgres<BlogPost>(
				`SELECT id, title, slug, excerpt, content, tags, draft, featured, published_at as "publishedAt", created_at as "createdAt"
				 FROM posts
				 WHERE slug = $1`,
				[slug],
			);
			return rows[0];
		},
		() => sqliteDb.getPostBySlug(slug),
	);

export const getPublishedPostBySlug = async (slug: string): Promise<BlogPost | undefined> =>
	withDbFallback(
		async () => {
			const rows = await queryPostgres<BlogPost>(
				`SELECT id, title, slug, excerpt, content, tags, draft, featured, published_at as "publishedAt", created_at as "createdAt"
				 FROM posts
				 WHERE slug = $1 AND draft = 0`,
				[slug],
			);
			return rows[0];
		},
		() => sqliteDb.getPublishedPostBySlug(slug),
	);

export const createPost = async (
	title: string,
	excerpt: string | null,
	content: string | null,
	tags: string | null,
	draft: number,
	featured: number,
	publishedAt: string | null,
	slug?: string,
) => {
	await withDbFallback(
		async () => {
			const baseSlug = slug && slug.length > 0 ? slug : slugify(title);
			const finalSlug = await ensureUniquePostSlugPg(baseSlug);
			await executePostgres(
				`INSERT INTO posts (title, slug, excerpt, content, tags, draft, featured, published_at, created_at)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
				[title, finalSlug, excerpt, content, tags, draft, featured, publishedAt, nowIso()],
			);
		},
		() => sqliteDb.createPost(title, excerpt, content, tags, draft, featured, publishedAt, slug),
	);
	await invalidatePostCaches();
};

export const updatePost = async (
	id: number,
	title: string,
	excerpt: string | null,
	content: string | null,
	tags: string | null,
	draft: number,
	featured: number,
	publishedAt: string | null,
	slug?: string,
) => {
	await withDbFallback(
		async () => {
			const baseSlug = slug && slug.length > 0 ? slug : slugify(title);
			const finalSlug = await ensureUniquePostSlugPg(baseSlug, id);
			await executePostgres(
				`UPDATE posts
				 SET title = $1, slug = $2, excerpt = $3, content = $4, tags = $5, draft = $6, featured = $7, published_at = $8
				 WHERE id = $9`,
				[title, finalSlug, excerpt, content, tags, draft, featured, publishedAt, id],
			);
		},
		() =>
			sqliteDb.updatePost(id, title, excerpt, content, tags, draft, featured, publishedAt, slug),
	);
	await invalidatePostCaches();
};

export const deletePost = async (id: number) => {
	await withDbFallback(
		() => executePostgres('DELETE FROM posts WHERE id = $1', [id]),
		() => sqliteDb.deletePost(id),
	);
	await invalidatePostCaches();
};

export const getAssets = async (): Promise<Asset[]> =>
	withDbFallback(
		() =>
			queryPostgres<Asset>(
				`SELECT id, label, filename, path, mime, size, public, created_at as "createdAt"
				 FROM assets
				 ORDER BY created_at DESC, id DESC`,
			),
		() => sqliteDb.getAssets(),
	);

export const getPublicAssets = async (): Promise<Asset[]> => {
	const all = await getAssets();
	return all.filter((asset) => asset.public === 1);
};

export const createAsset = async (
	label: string,
	filename: string,
	pathValue: string,
	mime: string,
	size: number,
	isPublic: number,
) => {
	await withDbFallback(
		() =>
			executePostgres(
				`INSERT INTO assets (label, filename, path, mime, size, public, created_at)
				 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
				[label, filename, pathValue, mime, size, isPublic, nowIso()],
			),
		() => sqliteDb.createAsset(label, filename, pathValue, mime, size, isPublic),
	);
};

export const updateAsset = async (id: number, label: string, isPublic: number) => {
	await withDbFallback(
		() =>
			executePostgres('UPDATE assets SET label = $1, public = $2 WHERE id = $3', [
				label,
				isPublic,
				id,
			]),
		() => sqliteDb.updateAsset(id, label, isPublic),
	);
};

export const deleteAsset = async (id: number) => {
	await withDbFallback(
		() => executePostgres('DELETE FROM assets WHERE id = $1', [id]),
		() => sqliteDb.deleteAsset(id),
	);
};

export const getTestimonials = async (): Promise<Testimonial[]> =>
	withDbFallback(
		() =>
			queryPostgres<Testimonial>(
				`SELECT id, name, role, company, quote, project, result, email, approved, created_at as "createdAt"
				 FROM testimonials
				 ORDER BY created_at DESC, id DESC`,
			),
		() => sqliteDb.getTestimonials(),
	);

export const getApprovedTestimonials = async (): Promise<Testimonial[]> =>
	withDbFallback(
		() =>
			queryPostgres<Testimonial>(
				`SELECT id, name, role, company, quote, project, result, email, approved, created_at as "createdAt"
				 FROM testimonials
				 WHERE approved = 1
				 ORDER BY created_at DESC, id DESC`,
			),
		() => sqliteDb.getApprovedTestimonials(),
	);

export const createTestimonial = async (
	name: string,
	role: string | null,
	company: string | null,
	quote: string,
	project: string | null,
	result: string | null,
	email: string | null,
) => {
	await withDbFallback(
		() =>
			executePostgres(
				`INSERT INTO testimonials (name, role, company, quote, project, result, email, approved, created_at)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8)`,
				[name, role, company, quote, project, result, email, nowIso()],
			),
		() => sqliteDb.createTestimonial(name, role, company, quote, project, result, email),
	);
};

export const updateTestimonialApproval = async (id: number, approved: number) => {
	await withDbFallback(
		() => executePostgres('UPDATE testimonials SET approved = $1 WHERE id = $2', [approved, id]),
		() => sqliteDb.updateTestimonialApproval(id, approved),
	);
};

export const deleteTestimonial = async (id: number) => {
	await withDbFallback(
		() => executePostgres('DELETE FROM testimonials WHERE id = $1', [id]),
		() => sqliteDb.deleteTestimonial(id),
	);
};

export const getFooterLinks = async (): Promise<FooterLink[]> =>
	withDbFallback(
		() =>
			queryPostgres<FooterLink>(
				`SELECT id, section, label, href, external, sort
				 FROM footer_links
				 ORDER BY section ASC, sort ASC, id ASC`,
			),
		() => sqliteDb.getFooterLinks(),
	);

export const createFooterLink = async (
	section: string,
	label: string,
	href: string | null,
	external: number,
	sort: number,
) => {
	await withDbFallback(
		() =>
			executePostgres(
				'INSERT INTO footer_links (section, label, href, external, sort) VALUES ($1, $2, $3, $4, $5)',
				[section, label, href, external, sort],
			),
		() => sqliteDb.createFooterLink(section, label, href, external, sort),
	);
	await invalidateFooterCaches();
};

export const updateFooterLink = async (
	id: number,
	section: string,
	label: string,
	href: string | null,
	external: number,
	sort: number,
) => {
	await withDbFallback(
		() =>
			executePostgres(
				`UPDATE footer_links
				 SET section = $1, label = $2, href = $3, external = $4, sort = $5
				 WHERE id = $6`,
				[section, label, href, external, sort, id],
			),
		() => sqliteDb.updateFooterLink(id, section, label, href, external, sort),
	);
	await invalidateFooterCaches();
};

export const deleteFooterLink = async (id: number) => {
	await withDbFallback(
		() => executePostgres('DELETE FROM footer_links WHERE id = $1', [id]),
		() => sqliteDb.deleteFooterLink(id),
	);
	await invalidateFooterCaches();
};

export const getPlaysets = async (): Promise<Playset[]> =>
	withDbFallback(
		() =>
			queryPostgres<Playset>(
				`SELECT
					id, name, slug, runtime, COALESCE(description, '') as description, docker_image as "dockerImage",
					start_command as "startCommand", default_command as "defaultCommand",
					enabled, max_sessions as "maxSessions", idle_timeout_seconds as "idleTimeoutSeconds",
					created_at as "createdAt", updated_at as "updatedAt"
				 FROM playsets
				 ORDER BY enabled DESC, name ASC`,
			),
		() => sqliteDb.getPlaysets(),
	);

export const getEnabledPlaysets = async (): Promise<Playset[]> => {
	const playsets = await getPlaysets();
	return playsets.filter((playset) => playset.enabled === 1);
};

export const getPlaysetById = async (id: number): Promise<Playset | undefined> =>
	withDbFallback(
		async () => {
			const rows = await queryPostgres<Playset>(
				`SELECT
					id, name, slug, runtime, COALESCE(description, '') as description, docker_image as "dockerImage",
					start_command as "startCommand", default_command as "defaultCommand",
					enabled, max_sessions as "maxSessions", idle_timeout_seconds as "idleTimeoutSeconds",
					created_at as "createdAt", updated_at as "updatedAt"
				 FROM playsets
				 WHERE id = $1`,
				[id],
			);
			return rows[0];
		},
		() => sqliteDb.getPlaysetById(id),
	);

export const getPlaysetBySlug = async (slug: string): Promise<Playset | undefined> =>
	withDbFallback(
		async () => {
			const rows = await queryPostgres<Playset>(
				`SELECT
					id, name, slug, runtime, COALESCE(description, '') as description, docker_image as "dockerImage",
					start_command as "startCommand", default_command as "defaultCommand",
					enabled, max_sessions as "maxSessions", idle_timeout_seconds as "idleTimeoutSeconds",
					created_at as "createdAt", updated_at as "updatedAt"
				 FROM playsets
				 WHERE slug = $1`,
				[slug],
			);
			return rows[0];
		},
		() => sqliteDb.getPlaysetBySlug(slug),
	);

export const createPlayset = async (
	name: string,
	runtime: string,
	description: string,
	dockerImage: string,
	startCommand: string | null,
	defaultCommand: string | null,
	enabled: number,
	maxSessions: number,
	idleTimeoutSeconds: number,
	slug?: string,
) => {
	await withDbFallback(
		async () => {
			const now = nowIso();
			const baseSlug = slug && slug.length > 0 ? slugifyPlayset(slug) : slugifyPlayset(name);
			const finalSlug = await ensureUniquePlaysetSlugPg(baseSlug);
			await executePostgres(
				`INSERT INTO playsets (
					name, slug, runtime, description, docker_image, start_command, default_command,
					artifact_type, artifact_path, extracted_path, compose_path, verify_status, verify_log, last_verified_at,
					enabled, max_sessions, idle_timeout_seconds, created_at, updated_at
				) VALUES (
					$1, $2, $3, $4, $5, $6, $7,
					$8, $9, $10, $11, $12, $13, $14,
					$15, $16, $17, $18, $19
				)`,
				[
					name,
					finalSlug,
					runtime,
					description,
					dockerImage,
					startCommand,
					defaultCommand,
					runtime,
					dockerImage,
					'',
					null,
					'pending',
					null,
					null,
					enabled,
					maxSessions,
					idleTimeoutSeconds,
					now,
					now,
				],
			);
		},
		() =>
			sqliteDb.createPlayset(
				name,
				runtime,
				description,
				dockerImage,
				startCommand,
				defaultCommand,
				enabled,
				maxSessions,
				idleTimeoutSeconds,
				slug,
			),
	);
	await invalidatePlaygroundCaches();
};

export const updatePlayset = async (
	id: number,
	name: string,
	runtime: string,
	description: string,
	dockerImage: string,
	startCommand: string | null,
	defaultCommand: string | null,
	enabled: number,
	maxSessions: number,
	idleTimeoutSeconds: number,
	slug?: string,
) => {
	await withDbFallback(
		async () => {
			const now = nowIso();
			const baseSlug = slug && slug.length > 0 ? slugifyPlayset(slug) : slugifyPlayset(name);
			const finalSlug = await ensureUniquePlaysetSlugPg(baseSlug, id);
			await executePostgres(
				`UPDATE playsets
				 SET name = $1, slug = $2, runtime = $3, description = $4, docker_image = $5, start_command = $6,
					 default_command = $7, artifact_type = $8, artifact_path = $9, enabled = $10, max_sessions = $11,
					 idle_timeout_seconds = $12, updated_at = $13
				 WHERE id = $14`,
				[
					name,
					finalSlug,
					runtime,
					description,
					dockerImage,
					startCommand,
					defaultCommand,
					runtime,
					dockerImage,
					enabled,
					maxSessions,
					idleTimeoutSeconds,
					now,
					id,
				],
			);
		},
		() =>
			sqliteDb.updatePlayset(
				id,
				name,
				runtime,
				description,
				dockerImage,
				startCommand,
				defaultCommand,
				enabled,
				maxSessions,
				idleTimeoutSeconds,
				slug,
			),
	);
	await invalidatePlaygroundCaches();
};

export const deletePlayset = async (id: number) => {
	await withDbFallback(
		() => executePostgres('DELETE FROM playsets WHERE id = $1', [id]),
		() => sqliteDb.deletePlayset(id),
	);
	await invalidatePlaygroundCaches();
};

export const countActivePlaygroundSessionsForPlayset = async (playsetId: number): Promise<number> =>
	withDbFallback(
		async () => {
			const rows = await queryPostgres<{ count: number }>(
				`SELECT COUNT(*)::int as count
				 FROM playground_sessions
				 WHERE playset_id = $1 AND status IN ('starting', 'active')`,
				[playsetId],
			);
			return rows[0]?.count ?? 0;
		},
		() => sqliteDb.countActivePlaygroundSessionsForPlayset(playsetId),
	);

export const createPlaygroundSession = async (
	sessionId: string,
	playsetId: number,
	joinToken: string,
	clientIp: string | null,
	userAgent: string | null,
	status = 'starting',
) => {
	await withDbFallback(
		() =>
			executePostgres(
				`INSERT INTO playground_sessions (
					session_id, playset_id, status, join_token, container_id, reason, client_ip, user_agent,
					created_at, updated_at, ended_at
				) VALUES ($1, $2, $3, $4, NULL, NULL, $5, $6, $7, $8, NULL)`,
				[sessionId, playsetId, status, joinToken, clientIp, userAgent, nowIso(), nowIso()],
			),
		() =>
			sqliteDb.createPlaygroundSession(
				sessionId,
				playsetId,
				joinToken,
				clientIp,
				userAgent,
				status,
			),
	);
	await invalidatePlaygroundCaches();
};

export const getPlaygroundSessionBySessionId = async (
	sessionId: string,
): Promise<PlaygroundSession | undefined> =>
	withDbFallback(
		async () => {
			const rows = await queryPostgres<PlaygroundSession>(
				`SELECT
					id, session_id as "sessionId", playset_id as "playsetId", status, join_token as "joinToken",
					container_id as "containerId", reason, client_ip as "clientIp", user_agent as "userAgent",
					created_at as "createdAt", updated_at as "updatedAt", ended_at as "endedAt"
				 FROM playground_sessions
				 WHERE session_id = $1`,
				[sessionId],
			);
			return rows[0];
		},
		() => sqliteDb.getPlaygroundSessionBySessionId(sessionId),
	);

export const updatePlaygroundSessionStatus = async (
	sessionId: string,
	status: string,
	options?: { containerId?: string | null; reason?: string | null; ended?: boolean },
) => {
	await withDbFallback(
		async () => {
			const current = await getPlaygroundSessionBySessionId(sessionId);
			if (!current) return;
			const now = nowIso();
			const endedAt = options?.ended ? now : current.endedAt;
			const nextContainerId =
				options?.containerId === undefined ? current.containerId : options.containerId;
			const nextReason = options?.reason === undefined ? current.reason : options.reason;
			await executePostgres(
				`UPDATE playground_sessions
				 SET status = $1, container_id = $2, reason = $3, updated_at = $4, ended_at = $5
				 WHERE session_id = $6`,
				[status, nextContainerId, nextReason, now, endedAt, sessionId],
			);
		},
		() => sqliteDb.updatePlaygroundSessionStatus(sessionId, status, options),
	);
	await invalidatePlaygroundCaches();
};

export const createPlaygroundSocketConnection = async (wsId: string, sessionId: string) => {
	await withDbFallback(
		() =>
			executePostgres(
				`INSERT INTO playground_socket_connections (
					ws_id, session_id, connected_at, disconnected_at, close_code, close_reason
				) VALUES ($1, $2, $3, NULL, NULL, NULL)`,
				[wsId, sessionId, nowIso()],
			),
		() => sqliteDb.createPlaygroundSocketConnection(wsId, sessionId),
	);
	await invalidatePlaygroundCaches();
};

export const closePlaygroundSocketConnection = async (
	wsId: string,
	closeCode: number | null,
	closeReason: string | null,
) => {
	await withDbFallback(
		() =>
			executePostgres(
				`UPDATE playground_socket_connections
				 SET disconnected_at = $1, close_code = $2, close_reason = $3
				 WHERE ws_id = $4`,
				[nowIso(), closeCode, closeReason, wsId],
			),
		() => sqliteDb.closePlaygroundSocketConnection(wsId, closeCode, closeReason),
	);
	await invalidatePlaygroundCaches();
};

export const createPlaygroundLog = async (
	sessionId: string,
	wsId: string | null,
	level: string,
	event: string,
	message: string,
	payload: string | null = null,
) => {
	await withDbFallback(
		() =>
			executePostgres(
				`INSERT INTO playground_logs (session_id, ws_id, level, event, message, payload, created_at)
				 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
				[sessionId, wsId, level, event, message, payload, nowIso()],
			),
		() => sqliteDb.createPlaygroundLog(sessionId, wsId, level, event, message, payload),
	);
	await invalidatePlaygroundCaches();
};

export const getPlaygroundLogsBySession = async (
	sessionId: string,
	limit = 200,
): Promise<PlaygroundLog[]> =>
	withDbFallback(
		() =>
			queryPostgres<PlaygroundLog>(
				`SELECT
					id, session_id as "sessionId", ws_id as "wsId", level, event, message, payload, created_at as "createdAt"
				 FROM playground_logs
				 WHERE session_id = $1
				 ORDER BY id DESC
				 LIMIT $2`,
				[sessionId, limit],
			),
		() => sqliteDb.getPlaygroundLogsBySession(sessionId, limit),
	);

export const getRecentPlaygroundLogs = async (limit = 200): Promise<PlaygroundLog[]> =>
	withDbFallback(
		() =>
			queryPostgres<PlaygroundLog>(
				`SELECT
					id, session_id as "sessionId", ws_id as "wsId", level, event, message, payload, created_at as "createdAt"
				 FROM playground_logs
				 ORDER BY id DESC
				 LIMIT $1`,
				[limit],
			),
		() => sqliteDb.getRecentPlaygroundLogs(limit),
	);

export const getRecentPlaygroundSessions = async (
	limit = 200,
): Promise<PlaygroundSessionListItem[]> =>
	withDbFallback(
		() =>
			queryPostgres<PlaygroundSessionListItem>(
				`SELECT
					s.id, s.session_id as "sessionId", s.playset_id as "playsetId", s.status, s.join_token as "joinToken",
					s.container_id as "containerId", s.reason, s.client_ip as "clientIp", s.user_agent as "userAgent",
					s.created_at as "createdAt", s.updated_at as "updatedAt", s.ended_at as "endedAt",
					p.name as "playsetName", p.slug as "playsetSlug", p.runtime as "playsetRuntime"
				 FROM playground_sessions s
				 INNER JOIN playsets p ON p.id = s.playset_id
				 ORDER BY s.created_at DESC, s.id DESC
				 LIMIT $1`,
				[limit],
			),
		() => sqliteDb.getRecentPlaygroundSessions(limit),
	);

export const getPlaygroundOperationalCounts = async (): Promise<PlaygroundOperationalCounts> =>
	withDbFallback(
		async () => {
			const [totalSessions, activeSessions, failedSessions, activeSocketConnections, totalLogs] =
				await Promise.all([
					queryPostgres<{ count: number }>(
						'SELECT COUNT(*)::int as count FROM playground_sessions',
					),
					queryPostgres<{ count: number }>(
						`SELECT COUNT(*)::int as count FROM playground_sessions WHERE status IN ('starting', 'active')`,
					),
					queryPostgres<{ count: number }>(
						`SELECT COUNT(*)::int as count FROM playground_sessions WHERE status = 'failed'`,
					),
					queryPostgres<{ count: number }>(
						`SELECT COUNT(*)::int as count FROM playground_socket_connections WHERE disconnected_at IS NULL`,
					),
					queryPostgres<{ count: number }>('SELECT COUNT(*)::int as count FROM playground_logs'),
				]);

			return {
				totalSessions: totalSessions[0]?.count ?? 0,
				activeSessions: activeSessions[0]?.count ?? 0,
				failedSessions: failedSessions[0]?.count ?? 0,
				activeSocketConnections: activeSocketConnections[0]?.count ?? 0,
				totalLogs: totalLogs[0]?.count ?? 0,
			};
		},
		() => sqliteDb.getPlaygroundOperationalCounts(),
	);

export {
	createInboundMessage,
	upsertNewsletterSubscription,
	createTrackingEvent,
	getTrackingEvents,
	getTrackingCounts,
} from '$lib/server/telemetryStore';

export type {
	SiteSettings,
	StackItem,
	WorkItem,
	BlogPost,
	Asset,
	Testimonial,
	TrackingEvent,
	FooterLink,
	Playset,
	PlaygroundSession,
	PlaygroundSessionListItem,
	PlaygroundLog,
	PlaygroundOperationalCounts,
};
