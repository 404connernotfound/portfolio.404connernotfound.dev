import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
const runtimeEnv = process.env;
const isDev = runtimeEnv.NODE_ENV !== 'production';

type SiteSettings = {
	id: number;
	heroHeadline: string;
	heroSubheadline: string;
	heroNoteTitle: string;
	heroNoteBody: string;
	heroHighlightsTitle: string;
	heroHighlightsBody: string;
	aboutHeadline: string;
	aboutBody: string;
	focusHeadline: string;
	focusBody: string;
	stackTitle: string;
	stackIntro: string;
	workTitle: string;
	workIntro: string;
	blogTitle: string;
	blogIntro: string;
	contactTitle: string;
	contactBody: string;
	contactEmail: string;
	githubUrl: string;
	footerBadge: string;
	footerHeadline: string;
	footerBody: string;
	footerCtaLabel: string;
	footerCtaHref: string;
	maintenanceEnabled: number;
	maintenanceTitle: string;
	maintenanceBody: string;
	error403Title: string;
	error403Body: string;
	error404Title: string;
	error404Body: string;
	error500Title: string;
	error500Body: string;
};

type StackItem = {
	id: number;
	label: string;
	detail: string | null;
	category: string | null;
	sort: number;
};

type WorkItem = {
	id: number;
	title: string;
	description: string;
	longDescription: string | null;
	highlights: string | null;
	role: string | null;
	tech: string | null;
	link: string | null;
	imagePath: string | null;
	imageAlt: string | null;
	featured: number;
	sort: number;
};

type BlogPost = {
	id: number;
	title: string;
	slug: string;
	excerpt: string | null;
	content: string | null;
	tags: string | null;
	draft: number;
	featured: number;
	publishedAt: string | null;
	createdAt: string;
};

type Asset = {
	id: number;
	label: string;
	filename: string;
	path: string;
	mime: string;
	size: number;
	public: number;
	createdAt: string;
};

type Testimonial = {
	id: number;
	name: string;
	role: string | null;
	company: string | null;
	quote: string;
	project: string | null;
	result: string | null;
	email: string | null;
	approved: number;
	createdAt: string;
};

type TrackingEvent = {
	id: number;
	type: string;
	name: string | null;
	path: string | null;
	referrer: string | null;
	userAgent: string | null;
	ip: string | null;
	payload: string | null;
	createdAt: string;
};

type InboundMessageChannel = 'contact' | 'collaborate';

type FooterLink = {
	id: number;
	section: string;
	label: string;
	href: string | null;
	external: number;
	sort: number;
};

type Playset = {
	id: number;
	name: string;
	slug: string;
	runtime: string;
	description: string;
	dockerImage: string;
	startCommand: string | null;
	defaultCommand: string | null;
	enabled: number;
	maxSessions: number;
	idleTimeoutSeconds: number;
	createdAt: string;
	updatedAt: string;
};

type PlaygroundSession = {
	id: number;
	sessionId: string;
	playsetId: number;
	status: string;
	joinToken: string;
	containerId: string | null;
	reason: string | null;
	clientIp: string | null;
	userAgent: string | null;
	createdAt: string;
	updatedAt: string;
	endedAt: string | null;
};

type PlaygroundSocketConnection = {
	id: number;
	wsId: string;
	sessionId: string;
	connectedAt: string;
	disconnectedAt: string | null;
	closeCode: number | null;
	closeReason: string | null;
};

type PlaygroundLog = {
	id: number;
	sessionId: string;
	wsId: string | null;
	level: string;
	event: string;
	message: string;
	payload: string | null;
	createdAt: string;
};

type PlaygroundSessionListItem = PlaygroundSession & {
	playsetName: string;
	playsetSlug: string;
	playsetRuntime: string;
};

type PlaygroundOperationalCounts = {
	totalSessions: number;
	activeSessions: number;
	failedSessions: number;
	activeSocketConnections: number;
	totalLogs: number;
};

const DEFAULT_DB_PATH = 'data/portfolio.sqlite';
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
	contactTitle: 'Let’s connect.',
	contactBody: 'Want to collaborate or just say hello? Drop a note and I’ll get back to you.',
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
let db: Database.Database | null = null;
let dbInitialized = false;
const CACHE_TTL_MS = 10_000;

type CacheEntry<T> = {
	data: T;
	fetchedAt: number;
};

const cache = {
	siteSettings: null as CacheEntry<SiteSettings> | null,
	stackItems: null as CacheEntry<StackItem[]> | null,
	workItems: null as CacheEntry<WorkItem[]> | null,
	featuredWork: null as CacheEntry<WorkItem[]> | null,
	posts: null as CacheEntry<BlogPost[]> | null,
	assets: null as CacheEntry<Asset[]> | null,
	testimonials: null as CacheEntry<Testimonial[]> | null,
	footerLinks: null as CacheEntry<FooterLink[]> | null,
	playsets: null as CacheEntry<Playset[]> | null,
};

const getCached = <T>(entry: CacheEntry<T> | null) => {
	if (!entry) return null;
	if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
	return entry.data;
};

type CacheData<K extends keyof typeof cache> = (typeof cache)[K] extends CacheEntry<infer T> | null
	? T
	: never;

const setCache = <K extends keyof typeof cache>(key: K, data: CacheData<K>) => {
	cache[key] = { data, fetchedAt: Date.now() } as (typeof cache)[K];
};

const clearCache = (...keys: (keyof typeof cache)[]) => {
	for (const key of keys) {
		cache[key] = null;
	}
};

const ensureDbPath = (dbPath: string) => {
	const dir = path.dirname(dbPath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
};

const shouldAutoSeed = runtimeEnv.DB_AUTO_SEED ? runtimeEnv.DB_AUTO_SEED === 'true' : isDev;

const resolveDbPath = (dbPath: string) =>
	path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);

