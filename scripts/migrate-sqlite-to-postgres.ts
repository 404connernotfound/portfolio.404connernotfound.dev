import Database from 'better-sqlite3';
import path from 'node:path';
import { ensurePostgresAppSchema, executePostgres, isPostgresConfigured } from '../src/lib/server/postgres.ts';

type TableSpec = {
	name: string;
	columns: string[];
	conflictColumns: string[];
};

const DEFAULT_DB_PATH = 'data/portfolio.sqlite';

const specs: TableSpec[] = [
	{
		name: 'site_settings',
		columns: [
			'id',
			'hero_headline',
			'hero_subheadline',
			'hero_note_title',
			'hero_note_body',
			'hero_highlights_title',
			'hero_highlights_body',
			'about_headline',
			'about_body',
			'focus_headline',
			'focus_body',
			'stack_title',
			'stack_intro',
			'work_title',
			'work_intro',
			'blog_title',
			'blog_intro',
			'contact_title',
			'contact_body',
			'contact_email',
			'github_url',
			'footer_badge',
			'footer_headline',
			'footer_body',
			'footer_cta_label',
			'footer_cta_href',
			'maintenance_enabled',
			'maintenance_title',
			'maintenance_body',
			'error_403_title',
			'error_403_body',
			'error_404_title',
			'error_404_body',
			'error_500_title',
			'error_500_body',
			'updated_at'
		],
		conflictColumns: ['id']
	},
	{ name: 'stack_items', columns: ['id', 'label', 'detail', 'category', 'sort'], conflictColumns: ['id'] },
	{
		name: 'work_items',
		columns: [
			'id',
			'title',
			'description',
			'long_description',
			'highlights',
			'role',
			'tech',
			'link',
			'image_path',
			'image_url',
			'image_alt',
			'featured',
			'sort'
		],
		conflictColumns: ['id']
	},
	{
		name: 'posts',
		columns: [
			'id',
			'title',
			'slug',
			'excerpt',
			'content',
			'tags',
			'draft',
			'featured',
			'published_at',
			'created_at',
			'references_json'
		],
		conflictColumns: ['id']
	},
	{
		name: 'assets',
		columns: ['id', 'label', 'filename', 'path', 'mime', 'size', 'public', 'created_at'],
		conflictColumns: ['id']
	},
	{
		name: 'testimonials',
		columns: ['id', 'name', 'role', 'company', 'quote', 'project', 'result', 'email', 'approved', 'created_at'],
		conflictColumns: ['id']
	},
	{
		name: 'tracking_events',
		columns: ['id', 'type', 'name', 'path', 'referrer', 'user_agent', 'ip', 'payload', 'created_at'],
		conflictColumns: ['id']
	},
	{
		name: 'inbound_messages',
		columns: ['id', 'channel', 'name', 'email', 'scope', 'ip', 'user_agent', 'created_at'],
		conflictColumns: ['id']
	},
	{
		name: 'newsletter_subscriptions',
		columns: ['id', 'email', 'name', 'interest', 'ip', 'user_agent', 'created_at', 'updated_at'],
		conflictColumns: ['id']
	},
	{
		name: 'footer_links',
		columns: ['id', 'section', 'label', 'href', 'external', 'sort'],
		conflictColumns: ['id']
	},
	{
		name: 'playsets',
		columns: [
			'id',
			'name',
			'slug',
			'runtime',
			'description',
			'docker_image',
			'start_command',
			'default_command',
			'artifact_type',
			'artifact_path',
			'extracted_path',
			'compose_path',
			'verify_status',
			'verify_log',
			'last_verified_at',
			'enabled',
			'max_sessions',
			'idle_timeout_seconds',
			'created_at',
			'updated_at'
		],
		conflictColumns: ['id']
	},
	{
		name: 'playground_sessions',
		columns: [
			'id',
			'session_id',
			'playset_id',
			'status',
			'join_token',
			'container_id',
			'reason',
			'client_ip',
			'user_agent',
			'created_at',
			'updated_at',
			'ended_at'
		],
		conflictColumns: ['session_id']
	},
	{
		name: 'playground_socket_connections',
		columns: ['id', 'ws_id', 'session_id', 'connected_at', 'disconnected_at', 'close_code', 'close_reason'],
		conflictColumns: ['ws_id']
	},
	{
		name: 'playground_logs',
		columns: ['id', 'session_id', 'ws_id', 'level', 'event', 'message', 'payload', 'created_at'],
		conflictColumns: ['id']
	}
];

const sequenceTables = [
	'stack_items',
	'work_items',
	'posts',
	'assets',
	'testimonials',
	'tracking_events',
	'inbound_messages',
	'newsletter_subscriptions',
	'footer_links',
	'playsets',
	'playground_sessions',
	'playground_socket_connections',
	'playground_logs'
];

const buildUpsertSql = (spec: TableSpec) => {
	const placeholders = spec.columns.map((_, index) => `$${index + 1}`).join(', ');
	const conflict = spec.conflictColumns.join(', ');
	const updateColumns = spec.columns.filter((column) => !spec.conflictColumns.includes(column));
	const updateSet = updateColumns.map((column) => `${column} = EXCLUDED.${column}`).join(', ');
	return `INSERT INTO ${spec.name} (${spec.columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT (${conflict}) DO UPDATE SET ${updateSet}`;
};

const normalizeValue = (value: unknown) => {
	if (value === undefined) return null;
	if (typeof value === 'bigint') return Number(value);
	return value;
};

const resolveDbPath = (dbPath: string) =>
	path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);

const dbPath = resolveDbPath(process.env.DB_PATH ?? DEFAULT_DB_PATH);
const sqlite = new Database(dbPath, { readonly: true, fileMustExist: true });

const hasTable = (name: string) => {
	const row = sqlite
		.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
		.get(name) as { name: string } | undefined;
	return Boolean(row?.name);
};

const migrateTable = async (spec: TableSpec) => {
	if (!hasTable(spec.name)) {
		console.log(`[skip] ${spec.name} (table missing in sqlite)`);
		return;
	}
	const rows = sqlite
		.prepare(`SELECT ${spec.columns.join(', ')} FROM ${spec.name}`)
		.all() as Record<string, unknown>[];
	if (rows.length === 0) {
		console.log(`[ok] ${spec.name} (0 rows)`);
		return;
	}

	const sql = buildUpsertSql(spec);
	for (const row of rows) {
		const values = spec.columns.map((column) => normalizeValue(row[column]));
		await executePostgres(sql, values);
	}
	console.log(`[ok] ${spec.name} (${rows.length} rows)`);
};

const syncSequence = async (table: string) => {
	await executePostgres(
		`SELECT setval(
			pg_get_serial_sequence($1, 'id'),
			COALESCE((SELECT MAX(id) FROM ${table}), 1),
			EXISTS (SELECT 1 FROM ${table})
		)`,
		[table]
	);
};

const main = async () => {
	if (!isPostgresConfigured()) {
		throw new Error('DATABASE_URL must be set before running migration.');
	}

	await ensurePostgresAppSchema();
	for (const spec of specs) {
		await migrateTable(spec);
	}

	for (const table of sequenceTables) {
		await syncSequence(table);
	}

	console.log('SQLite to PostgreSQL migration complete.');
};

main()
	.catch((error) => {
		console.error('Migration failed.');
		console.error(error);
		process.exit(1);
	})
	.finally(() => {
		sqlite.close();
	});
