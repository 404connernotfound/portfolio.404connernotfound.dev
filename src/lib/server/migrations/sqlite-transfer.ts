import type Database from 'better-sqlite3';
import type { Pool } from 'pg';
type TableSpec = {
	name: string;
	columns: string[];
	conflictColumns: string[];
};



export const sqliteTableSpecs: TableSpec[] = [
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
			'updated_at',
		],
		conflictColumns: ['id'],
	},
	{
		name: 'stack_items',
		columns: ['id', 'label', 'detail', 'category', 'sort'],
		conflictColumns: ['id'],
	},
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
			'lifecycle',
			'owner',
			'domain',
			'version',
			'subsystems',
			'trace',
			'link',
			'image_path',
			'image_url',
			'image_alt',
			'featured',
			'sort',
		],
		conflictColumns: ['id'],
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
			'references_json',
		],
		conflictColumns: ['id'],
	},
	{
		name: 'assets',
		columns: ['id', 'label', 'filename', 'path', 'mime', 'size', 'public', 'created_at'],
		conflictColumns: ['id'],
	},
	{
		name: 'testimonials',
		columns: [
			'id',
			'name',
			'role',
			'company',
			'quote',
			'project',
			'result',
			'email',
			'rating',
			'fingerprint',
			'approved',
			'created_at',
		],
		conflictColumns: ['id'],
	},
	{
		name: 'appointments',
		columns: [
			'id',
			'name',
			'email',
			'company',
			'project_type',
			'description',
			'starts_at',
			'visitor_timezone',
			'status',
			'ip_hash',
			'created_at',
			'updated_at',
		],
		conflictColumns: ['id'],
	},
	{
		name: 'tracking_events',
		columns: [
			'id',
			'type',
			'name',
			'path',
			'referrer',
			'user_agent',
			'ip',
			'payload',
			'created_at',
		],
		conflictColumns: ['id'],
	},
	{
		name: 'inbound_messages',
		columns: ['id', 'channel', 'name', 'email', 'scope', 'ip', 'user_agent', 'created_at'],
		conflictColumns: ['id'],
	},
	{
		name: 'newsletter_subscriptions',
		columns: ['id', 'email', 'name', 'interest', 'ip', 'user_agent', 'created_at', 'updated_at'],
		conflictColumns: ['id'],
	},
	{
		name: 'crisis_items',
		columns: ['id', 'title', 'description', 'category', 'sort', 'created_at'],
		conflictColumns: ['id'],
	},
	{
		name: 'footer_links',
		columns: ['id', 'section', 'label', 'href', 'external', 'sort'],
		conflictColumns: ['id'],
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
			'updated_at',
		],
		conflictColumns: ['id'],
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
			'ended_at',
		],
		conflictColumns: ['session_id'],
	},
	{
		name: 'playground_socket_connections',
		columns: [
			'id',
			'ws_id',
			'session_id',
			'connected_at',
			'disconnected_at',
			'close_code',
			'close_reason',
		],
		conflictColumns: ['ws_id'],
	},
	{
		name: 'playground_logs',
		columns: ['id', 'session_id', 'ws_id', 'level', 'event', 'message', 'payload', 'created_at'],
		conflictColumns: ['id'],
	},
];

const sequenceTables = [
	'stack_items',
	'work_items',
	'posts',
	'assets',
	'testimonials',
	'appointments',
	'tracking_events',
	'inbound_messages',
	'newsletter_subscriptions',
	'crisis_items',
	'footer_links',
	'playsets',
	'playground_sessions',
	'playground_socket_connections',
	'playground_logs',
];

const buildUpsertSql = (spec: TableSpec) => {
	const placeholders = spec.columns.map((_, index) => `$${index + 1}`).join(', ');
	const conflict = spec.conflictColumns.join(', ');
	const updateColumns = spec.columns.filter((column) => !spec.conflictColumns.includes(column));
	const updateSet = updateColumns.map((column) => `${column} = EXCLUDED.${column}`).join(', ');
	return `INSERT INTO ${spec.name} (${spec.columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT (${conflict}) DO UPDATE SET ${updateSet}`;
};

const normalizeValue = (value: unknown) => {
	if (value === undefined) throw new Error('Missing SQLite value during migration.');
	if (typeof value === 'bigint') return value.toString();
	return value;
};

const columnNames = (rows: unknown[]): string[] => rows.map((row) => {
	if (typeof row !== 'object' || row === null || !('name' in row) || typeof row.name !== 'string') {
		throw new Error('Invalid SQLite schema metadata.');
	}
	return row.name;
});

// Validate before any destination write. Old SQLite schemas must be upgraded first.
export function inspectSqliteMigrationSource(sqlite: Database.Database) {
	const names = columnNames(sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all());
	const supported = new Set([...sqliteTableSpecs.map((spec) => spec.name), 'migrations', 'sqlite_sequence']);
	for (const name of names) {
		if (!supported.has(name)) throw new Error(`Unsupported SQLite table ${name}; migration would lose data.`);
	}
	for (const spec of sqliteTableSpecs) {
		if (!names.includes(spec.name)) throw new Error(`Required SQLite table ${spec.name} is missing.`);
		const actual = columnNames(sqlite.prepare(`PRAGMA table_info(${spec.name})`).all());
		const expected = spec.name === 'tracking_events' ? [...spec.columns, 'actor_type', 'source'] : spec.columns;
		const missing = spec.columns.filter((column) => !actual.includes(column));
		const extra = actual.filter((column) => !expected.includes(column));
		if (missing.length || extra.length) {
			throw new Error(`Incompatible SQLite ${spec.name}: missing [${missing}], unsupported [${extra}].`);
		}
	}
}

export async function migrateSqliteToPostgres(sqlite: Database.Database, pool: Pool) {
	inspectSqliteMigrationSource(sqlite);
	const client = await pool.connect();
	const counts: Record<string, number> = {};
	try {
		// Both sides use one consistent transaction/snapshot for the entire transfer.
		sqlite.exec('BEGIN');
		await client.query('BEGIN');
		for (const spec of sqliteTableSpecs) {
			const actual = columnNames(sqlite.prepare(`PRAGMA table_info(${spec.name})`).all());
			const columns = spec.name === 'tracking_events' ? [...spec.columns, 'actor_type', 'source'] : spec.columns;
			const selected = columns.filter((column) => actual.includes(column));
			const rows: unknown[] = sqlite.prepare(`SELECT ${selected.join(', ')} FROM ${spec.name}`).all();
			for (const row of rows) {
				if (typeof row !== 'object' || row === null) throw new Error(`Invalid SQLite row in ${spec.name}.`);
				const values = columns.map((column) => {
					if (!(column in row)) {
						if (column === 'actor_type') return 'visitor';
						if (column === 'source') return 'legacy';
						throw new Error(`Missing ${spec.name}.${column}.`);
					}
					return normalizeValue(Reflect.get(row, column));
				});
				await client.query(buildUpsertSql({ ...spec, columns }), values);
			}
			counts[spec.name] = rows.length;
		}
		for (const table of sequenceTables) {
			await client.query(`SELECT setval(pg_get_serial_sequence($1, 'id'),
				COALESCE((SELECT MAX(id) FROM ${table}), 1), EXISTS (SELECT 1 FROM ${table}))`, [table]);
		}
		await client.query('COMMIT');
		sqlite.exec('COMMIT');
		return counts;
	} catch (error) {
		await client.query('ROLLBACK');
		if (sqlite.inTransaction) sqlite.exec('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}