const createTables = (database: Database.Database) => {
	database.exec(`
		CREATE TABLE IF NOT EXISTS site_settings (
			id INTEGER PRIMARY KEY CHECK (id = 1),
			hero_headline TEXT NOT NULL,
			hero_subheadline TEXT NOT NULL,
			hero_note_title TEXT NOT NULL,
			hero_note_body TEXT NOT NULL,
			hero_highlights_title TEXT NOT NULL,
			hero_highlights_body TEXT NOT NULL,
			about_headline TEXT NOT NULL,
			about_body TEXT NOT NULL,
			focus_headline TEXT NOT NULL,
			focus_body TEXT NOT NULL,
			stack_title TEXT NOT NULL,
			stack_intro TEXT NOT NULL,
			work_title TEXT NOT NULL,
			work_intro TEXT NOT NULL,
			blog_title TEXT NOT NULL,
			blog_intro TEXT NOT NULL,
			contact_title TEXT NOT NULL,
			contact_body TEXT NOT NULL,
			contact_email TEXT NOT NULL,
			github_url TEXT NOT NULL,
			footer_badge TEXT NOT NULL,
			footer_headline TEXT NOT NULL,
			footer_body TEXT NOT NULL,
			footer_cta_label TEXT NOT NULL,
			footer_cta_href TEXT NOT NULL,
			maintenance_enabled INTEGER NOT NULL DEFAULT 0,
			maintenance_title TEXT NOT NULL,
			maintenance_body TEXT NOT NULL,
			error_403_title TEXT NOT NULL,
			error_403_body TEXT NOT NULL,
			error_404_title TEXT NOT NULL,
			error_404_body TEXT NOT NULL,
			error_500_title TEXT NOT NULL,
			error_500_body TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS stack_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			label TEXT NOT NULL,
			detail TEXT,
			category TEXT,
			sort INTEGER DEFAULT 0
		);

		CREATE TABLE IF NOT EXISTS work_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			description TEXT NOT NULL,
			long_description TEXT,
			highlights TEXT,
			role TEXT,
			tech TEXT,
			link TEXT,
			image_path TEXT,
			image_alt TEXT,
			featured INTEGER DEFAULT 0,
			sort INTEGER DEFAULT 0
		);

		CREATE TABLE IF NOT EXISTS posts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			slug TEXT NOT NULL UNIQUE,
			excerpt TEXT,
			content TEXT,
			tags TEXT,
			draft INTEGER DEFAULT 0,
			featured INTEGER DEFAULT 0,
			published_at TEXT,
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS assets (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			label TEXT NOT NULL,
			filename TEXT NOT NULL,
			path TEXT NOT NULL,
			mime TEXT NOT NULL,
			size INTEGER NOT NULL,
			public INTEGER DEFAULT 1,
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS testimonials (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			role TEXT,
			company TEXT,
			quote TEXT NOT NULL,
			project TEXT,
			result TEXT,
			email TEXT,
			approved INTEGER DEFAULT 0,
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS tracking_events (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			type TEXT NOT NULL,
			name TEXT,
			path TEXT,
			referrer TEXT,
			user_agent TEXT,
			ip TEXT,
			payload TEXT,
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS inbound_messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			channel TEXT NOT NULL,
			name TEXT NOT NULL,
			email TEXT NOT NULL,
			scope TEXT NOT NULL,
			ip TEXT,
			user_agent TEXT,
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT NOT NULL UNIQUE,
			name TEXT,
			interest TEXT,
			ip TEXT,
			user_agent TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS footer_links (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			section TEXT NOT NULL,
			label TEXT NOT NULL,
			href TEXT,
			external INTEGER DEFAULT 0,
			sort INTEGER DEFAULT 0
		);

		CREATE TABLE IF NOT EXISTS playsets (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			slug TEXT NOT NULL UNIQUE,
			runtime TEXT NOT NULL,
			description TEXT NOT NULL,
			docker_image TEXT NOT NULL,
			start_command TEXT,
			default_command TEXT,
			artifact_type TEXT NOT NULL DEFAULT 'generic',
			artifact_path TEXT NOT NULL DEFAULT '',
			extracted_path TEXT NOT NULL DEFAULT '',
			compose_path TEXT,
			verify_status TEXT NOT NULL DEFAULT 'pending',
			verify_log TEXT,
			last_verified_at TEXT,
			enabled INTEGER NOT NULL DEFAULT 1,
			max_sessions INTEGER NOT NULL DEFAULT 5,
			idle_timeout_seconds INTEGER NOT NULL DEFAULT 900,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS playground_sessions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			session_id TEXT NOT NULL UNIQUE,
			playset_id INTEGER NOT NULL,
			status TEXT NOT NULL,
			join_token TEXT NOT NULL,
			container_id TEXT,
			reason TEXT,
			client_ip TEXT,
			user_agent TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			ended_at TEXT,
			FOREIGN KEY (playset_id) REFERENCES playsets(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS playground_socket_connections (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			ws_id TEXT NOT NULL UNIQUE,
			session_id TEXT NOT NULL,
			connected_at TEXT NOT NULL,
			disconnected_at TEXT,
			close_code INTEGER,
			close_reason TEXT,
			FOREIGN KEY (session_id) REFERENCES playground_sessions(session_id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS playground_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			session_id TEXT NOT NULL,
			ws_id TEXT,
			level TEXT NOT NULL,
			event TEXT NOT NULL,
			message TEXT NOT NULL,
			payload TEXT,
			created_at TEXT NOT NULL,
			FOREIGN KEY (session_id) REFERENCES playground_sessions(session_id) ON DELETE CASCADE
		);

		CREATE INDEX IF NOT EXISTS idx_playground_sessions_status
			ON playground_sessions(status, created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_playground_sessions_playset
			ON playground_sessions(playset_id, created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_playground_socket_connections_session
			ON playground_socket_connections(session_id, connected_at DESC);
		CREATE INDEX IF NOT EXISTS idx_playground_logs_session
			ON playground_logs(session_id, created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_inbound_messages_channel_created
			ON inbound_messages(channel, created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_updated
			ON newsletter_subscriptions(updated_at DESC);
	`);
};

const ensureSiteSettingsColumns = (database: Database.Database) => {
	const columns = (
		database.prepare('PRAGMA table_info(site_settings)').all() as { name: string }[]
	).map((column) => column.name);

	const ensureColumn = (name: string, definition: string) => {
		if (!columns.includes(name)) {
			database.exec(`ALTER TABLE site_settings ADD COLUMN ${name} ${definition}`);
		}
	};

	ensureColumn('hero_highlights_title', 'TEXT NOT NULL DEFAULT ""');
	ensureColumn('hero_highlights_body', 'TEXT NOT NULL DEFAULT ""');
	ensureColumn('focus_headline', 'TEXT NOT NULL DEFAULT ""');
	ensureColumn('focus_body', 'TEXT NOT NULL DEFAULT ""');
	ensureColumn('maintenance_title', 'TEXT NOT NULL DEFAULT ""');
	ensureColumn('maintenance_body', 'TEXT NOT NULL DEFAULT ""');
	ensureColumn('footer_badge', 'TEXT NOT NULL DEFAULT ""');
	ensureColumn('footer_headline', 'TEXT NOT NULL DEFAULT ""');
	ensureColumn('footer_body', 'TEXT NOT NULL DEFAULT ""');
	ensureColumn('footer_cta_label', 'TEXT NOT NULL DEFAULT ""');
	ensureColumn('footer_cta_href', 'TEXT NOT NULL DEFAULT ""');
	ensureColumn('maintenance_enabled', 'INTEGER NOT NULL DEFAULT 0');
	ensureColumn('error_403_title', 'TEXT NOT NULL DEFAULT ""');
	ensureColumn('error_403_body', 'TEXT NOT NULL DEFAULT ""');
	ensureColumn('error_404_title', 'TEXT NOT NULL DEFAULT ""');
	ensureColumn('error_404_body', 'TEXT NOT NULL DEFAULT ""');
	ensureColumn('error_500_title', 'TEXT NOT NULL DEFAULT ""');
	ensureColumn('error_500_body', 'TEXT NOT NULL DEFAULT ""');
};

const ensureWorkItemsColumns = (database: Database.Database) => {
	const columns = (
		database.prepare('PRAGMA table_info(work_items)').all() as { name: string }[]
	).map((column) => column.name);

	const ensureColumn = (name: string, definition: string) => {
		if (!columns.includes(name)) {
			database.exec(`ALTER TABLE work_items ADD COLUMN ${name} ${definition}`);
		}
	};

	ensureColumn('long_description', 'TEXT');
	ensureColumn('highlights', 'TEXT');
	ensureColumn('image_path', 'TEXT');
	ensureColumn('image_alt', 'TEXT');
};

const ensurePostsColumns = (database: Database.Database) => {
	const columns = (database.prepare('PRAGMA table_info(posts)').all() as { name: string }[]).map(
		(column) => column.name,
	);

	if (!columns.includes('draft')) {
		database.exec('ALTER TABLE posts ADD COLUMN draft INTEGER NOT NULL DEFAULT 0');
	}
};

const ensureStackItemsColumns = (database: Database.Database) => {
	const columns = (
		database.prepare('PRAGMA table_info(stack_items)').all() as { name: string }[]
	).map((column) => column.name);

	if (!columns.includes('category')) {
		database.exec('ALTER TABLE stack_items ADD COLUMN category TEXT');
	}
};

const ensureTestimonialsTable = (database: Database.Database) => {
	database.exec(`
		CREATE TABLE IF NOT EXISTS testimonials (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			role TEXT,
			company TEXT,
			quote TEXT NOT NULL,
			project TEXT,
			result TEXT,
			email TEXT,
			approved INTEGER DEFAULT 0,
			created_at TEXT NOT NULL
		);
	`);
};

const ensureAssetsTable = (database: Database.Database) => {
	database.exec(`
		CREATE TABLE IF NOT EXISTS assets (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			label TEXT NOT NULL,
			filename TEXT NOT NULL,
			path TEXT NOT NULL,
			mime TEXT NOT NULL,
			size INTEGER NOT NULL,
			public INTEGER DEFAULT 1,
			created_at TEXT NOT NULL
		);
	`);
};

const ensureTrackingTable = (database: Database.Database) => {
	database.exec(`
		CREATE TABLE IF NOT EXISTS tracking_events (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			type TEXT NOT NULL,
			name TEXT,
			path TEXT,
			referrer TEXT,
			user_agent TEXT,
			ip TEXT,
			payload TEXT,
			created_at TEXT NOT NULL
		);
	`);
};

const ensureLeadCaptureTables = (database: Database.Database) => {
	database.exec(`
		CREATE TABLE IF NOT EXISTS inbound_messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			channel TEXT NOT NULL,
			name TEXT NOT NULL,
			email TEXT NOT NULL,
			scope TEXT NOT NULL,
			ip TEXT,
			user_agent TEXT,
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT NOT NULL UNIQUE,
			name TEXT,
			interest TEXT,
			ip TEXT,
			user_agent TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);

		CREATE INDEX IF NOT EXISTS idx_inbound_messages_channel_created
			ON inbound_messages(channel, created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_updated
			ON newsletter_subscriptions(updated_at DESC);
	`);
};

const ensurePlaygroundTables = (database: Database.Database) => {
	database.exec(`
		CREATE TABLE IF NOT EXISTS playsets (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			slug TEXT NOT NULL UNIQUE,
			runtime TEXT NOT NULL,
			description TEXT NOT NULL,
			docker_image TEXT NOT NULL,
			start_command TEXT,
			default_command TEXT,
			artifact_type TEXT NOT NULL DEFAULT 'generic',
			artifact_path TEXT NOT NULL DEFAULT '',
			extracted_path TEXT NOT NULL DEFAULT '',
			compose_path TEXT,
			verify_status TEXT NOT NULL DEFAULT 'pending',
			verify_log TEXT,
			last_verified_at TEXT,
			enabled INTEGER NOT NULL DEFAULT 1,
			max_sessions INTEGER NOT NULL DEFAULT 5,
			idle_timeout_seconds INTEGER NOT NULL DEFAULT 900,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS playground_sessions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			session_id TEXT NOT NULL UNIQUE,
			playset_id INTEGER NOT NULL,
			status TEXT NOT NULL,
			join_token TEXT NOT NULL,
			container_id TEXT,
			reason TEXT,
			client_ip TEXT,
			user_agent TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			ended_at TEXT,
			FOREIGN KEY (playset_id) REFERENCES playsets(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS playground_socket_connections (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			ws_id TEXT NOT NULL UNIQUE,
			session_id TEXT NOT NULL,
			connected_at TEXT NOT NULL,
			disconnected_at TEXT,
			close_code INTEGER,
			close_reason TEXT,
			FOREIGN KEY (session_id) REFERENCES playground_sessions(session_id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS playground_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			session_id TEXT NOT NULL,
			ws_id TEXT,
			level TEXT NOT NULL,
			event TEXT NOT NULL,
			message TEXT NOT NULL,
			payload TEXT,
			created_at TEXT NOT NULL,
			FOREIGN KEY (session_id) REFERENCES playground_sessions(session_id) ON DELETE CASCADE
		);

		CREATE INDEX IF NOT EXISTS idx_playground_sessions_status
			ON playground_sessions(status, created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_playground_sessions_playset
			ON playground_sessions(playset_id, created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_playground_socket_connections_session
			ON playground_socket_connections(session_id, connected_at DESC);
		CREATE INDEX IF NOT EXISTS idx_playground_logs_session
			ON playground_logs(session_id, created_at DESC);
	`);
};

const ensurePlaysetColumnsCompatibility = (database: Database.Database) => {
	const tables = database
		.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='playsets'")
		.all() as { name: string }[];
	if (tables.length === 0) return;

	const columns = (database.prepare('PRAGMA table_info(playsets)').all() as { name: string }[]).map(
		(column) => column.name,
	);

	const ensureColumn = (name: string, definition: string) => {
		if (!columns.includes(name)) {
			database.exec(`ALTER TABLE playsets ADD COLUMN ${name} ${definition}`);
		}
	};

	ensureColumn('runtime', "TEXT NOT NULL DEFAULT 'generic'");
	ensureColumn('docker_image', "TEXT NOT NULL DEFAULT 'alpine:latest'");
	ensureColumn('start_command', 'TEXT');
	ensureColumn('default_command', 'TEXT');
	ensureColumn('max_sessions', 'INTEGER NOT NULL DEFAULT 5');
	ensureColumn('idle_timeout_seconds', 'INTEGER NOT NULL DEFAULT 900');

	// Compatibility with older playset schema variants.
	ensureColumn('artifact_type', "TEXT NOT NULL DEFAULT 'generic'");
	ensureColumn('artifact_path', "TEXT NOT NULL DEFAULT ''");
	ensureColumn('extracted_path', "TEXT NOT NULL DEFAULT ''");
	ensureColumn('compose_path', 'TEXT');
	ensureColumn('verify_status', "TEXT NOT NULL DEFAULT 'pending'");
	ensureColumn('verify_log', 'TEXT');
	ensureColumn('last_verified_at', 'TEXT');

	database
		.prepare(
			`
			UPDATE playsets
			SET
				runtime = CASE
					WHEN runtime IS NULL OR runtime = '' THEN COALESCE(NULLIF(artifact_type, ''), 'generic')
					ELSE runtime
				END,
				docker_image = CASE
					WHEN docker_image IS NULL OR docker_image = '' THEN COALESCE(NULLIF(artifact_path, ''), 'alpine:latest')
					ELSE docker_image
				END,
				description = COALESCE(description, ''),
				max_sessions = CASE
					WHEN max_sessions IS NULL OR max_sessions < 1 THEN 5
					ELSE max_sessions
				END,
				idle_timeout_seconds = CASE
					WHEN idle_timeout_seconds IS NULL OR idle_timeout_seconds < 30 THEN 900
					ELSE idle_timeout_seconds
				END,
				artifact_type = CASE
					WHEN artifact_type IS NULL OR artifact_type = '' THEN runtime
					ELSE artifact_type
				END,
				artifact_path = CASE
					WHEN artifact_path IS NULL OR artifact_path = '' THEN docker_image
					ELSE artifact_path
				END,
				extracted_path = COALESCE(extracted_path, ''),
				verify_status = CASE
					WHEN verify_status IS NULL OR verify_status = '' THEN 'pending'
					ELSE verify_status
				END
		`,
		)
		.run();
};

const seedDefaults = (database: Database.Database) => {
	const existing = database.prepare('SELECT COUNT(*) as count FROM site_settings').get() as {
		count: number;
	};

	if (existing.count > 0) {
		return;
	}

	const now = new Date().toISOString();
	database
		.prepare(
			`
			INSERT INTO site_settings (
				id,
				hero_headline,
				hero_subheadline,
				hero_note_title,
				hero_note_body,
				hero_highlights_title,
				hero_highlights_body,
				about_headline,
				about_body,
				focus_headline,
				focus_body,
				stack_title,
				stack_intro,
				work_title,
				work_intro,
				blog_title,
				blog_intro,
				contact_title,
				contact_body,
				contact_email,
				github_url,
				footer_badge,
				footer_headline,
				footer_body,
				footer_cta_label,
				footer_cta_href,
				maintenance_enabled,
				maintenance_title,
				maintenance_body,
				error_403_title,
				error_403_body,
				error_404_title,
				error_404_body,
				error_500_title,
				error_500_body,
				updated_at
			) VALUES (
				1, @heroHeadline, @heroSubheadline, @heroNoteTitle, @heroNoteBody, @heroHighlightsTitle, @heroHighlightsBody,
				@aboutHeadline, @aboutBody, @focusHeadline, @focusBody, @stackTitle, @stackIntro, @workTitle, @workIntro, @blogTitle, @blogIntro, @contactTitle, @contactBody,
				@contactEmail, @githubUrl, @footerBadge, @footerHeadline, @footerBody, @footerCtaLabel, @footerCtaHref,
				@maintenanceEnabled, @maintenanceTitle, @maintenanceBody, @error403Title, @error403Body, @error404Title, @error404Body, @error500Title, @error500Body,
				@updatedAt
			)
		`,
		)
		.run({
			...DEFAULT_SITE_SETTINGS,
			updatedAt: now,
		});
};

const seedFooterLinks = (database: Database.Database) => {
	const existing = database.prepare('SELECT COUNT(*) as count FROM footer_links').get() as {
		count: number;
	};

	if (existing.count > 0) {
		return;
	}

	const insert = database.prepare(
		'INSERT INTO footer_links (section, label, href, external, sort) VALUES (?, ?, ?, ?, ?)',
	);

	for (const row of DEFAULT_FOOTER_LINKS) {
		insert.run(row.section, row.label, row.href, row.external, row.sort);
	}
};

const seedStackItems = (database: Database.Database) => {
	const existing = database.prepare('SELECT COUNT(*) as count FROM stack_items').get() as {
		count: number;
	};

	if (existing.count > 0) {
		return;
	}

	const insert = database.prepare(
		'INSERT INTO stack_items (label, detail, category, sort) VALUES (?, ?, ?, ?)',
	);

	for (const row of DEFAULT_STACK_ITEMS) {
		insert.run(row.label, row.detail, row.category, row.sort);
	}
};

const seedWorkItems = (database: Database.Database) => {
	const existing = database.prepare('SELECT COUNT(*) as count FROM work_items').get() as {
		count: number;
	};

	if (existing.count > 0) {
		return;
	}

	const insert = database.prepare(
		`INSERT INTO work_items (
			title, description, long_description, highlights, role, tech, link,
			image_path, image_alt, featured, sort
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	);

	for (const row of DEFAULT_WORK_ITEMS) {
		insert.run(
			row.title,
			row.description,
			row.longDescription,
			row.highlights,
			row.role,
			row.tech,
			row.link,
			row.imagePath,
			row.imageAlt,
			row.featured,
			row.sort,
		);
	}
};

const seedPlaysets = (database: Database.Database) => {
	ensurePlaysetColumnsCompatibility(database);

	const existing = database.prepare('SELECT COUNT(*) as count FROM playsets').get() as {
		count: number;
	};

	if (existing.count > 0) {
		return;
	}

	const now = new Date().toISOString();
	const rows = [
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

	const insert = database.prepare(
		`INSERT INTO playsets (
			name, slug, runtime, description, docker_image, start_command, default_command,
			artifact_type, artifact_path, extracted_path, compose_path, verify_status, verify_log, last_verified_at,
			enabled, max_sessions, idle_timeout_seconds, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	);

	for (const row of rows) {
		insert.run(
			row.name,
			row.slug,
			row.runtime,
			row.description,
			row.dockerImage,
			row.startCommand,
			row.defaultCommand,
			row.runtime,
			row.dockerImage,
			'',
			null,
			'pending',
			null,
			null,
			row.enabled,
			row.maxSessions,
			row.idleTimeoutSeconds,
			now,
			now,
		);
	}
};

const ensurePortfolioPositioning = (database: Database.Database) => {
	database
		.prepare(
			`
			UPDATE site_settings
			SET
				hero_headline = CASE
					WHEN hero_headline IN ('404ConnerNotFound - Building immersive applications across web, desktop, embedding, and networks.', '') THEN @heroHeadline
					ELSE hero_headline
				END,
				hero_subheadline = CASE
					WHEN hero_subheadline IN ('Proficiency over promises.', '') THEN @heroSubheadline
					ELSE hero_subheadline
				END,
				hero_note_title = CASE
					WHEN hero_note_title IN ('In the lab', '') THEN @heroNoteTitle
					ELSE hero_note_title
				END,
				hero_note_body = CASE
					WHEN hero_note_body IN ('Payload CMS, media pipelines, and richer case studies.', '') THEN @heroNoteBody
					ELSE hero_note_body
				END,
				hero_highlights_title = CASE
					WHEN hero_highlights_title IN ('Highlights', '') THEN @heroHighlightsTitle
					ELSE hero_highlights_title
				END,
				hero_highlights_body = CASE
					WHEN hero_highlights_body IN ('Latest focus, experiments, and releases.', '') THEN @heroHighlightsBody
					ELSE hero_highlights_body
				END,
				about_headline = CASE
					WHEN about_headline IN ('I build shit to prove others wrong.', '') THEN @aboutHeadline
					ELSE about_headline
				END,
				about_body = CASE
					WHEN about_body IN ('This site is my live workspace. I iterate, interoperate, and dedicate for the sake of advancements.', '') THEN @aboutBody
					ELSE about_body
				END,
				focus_headline = CASE
					WHEN focus_headline IN ('I build, I break, I fix', '') THEN @focusHeadline
					ELSE focus_headline
				END,
				focus_body = CASE
					WHEN focus_body IN ('Like I came, I saw, I conquered but I made, I tried, and I failed... then I succeeded.', '') THEN @focusBody
					ELSE focus_body
				END,
				stack_title = CASE
					WHEN stack_title IN ('My stack', '') THEN @stackTitle
					ELSE stack_title
				END,
				stack_intro = CASE
					WHEN stack_intro IN ('The tools I reach for when shipping immersive, reliable work.', '') THEN @stackIntro
					ELSE stack_intro
				END,
				work_title = CASE
					WHEN work_title IN ('My work', '') THEN @workTitle
					ELSE work_title
				END,
				work_intro = CASE
					WHEN work_intro IN ('Selected projects, prototypes, and experiments.', '') THEN @workIntro
					ELSE work_intro
				END,
				footer_badge = CASE
					WHEN footer_badge IN ('404connernotfound', '') THEN @footerBadge
					ELSE footer_badge
				END,
				footer_headline = CASE
					WHEN footer_headline IN ('Building loud, expressive web experiences.', '') THEN @footerHeadline
					ELSE footer_headline
				END,
				footer_body = CASE
					WHEN footer_body IN ('Personal portfolio, experiments, and shipping logs. Content updates as the archive grows.', '') THEN @footerBody
					ELSE footer_body
				END
			WHERE id = 1
		`,
		)
		.run(DEFAULT_SITE_SETTINGS);
};

const prunePlaceholderFooterLinks = (database: Database.Database) => {
	database
		.prepare(
			`DELETE FROM footer_links
			 WHERE href IS NULL
				OR href = ''
				OR (label = 'YouTube' AND href = '#')
				OR (label = 'Blog' AND href = '/blog')
				OR (section = 'Links' AND label IN ('About', 'Work') AND href IN ('/about', '/work'))`,
		)
		.run();
};

const ensureFooterLinks = (database: Database.Database) => {
	const existing = database.prepare('SELECT section, label FROM footer_links').all() as {
		section: string;
		label: string;
	}[];
	const known = new Set(existing.map((row) => `${row.section}:${row.label}`));
	const insert = database.prepare(
		'INSERT INTO footer_links (section, label, href, external, sort) VALUES (?, ?, ?, ?, ?)',
	);
	const update = database.prepare(
		'UPDATE footer_links SET href = ?, external = ?, sort = ? WHERE section = ? AND label = ?',
	);

	for (const row of DEFAULT_FOOTER_LINKS) {
		if (known.has(`${row.section}:${row.label}`)) {
			update.run(row.href, row.external, row.sort, row.section, row.label);
			continue;
		}
		insert.run(row.section, row.label, row.href, row.external, row.sort);
	}
};

const ensurePortfolioContent = (database: Database.Database) => {
	ensurePortfolioPositioning(database);
	prunePlaceholderFooterLinks(database);
	ensureFooterLinks(database);
	seedStackItems(database);
	seedWorkItems(database);
};

const ensureDefaultsForExistingRow = (database: Database.Database) => {
	database
		.prepare(
			`
			UPDATE site_settings
			SET
				hero_highlights_title = CASE
					WHEN hero_highlights_title = '' THEN 'Highlights'
					ELSE hero_highlights_title
				END,
				hero_highlights_body = CASE
					WHEN hero_highlights_body = '' THEN 'Latest focus, experiments, and releases.'
					ELSE hero_highlights_body
				END,
				focus_headline = CASE
					WHEN focus_headline = '' THEN 'I build, I break, I fix'
					ELSE focus_headline
				END,
				focus_body = CASE
					WHEN focus_body = '' THEN 'Like I came, I saw, I conquered but I made, I tried, and I failed... then I succeeded.'
					ELSE focus_body
				END,
				maintenance_title = CASE
					WHEN maintenance_title = '' THEN 'Maintenance in progress'
					ELSE maintenance_title
				END,
				maintenance_body = CASE
					WHEN maintenance_body = '' THEN 'We are tuning things up. Please check back soon.'
					ELSE maintenance_body
				END,
				footer_badge = CASE
					WHEN footer_badge = '' THEN '404connernotfound'
					ELSE footer_badge
				END,
				footer_headline = CASE
					WHEN footer_headline = '' THEN 'Building loud, expressive web experiences.'
					ELSE footer_headline
				END,
				footer_body = CASE
					WHEN footer_body = '' THEN 'Personal portfolio, experiments, and shipping logs. Content updates as the archive grows.'
					ELSE footer_body
				END,
				footer_cta_label = CASE
					WHEN footer_cta_label = '' THEN 'Say hello'
					ELSE footer_cta_label
				END,
				footer_cta_href = CASE
					WHEN footer_cta_href = '' THEN '/contact'
					ELSE footer_cta_href
				END,
				maintenance_enabled = CASE
					WHEN maintenance_enabled IS NULL THEN 0
					ELSE maintenance_enabled
				END,
				error_403_title = CASE
					WHEN error_403_title = '' THEN 'Access denied'
					ELSE error_403_title
				END,
				error_403_body = CASE
					WHEN error_403_body = '' THEN 'You do not have permission to view this page.'
					ELSE error_403_body
				END,
				error_404_title = CASE
					WHEN error_404_title = '' THEN 'Page not found'
					ELSE error_404_title
				END,
				error_404_body = CASE
					WHEN error_404_body = '' THEN 'We could not find the page you were looking for.'
					ELSE error_404_body
				END,
				error_500_title = CASE
					WHEN error_500_title = '' THEN 'Something went wrong'
					ELSE error_500_title
				END,
				error_500_body = CASE
					WHEN error_500_body = '' THEN 'An unexpected error occurred. Please try again shortly.'
					ELSE error_500_body
				END
			WHERE id = 1
		`,
		)
		.run();
};

type Migration = {
	id: number;
	name: string;
	up: (database: Database.Database) => void;
};

const runMigrations = (database: Database.Database) => {
	database.exec(`
		CREATE TABLE IF NOT EXISTS migrations (
			id INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			applied_at TEXT NOT NULL
		);
	`);

	const applied = database.prepare('SELECT id, name FROM migrations ORDER BY id ASC').all() as {
		id: number;
		name: string;
	}[];
	const appliedIds = new Set(applied.map((row) => row.id));
	const appliedNames = new Set(applied.map((row) => row.name));
	let nextId = applied.reduce((max, row) => Math.max(max, row.id), 0) + 1;

	const migrations: Migration[] = [
		{ id: 1, name: 'init', up: createTables },
		{ id: 2, name: 'site_settings_columns', up: ensureSiteSettingsColumns },
		{ id: 3, name: 'site_settings_defaults', up: ensureDefaultsForExistingRow },
		{ id: 4, name: 'posts_draft_column', up: ensurePostsColumns },
		{ id: 5, name: 'work_items_long_description', up: ensureWorkItemsColumns },
		{ id: 6, name: 'site_settings_error_columns', up: ensureSiteSettingsColumns },
		{ id: 7, name: 'site_settings_error_defaults', up: ensureDefaultsForExistingRow },
		{ id: 8, name: 'testimonials_table', up: ensureTestimonialsTable },
		{ id: 9, name: 'assets_table', up: ensureAssetsTable },
		{ id: 10, name: 'tracking_table', up: ensureTrackingTable },
		{ id: 11, name: 'site_settings_footer_columns', up: ensureSiteSettingsColumns },
		{ id: 12, name: 'site_settings_footer_defaults', up: ensureDefaultsForExistingRow },
		{ id: 13, name: 'site_settings_maintenance_columns', up: ensureSiteSettingsColumns },
		{ id: 14, name: 'site_settings_maintenance_defaults', up: ensureDefaultsForExistingRow },
		{ id: 15, name: 'stack_items_category_column', up: ensureStackItemsColumns },
		{ id: 16, name: 'playground_tables', up: ensurePlaygroundTables },
		{ id: 17, name: 'playground_seed_playsets', up: seedPlaysets },
		{ id: 18, name: 'playset_columns_compat', up: ensurePlaysetColumnsCompatibility },
		{ id: 19, name: 'work_items_media_columns', up: ensureWorkItemsColumns },
		{ id: 20, name: 'lead_capture_tables', up: ensureLeadCaptureTables },
		{ id: 21, name: 'portfolio_content_defaults', up: ensurePortfolioContent },
	];

	for (const migration of migrations) {
		if (appliedNames.has(migration.name)) continue;

		migration.up(database);
		const recordId = appliedIds.has(migration.id) ? nextId++ : migration.id;

		database
			.prepare('INSERT INTO migrations (id, name, applied_at) VALUES (?, ?, ?)')
			.run(recordId, migration.name, new Date().toISOString());
		appliedIds.add(recordId);
		appliedNames.add(migration.name);
	}
};

const openDb = () => {
	if (db) return db;

	const dbPath = runtimeEnv.DB_PATH ?? DEFAULT_DB_PATH;
	const resolved = resolveDbPath(dbPath);
	ensureDbPath(resolved);

	db = new Database(resolved);
	db.pragma('journal_mode = WAL');
	return db;
};

const bootstrapDb = (database: Database.Database) => {
	runMigrations(database);
	seedDefaults(database);
	seedFooterLinks(database);
	ensurePortfolioContent(database);
	seedPlaysets(database);
};

const assertSchemaReady = (database: Database.Database) => {
	const row = database
		.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'site_settings'")
		.get() as { name: string } | undefined;
	if (!row) {
		throw new Error('Database is not initialized. Run `npm run db:seed` or set DB_AUTO_SEED=true.');
	}
};

export const getDb = () => {
	const database = openDb();
	if (!dbInitialized) {
		if (!shouldAutoSeed) {
			assertSchemaReady(database);
		}

		runMigrations(database);
		if (shouldAutoSeed) {
			seedDefaults(database);
			seedFooterLinks(database);
			ensurePortfolioContent(database);
			seedPlaysets(database);
		}

		dbInitialized = true;
	}
	return database;
};

export const seedDatabase = () => {
	const database = openDb();
	bootstrapDb(database);
	dbInitialized = true;
	clearCache(
		'siteSettings',
		'stackItems',
		'workItems',
		'featuredWork',
		'posts',
		'assets',
		'testimonials',
		'footerLinks',
		'playsets',
	);
};

export const getSiteSettings = () => {
	const cached = getCached(cache.siteSettings);
	if (cached) return cached;
	const database = getDb();
	const row = database
		.prepare(
			`
			SELECT
				id,
				hero_headline as heroHeadline,
				hero_subheadline as heroSubheadline,
				hero_note_title as heroNoteTitle,
				hero_note_body as heroNoteBody,
				hero_highlights_title as heroHighlightsTitle,
				hero_highlights_body as heroHighlightsBody,
				about_headline as aboutHeadline,
				about_body as aboutBody,
				focus_headline as focusHeadline,
				focus_body as focusBody,
				stack_title as stackTitle,
				stack_intro as stackIntro,
				work_title as workTitle,
				work_intro as workIntro,
				blog_title as blogTitle,
				blog_intro as blogIntro,
				contact_title as contactTitle,
				contact_body as contactBody,
				contact_email as contactEmail,
				github_url as githubUrl,
				footer_badge as footerBadge,
				footer_headline as footerHeadline,
				footer_body as footerBody,
				footer_cta_label as footerCtaLabel,
				footer_cta_href as footerCtaHref,
				maintenance_enabled as maintenanceEnabled,
				maintenance_title as maintenanceTitle,
				maintenance_body as maintenanceBody,
				error_403_title as error403Title,
				error_403_body as error403Body,
				error_404_title as error404Title,
				error_404_body as error404Body,
				error_500_title as error500Title,
				error_500_body as error500Body
			FROM site_settings
			WHERE id = 1
		`,
		)
		.get() as SiteSettings;

	setCache('siteSettings', row);
	return row;
};

export const updateSiteSettings = (payload: Omit<SiteSettings, 'id'>) => {
	const database = getDb();
	const now = new Date().toISOString();

	database
		.prepare(
			`
			UPDATE site_settings
			SET
				hero_headline = @heroHeadline,
				hero_subheadline = @heroSubheadline,
				hero_note_title = @heroNoteTitle,
				hero_note_body = @heroNoteBody,
				hero_highlights_title = @heroHighlightsTitle,
				hero_highlights_body = @heroHighlightsBody,
				about_headline = @aboutHeadline,
				about_body = @aboutBody,
				focus_headline = @focusHeadline,
				focus_body = @focusBody,
				stack_title = @stackTitle,
				stack_intro = @stackIntro,
				work_title = @workTitle,
				work_intro = @workIntro,
				blog_title = @blogTitle,
				blog_intro = @blogIntro,
				contact_title = @contactTitle,
				contact_body = @contactBody,
				contact_email = @contactEmail,
				github_url = @githubUrl,
				footer_badge = @footerBadge,
				footer_headline = @footerHeadline,
				footer_body = @footerBody,
				footer_cta_label = @footerCtaLabel,
				footer_cta_href = @footerCtaHref,
				maintenance_enabled = @maintenanceEnabled,
				maintenance_title = @maintenanceTitle,
				maintenance_body = @maintenanceBody,
				error_403_title = @error403Title,
				error_403_body = @error403Body,
				error_404_title = @error404Title,
				error_404_body = @error404Body,
				error_500_title = @error500Title,
				error_500_body = @error500Body,
				updated_at = @updatedAt
			WHERE id = 1
		`,
		)
		.run({ ...payload, updatedAt: now });

	clearCache('siteSettings');
};

export const getStackItems = () => {
	const cached = getCached(cache.stackItems);
	if (cached) return cached;
	const database = getDb();
	const rows = database
		.prepare('SELECT id, label, detail, category, sort FROM stack_items ORDER BY sort ASC, id DESC')
		.all() as StackItem[];

	setCache('stackItems', rows);
	return rows;
};

export const createStackItem = (
	label: string,
	detail: string | null,
	category: string | null,
	sort: number,
) => {
	const database = getDb();
	database
		.prepare('INSERT INTO stack_items (label, detail, category, sort) VALUES (?, ?, ?, ?)')
		.run(label, detail, category, sort);

	clearCache('stackItems');
};

export const updateStackItem = (
	id: number,
	label: string,
	detail: string | null,
	category: string | null,
	sort: number,
) => {
	const database = getDb();
	database
		.prepare('UPDATE stack_items SET label = ?, detail = ?, category = ?, sort = ? WHERE id = ?')
		.run(label, detail, category, sort, id);

	clearCache('stackItems');
};

export const reorderStackItems = (orderedIds: number[]) => {
	const database = getDb();
	const currentIds = database
		.prepare('SELECT id FROM stack_items ORDER BY sort ASC, id DESC')
		.all() as { id: number }[];

	if (currentIds.length === 0) {
		return;
	}

	const known = new Set(currentIds.map((row) => row.id));
	const deduped = Array.from(new Set(orderedIds.filter((id) => known.has(id))));
	const missing = currentIds.map((row) => row.id).filter((id) => !deduped.includes(id));
	const finalOrder = [...deduped, ...missing];

	const update = database.prepare('UPDATE stack_items SET sort = ? WHERE id = ?');
	const tx = database.transaction((ids: number[]) => {
		for (let index = 0; index < ids.length; index += 1) {
			update.run((index + 1) * 10, ids[index]);
		}
	});

	tx(finalOrder);
	clearCache('stackItems');
};

export const deleteStackItem = (id: number) => {
	const database = getDb();
	database.prepare('DELETE FROM stack_items WHERE id = ?').run(id);

	clearCache('stackItems');
};

export const getWorkItems = () => {
	const cached = getCached(cache.workItems);
	if (cached) return cached;
	const database = getDb();
	const rows = database
		.prepare(
			`SELECT id, title, description, long_description as longDescription, highlights, role, tech, link,
			 image_path as imagePath, image_alt as imageAlt, featured, sort
			 FROM work_items
			 ORDER BY sort ASC, id DESC`,
		)
		.all() as WorkItem[];

	setCache('workItems', rows);
	return rows;
};

export const getFeaturedWork = () => {
	const cached = getCached(cache.featuredWork);
	if (cached) return cached;
	const workItems = getCached(cache.workItems);
	const rows = workItems
		? workItems.filter((item) => item.featured === 1)
		: (getDb()
				.prepare(
					`SELECT id, title, description, long_description as longDescription, highlights, role, tech, link,
						 image_path as imagePath, image_alt as imageAlt, featured, sort
						 FROM work_items
						 WHERE featured = 1
						 ORDER BY sort ASC, id DESC`,
				)
				.all() as WorkItem[]);

	setCache('featuredWork', rows);
	return rows;
};

export const createWorkItem = (
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
	const database = getDb();
	database
		.prepare(
			`INSERT INTO work_items (
				title, description, long_description, highlights, role, tech, link, image_path, image_alt, featured, sort
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.run(
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
		);

	clearCache('workItems', 'featuredWork');
};

export const updateWorkItem = (
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
	const database = getDb();
	database
		.prepare(
			`UPDATE work_items
			 SET title = ?, description = ?, long_description = ?, highlights = ?, role = ?, tech = ?, link = ?,
				 image_path = ?, image_alt = ?, featured = ?, sort = ?
			 WHERE id = ?`,
		)
		.run(
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
		);

	clearCache('workItems', 'featuredWork');
};

export const deleteWorkItem = (id: number) => {
	const database = getDb();
	database.prepare('DELETE FROM work_items WHERE id = ?').run(id);

	clearCache('workItems', 'featuredWork');
};

export const getPosts = () => {
	const cached = getCached(cache.posts);
	if (cached) return cached;
	const database = getDb();
	const rows = database
		.prepare(
			`SELECT id, title, slug, excerpt, content, tags, draft, featured, published_at as publishedAt, created_at as createdAt
			 FROM posts
			 ORDER BY published_at DESC, created_at DESC`,
		)
		.all() as BlogPost[];

	setCache('posts', rows);
	return rows;
};

export const getPublishedPosts = () => {
	const cached = getCached(cache.posts);
	if (cached) {
		return cached.filter((post) => post.draft === 0);
	}
	const database = getDb();
	return database
		.prepare(
			`SELECT id, title, slug, excerpt, content, tags, draft, featured, published_at as publishedAt, created_at as createdAt
			 FROM posts
			 WHERE draft = 0
			 ORDER BY published_at DESC, created_at DESC`,
		)
		.all() as BlogPost[];
};

export const getPostBySlug = (slug: string) => {
	const cached = getCached(cache.posts);
	if (cached) {
		return cached.find((post) => post.slug === slug);
	}
	const database = getDb();
	const row = database
		.prepare(
			`SELECT id, title, slug, excerpt, content, tags, draft, featured, published_at as publishedAt, created_at as createdAt
			 FROM posts
			 WHERE slug = ?`,
		)
		.get(slug) as BlogPost | undefined;

	return row;
};

export const getPublishedPostBySlug = (slug: string) => {
	const cached = getCached(cache.posts);
	if (cached) {
		return cached.find((post) => post.slug === slug && post.draft === 0);
	}
	const database = getDb();
	const row = database
		.prepare(
			`SELECT id, title, slug, excerpt, content, tags, draft, featured, published_at as publishedAt, created_at as createdAt
			 FROM posts
			 WHERE slug = ? AND draft = 0`,
		)
		.get(slug) as BlogPost | undefined;

	return row;
};

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)+/g, '');

const ensureUniqueSlug = (database: Database.Database, slug: string, currentId?: number) => {
	let candidate = slug || 'post';
	let suffix = 1;
	for (;;) {
		const existing = database.prepare('SELECT id FROM posts WHERE slug = ?').get(candidate) as
			| { id: number }
			| undefined;

		if (!existing || (currentId && existing.id === currentId)) {
			return candidate;
		}

		candidate = `${slug}-${suffix}`;
		suffix += 1;
	}
};

export const createPost = (
	title: string,
	excerpt: string | null,
	content: string | null,
	tags: string | null,
	draft: number,
	featured: number,
	publishedAt: string | null,
	slug?: string,
) => {
	const database = getDb();
	const baseSlug = slug && slug.length > 0 ? slug : slugify(title);
	const finalSlug = ensureUniqueSlug(database, baseSlug);
	const now = new Date().toISOString();

	database
		.prepare(
			`INSERT INTO posts (title, slug, excerpt, content, tags, draft, featured, published_at, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.run(title, finalSlug, excerpt, content, tags, draft, featured, publishedAt, now);

	clearCache('posts');
};

export const updatePost = (
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
	const database = getDb();
	const baseSlug = slug && slug.length > 0 ? slug : slugify(title);
	const finalSlug = ensureUniqueSlug(database, baseSlug, id);

	database
		.prepare(
			`UPDATE posts
			 SET title = ?, slug = ?, excerpt = ?, content = ?, tags = ?, draft = ?, featured = ?, published_at = ?
			 WHERE id = ?`,
		)
		.run(title, finalSlug, excerpt, content, tags, draft, featured, publishedAt, id);

	clearCache('posts');
};

export const deletePost = (id: number) => {
	const database = getDb();
	database.prepare('DELETE FROM posts WHERE id = ?').run(id);

	clearCache('posts');
};

export const getAssets = () => {
	const cached = getCached(cache.assets);
	if (cached) return cached;
	const database = getDb();
	const rows = database
		.prepare(
			`SELECT id, label, filename, path, mime, size, public, created_at as createdAt
			 FROM assets
			 ORDER BY created_at DESC, id DESC`,
		)
		.all() as Asset[];

	setCache('assets', rows);
	return rows;
};

export const getPublicAssets = () => getAssets().filter((asset) => asset.public === 1);

export const createAsset = (
	label: string,
	filename: string,
	pathValue: string,
	mime: string,
	size: number,
	isPublic: number,
) => {
	const database = getDb();
	const now = new Date().toISOString();
	database
		.prepare(
			`INSERT INTO assets (label, filename, path, mime, size, public, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
		.run(label, filename, pathValue, mime, size, isPublic, now);

	clearCache('assets');
};

export const updateAsset = (id: number, label: string, isPublic: number) => {
	const database = getDb();
	database
		.prepare(
			`UPDATE assets
			 SET label = ?, public = ?
			 WHERE id = ?`,
		)
		.run(label, isPublic, id);

	clearCache('assets');
};

export const deleteAsset = (id: number) => {
	const database = getDb();
	database.prepare('DELETE FROM assets WHERE id = ?').run(id);

	clearCache('assets');
};

const clampString = (value: string, max: number) =>
	value.length > max ? value.slice(0, max) : value;

export const createInboundMessage = (
	channel: InboundMessageChannel,
	name: string,
	email: string,
	scope: string,
	ip: string | null,
	userAgent: string | null,
) => {
	const database = getDb();
	const now = new Date().toISOString();
	const safeChannel: InboundMessageChannel = channel === 'collaborate' ? 'collaborate' : 'contact';
	database
		.prepare(
			`INSERT INTO inbound_messages (channel, name, email, scope, ip, user_agent, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
		.run(
			safeChannel,
			clampString(name.trim(), 160),
			clampString(email.trim().toLowerCase(), 320),
			clampString(scope.trim(), 10_000),
			ip ? clampString(ip, 80) : null,
			userAgent ? clampString(userAgent, 512) : null,
			now,
		);
};

export const upsertNewsletterSubscription = (
	name: string | null,
	email: string,
	interest: string | null,
	ip: string | null,
	userAgent: string | null,
) => {
	const database = getDb();
	const now = new Date().toISOString();
	const normalizedEmail = clampString(email.trim().toLowerCase(), 320);
	const normalizedName = name ? clampString(name.trim(), 160) : null;
	const normalizedInterest = interest ? clampString(interest.trim(), 160) : null;
	database
		.prepare(
			`INSERT INTO newsletter_subscriptions (email, name, interest, ip, user_agent, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT(email) DO UPDATE SET
			 	name = excluded.name,
			 	interest = excluded.interest,
			 	ip = excluded.ip,
			 	user_agent = excluded.user_agent,
			 	updated_at = excluded.updated_at`,
		)
		.run(
			normalizedEmail,
			normalizedName,
			normalizedInterest,
			ip ? clampString(ip, 80) : null,
			userAgent ? clampString(userAgent, 512) : null,
			now,
			now,
		);
};

export const createTrackingEvent = (
	type: string,
	name: string | null,
	pathValue: string | null,
	referrer: string | null,
	userAgent: string | null,
	ip: string | null,
	payload: string | null,
) => {
	const database = getDb();
	const now = new Date().toISOString();
	database
		.prepare(
			`INSERT INTO tracking_events (type, name, path, referrer, user_agent, ip, payload, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.run(type, name, pathValue, referrer, userAgent, ip, payload, now);
};

export const getTrackingEvents = (limit = 100) => {
	const database = getDb();
	return database
		.prepare(
			`SELECT id, type, name, path, referrer, user_agent as userAgent, ip, payload, created_at as createdAt
			 FROM tracking_events
			 ORDER BY created_at DESC, id DESC
			 LIMIT ?`,
		)
		.all(limit) as TrackingEvent[];
};

export const getTrackingCounts = () => {
	const database = getDb();
	const total = database.prepare('SELECT COUNT(*) as count FROM tracking_events').get() as {
		count: number;
	};
	const lastDay = database
		.prepare(
			`SELECT COUNT(*) as count
			 FROM tracking_events
			 WHERE created_at >= datetime('now', '-1 day')`,
		)
		.get() as { count: number };
	const lastWeek = database
		.prepare(
			`SELECT COUNT(*) as count
			 FROM tracking_events
			 WHERE created_at >= datetime('now', '-7 day')`,
		)
		.get() as { count: number };
	const byType = database
		.prepare(
			`SELECT type, COUNT(*) as count
			 FROM tracking_events
			 GROUP BY type
			 ORDER BY count DESC`,
		)
		.all() as { type: string; count: number }[];
	const topPaths = database
		.prepare(
			`SELECT path, COUNT(*) as count
			 FROM tracking_events
			 WHERE path IS NOT NULL AND path != ''
			 GROUP BY path
			 ORDER BY count DESC
			 LIMIT 8`,
		)
		.all() as { path: string; count: number }[];

	return {
		total: total.count,
		lastDay: lastDay.count,
		lastWeek: lastWeek.count,
		byType,
		topPaths,
	};
};

export const getTestimonials = () => {
	const cached = getCached(cache.testimonials);
	if (cached) return cached;
	const database = getDb();
	const rows = database
		.prepare(
			`SELECT id, name, role, company, quote, project, result, email, approved, created_at as createdAt
			 FROM testimonials
			 ORDER BY created_at DESC, id DESC`,
		)
		.all() as Testimonial[];

	setCache('testimonials', rows);
	return rows;
};

export const getApprovedTestimonials = () => {
	return getTestimonials().filter((testimonial) => testimonial.approved === 1);
};

export const createTestimonial = (
	name: string,
	role: string | null,
	company: string | null,
	quote: string,
	project: string | null,
	result: string | null,
	email: string | null,
) => {
	const database = getDb();
	const now = new Date().toISOString();
	database
		.prepare(
			`INSERT INTO testimonials (name, role, company, quote, project, result, email, approved, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
		)
		.run(name, role, company, quote, project, result, email, now);

	clearCache('testimonials');
};

export const updateTestimonialApproval = (id: number, approved: number) => {
	const database = getDb();
	database
		.prepare(
			`UPDATE testimonials
			 SET approved = ?
			 WHERE id = ?`,
		)
		.run(approved, id);

	clearCache('testimonials');
};

export const deleteTestimonial = (id: number) => {
	const database = getDb();
	database.prepare('DELETE FROM testimonials WHERE id = ?').run(id);

	clearCache('testimonials');
};

export const getFooterLinks = () => {
	const cached = getCached(cache.footerLinks);
	if (cached) return cached;
	const database = getDb();
	const rows = database
		.prepare(
			`SELECT id, section, label, href, external, sort
			 FROM footer_links
			 ORDER BY section ASC, sort ASC, id ASC`,
		)
		.all() as FooterLink[];

	setCache('footerLinks', rows);
	return rows;
};

export const createFooterLink = (
	section: string,
	label: string,
	href: string | null,
	external: number,
	sort: number,
) => {
	const database = getDb();
	database
		.prepare(
			'INSERT INTO footer_links (section, label, href, external, sort) VALUES (?, ?, ?, ?, ?)',
		)
		.run(section, label, href, external, sort);

	clearCache('footerLinks');
};

export const updateFooterLink = (
	id: number,
	section: string,
	label: string,
	href: string | null,
	external: number,
	sort: number,
) => {
	const database = getDb();
	database
		.prepare(
			`UPDATE footer_links
			 SET section = ?, label = ?, href = ?, external = ?, sort = ?
			 WHERE id = ?`,
		)
		.run(section, label, href, external, sort, id);

	clearCache('footerLinks');
};

export const deleteFooterLink = (id: number) => {
	const database = getDb();
	database.prepare('DELETE FROM footer_links WHERE id = ?').run(id);

	clearCache('footerLinks');
};

const slugifyPlayset = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)+/g, '');

const ensureUniquePlaysetSlug = (database: Database.Database, slug: string, currentId?: number) => {
	const base = slug || 'playset';
	let candidate = base;
	let suffix = 1;
	for (;;) {
		const existing = database.prepare('SELECT id FROM playsets WHERE slug = ?').get(candidate) as
			| { id: number }
			| undefined;
		if (!existing || (currentId && existing.id === currentId)) {
			return candidate;
		}
		candidate = `${base}-${suffix}`;
		suffix += 1;
	}
};

export const getPlaysets = () => {
	const cached = getCached(cache.playsets);
	if (cached) return cached;
	const database = getDb();
	const rows = database
		.prepare(
			`SELECT
				id, name, slug, runtime, COALESCE(description, '') as description, docker_image as dockerImage,
				start_command as startCommand, default_command as defaultCommand,
				enabled, max_sessions as maxSessions, idle_timeout_seconds as idleTimeoutSeconds,
				created_at as createdAt, updated_at as updatedAt
			FROM playsets
			ORDER BY enabled DESC, name ASC`,
		)
		.all() as Playset[];
	setCache('playsets', rows);
	return rows;
};

export const getEnabledPlaysets = () => getPlaysets().filter((playset) => playset.enabled === 1);

export const getPlaysetById = (id: number) => getPlaysets().find((playset) => playset.id === id);

export const getPlaysetBySlug = (slug: string) =>
	getPlaysets().find((playset) => playset.slug === slug);

export const createPlayset = (
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
	const database = getDb();
	const now = new Date().toISOString();
	const baseSlug = slug && slug.length > 0 ? slugifyPlayset(slug) : slugifyPlayset(name);
	const finalSlug = ensureUniquePlaysetSlug(database, baseSlug);
	database
		.prepare(
			`INSERT INTO playsets (
				name, slug, runtime, description, docker_image, start_command, default_command,
				artifact_type, artifact_path, extracted_path, compose_path, verify_status, verify_log, last_verified_at,
				enabled, max_sessions, idle_timeout_seconds, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.run(
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
		);
	clearCache('playsets');
};

export const updatePlayset = (
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
	const database = getDb();
	const now = new Date().toISOString();
	const baseSlug = slug && slug.length > 0 ? slugifyPlayset(slug) : slugifyPlayset(name);
	const finalSlug = ensureUniquePlaysetSlug(database, baseSlug, id);
	database
		.prepare(
			`UPDATE playsets
			 SET name = ?, slug = ?, runtime = ?, description = ?, docker_image = ?, start_command = ?,
				 default_command = ?, artifact_type = ?, artifact_path = ?, enabled = ?, max_sessions = ?,
				 idle_timeout_seconds = ?, updated_at = ?
			 WHERE id = ?`,
		)
		.run(
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
		);
	clearCache('playsets');
};

export const deletePlayset = (id: number) => {
	const database = getDb();
	database.prepare('DELETE FROM playsets WHERE id = ?').run(id);
	clearCache('playsets');
};

export const countActivePlaygroundSessionsForPlayset = (playsetId: number) => {
	const database = getDb();
	const row = database
		.prepare(
			`SELECT COUNT(*) as count
			 FROM playground_sessions
			 WHERE playset_id = ? AND status IN ('starting', 'active')`,
		)
		.get(playsetId) as { count: number };
	return row.count;
};

export const createPlaygroundSession = (
	sessionId: string,
	playsetId: number,
	joinToken: string,
	clientIp: string | null,
	userAgent: string | null,
	status = 'starting',
) => {
	const database = getDb();
	const now = new Date().toISOString();
	database
		.prepare(
			`INSERT INTO playground_sessions (
				session_id, playset_id, status, join_token, container_id, reason, client_ip, user_agent,
				created_at, updated_at, ended_at
			) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, NULL)`,
		)
		.run(sessionId, playsetId, status, joinToken, clientIp, userAgent, now, now);
};

export const getPlaygroundSessionBySessionId = (sessionId: string) => {
	const database = getDb();
	return database
		.prepare(
			`SELECT
				id, session_id as sessionId, playset_id as playsetId, status, join_token as joinToken,
				container_id as containerId, reason, client_ip as clientIp, user_agent as userAgent,
				created_at as createdAt, updated_at as updatedAt, ended_at as endedAt
			FROM playground_sessions
			WHERE session_id = ?`,
		)
		.get(sessionId) as PlaygroundSession | undefined;
};

export const updatePlaygroundSessionStatus = (
	sessionId: string,
	status: string,
	options?: { containerId?: string | null; reason?: string | null; ended?: boolean },
) => {
	const database = getDb();
	const now = new Date().toISOString();
	const current = getPlaygroundSessionBySessionId(sessionId);
	if (!current) return;
	const endedAt = options?.ended ? now : current.endedAt;
	const nextContainerId =
		options?.containerId === undefined ? current.containerId : options.containerId;
	const nextReason = options?.reason === undefined ? current.reason : options.reason;
	database
		.prepare(
			`UPDATE playground_sessions
			 SET status = ?, container_id = ?, reason = ?, updated_at = ?, ended_at = ?
			 WHERE session_id = ?`,
		)
		.run(status, nextContainerId, nextReason, now, endedAt, sessionId);
};

export const createPlaygroundSocketConnection = (wsId: string, sessionId: string) => {
	const database = getDb();
	const now = new Date().toISOString();
	database
		.prepare(
			`INSERT INTO playground_socket_connections (
				ws_id, session_id, connected_at, disconnected_at, close_code, close_reason
			) VALUES (?, ?, ?, NULL, NULL, NULL)`,
		)
		.run(wsId, sessionId, now);
};

export const closePlaygroundSocketConnection = (
	wsId: string,
	closeCode: number | null,
	closeReason: string | null,
) => {
	const database = getDb();
	const now = new Date().toISOString();
	database
		.prepare(
			`UPDATE playground_socket_connections
			 SET disconnected_at = ?, close_code = ?, close_reason = ?
			 WHERE ws_id = ?`,
		)
		.run(now, closeCode, closeReason, wsId);
};

export const createPlaygroundLog = (
	sessionId: string,
	wsId: string | null,
	level: string,
	event: string,
	message: string,
	payload: string | null = null,
) => {
	const database = getDb();
	const now = new Date().toISOString();
	database
		.prepare(
			`INSERT INTO playground_logs (session_id, ws_id, level, event, message, payload, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
		.run(sessionId, wsId, level, event, message, payload, now);
};

export const getPlaygroundLogsBySession = (sessionId: string, limit = 200) => {
	const database = getDb();
	return database
		.prepare(
			`SELECT
				id, session_id as sessionId, ws_id as wsId, level, event, message, payload, created_at as createdAt
			FROM playground_logs
			WHERE session_id = ?
			ORDER BY id DESC
			LIMIT ?`,
		)
		.all(sessionId, limit) as PlaygroundLog[];
};

export const getRecentPlaygroundLogs = (limit = 200) => {
	const database = getDb();
	return database
		.prepare(
			`SELECT
				id, session_id as sessionId, ws_id as wsId, level, event, message, payload, created_at as createdAt
			FROM playground_logs
			ORDER BY id DESC
			LIMIT ?`,
		)
		.all(limit) as PlaygroundLog[];
};

export const getRecentPlaygroundSessions = (limit = 200) => {
	const database = getDb();
	return database
		.prepare(
			`SELECT
				s.id, s.session_id as sessionId, s.playset_id as playsetId, s.status, s.join_token as joinToken,
				s.container_id as containerId, s.reason, s.client_ip as clientIp, s.user_agent as userAgent,
				s.created_at as createdAt, s.updated_at as updatedAt, s.ended_at as endedAt,
				p.name as playsetName, p.slug as playsetSlug, p.runtime as playsetRuntime
			FROM playground_sessions s
			INNER JOIN playsets p ON p.id = s.playset_id
			ORDER BY s.created_at DESC, s.id DESC
			LIMIT ?`,
		)
		.all(limit) as PlaygroundSessionListItem[];
};

export const getPlaygroundOperationalCounts = () => {
	const database = getDb();
	const totalSessions = database
		.prepare('SELECT COUNT(*) as count FROM playground_sessions')
		.get() as {
		count: number;
	};
	const activeSessions = database
		.prepare(
			`SELECT COUNT(*) as count
			 FROM playground_sessions
			 WHERE status IN ('starting', 'active')`,
		)
		.get() as { count: number };
	const failedSessions = database
		.prepare(
			`SELECT COUNT(*) as count
			 FROM playground_sessions
			 WHERE status = 'failed'`,
		)
		.get() as { count: number };
	const activeSocketConnections = database
		.prepare(
			`SELECT COUNT(*) as count
			 FROM playground_socket_connections
			 WHERE disconnected_at IS NULL`,
		)
		.get() as { count: number };
	const totalLogs = database.prepare('SELECT COUNT(*) as count FROM playground_logs').get() as {
		count: number;
	};

	return {
		totalSessions: totalSessions.count,
		activeSessions: activeSessions.count,
		failedSessions: failedSessions.count,
		activeSocketConnections: activeSocketConnections.count,
		totalLogs: totalLogs.count,
	} as PlaygroundOperationalCounts;
};

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
	PlaygroundSocketConnection,
	PlaygroundLog,
	PlaygroundOperationalCounts,
};
