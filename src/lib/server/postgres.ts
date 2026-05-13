import { Pool, types, type QueryResultRow } from 'pg';

const runtimeEnv = process.env;
const connectionString = runtimeEnv.DATABASE_URL?.trim();
const useSsl = runtimeEnv.PG_SSL === 'true';
const maxPoolSize = Number(runtimeEnv.PG_POOL_MAX ?? '10');

let pool: Pool | null = null;
let schemaReadyPromise: Promise<void> | null = null;

// Normalize int8/numeric counts to numbers for parity with SQLite call sites.
types.setTypeParser(20, (value) => Number(value));

const appSchemaSql = `
	CREATE TABLE IF NOT EXISTS site_settings (
		id BIGINT PRIMARY KEY,
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
		id BIGSERIAL PRIMARY KEY,
		label TEXT NOT NULL,
		detail TEXT,
		category TEXT,
		sort INTEGER NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS work_items (
		id BIGSERIAL PRIMARY KEY,
		title TEXT NOT NULL,
		description TEXT NOT NULL,
		long_description TEXT,
		highlights TEXT,
		role TEXT,
		tech TEXT,
		link TEXT,
		image_path TEXT,
		image_url TEXT,
		image_alt TEXT,
		featured INTEGER NOT NULL DEFAULT 0,
		sort INTEGER NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS posts (
		id BIGSERIAL PRIMARY KEY,
		title TEXT NOT NULL,
		slug TEXT NOT NULL UNIQUE,
		excerpt TEXT,
		content TEXT,
		tags TEXT,
		draft INTEGER NOT NULL DEFAULT 0,
		featured INTEGER NOT NULL DEFAULT 0,
		published_at TEXT,
		created_at TEXT NOT NULL,
		references_json TEXT
	);

	ALTER TABLE work_items ADD COLUMN IF NOT EXISTS image_url TEXT;
	ALTER TABLE posts ADD COLUMN IF NOT EXISTS references_json TEXT;

	CREATE TABLE IF NOT EXISTS assets (
		id BIGSERIAL PRIMARY KEY,
		label TEXT NOT NULL,
		filename TEXT NOT NULL,
		path TEXT NOT NULL,
		mime TEXT NOT NULL,
		size BIGINT NOT NULL,
		public INTEGER NOT NULL DEFAULT 1,
		created_at TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS testimonials (
		id BIGSERIAL PRIMARY KEY,
		name TEXT NOT NULL,
		role TEXT,
		company TEXT,
		quote TEXT NOT NULL,
		project TEXT,
		result TEXT,
		email TEXT,
		approved INTEGER NOT NULL DEFAULT 0,
		created_at TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS tracking_events (
		id BIGSERIAL PRIMARY KEY,
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
		id BIGSERIAL PRIMARY KEY,
		channel TEXT NOT NULL,
		name TEXT NOT NULL,
		email TEXT NOT NULL,
		scope TEXT NOT NULL,
		ip TEXT,
		user_agent TEXT,
		created_at TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
		id BIGSERIAL PRIMARY KEY,
		email TEXT NOT NULL UNIQUE,
		name TEXT,
		interest TEXT,
		ip TEXT,
		user_agent TEXT,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS footer_links (
		id BIGSERIAL PRIMARY KEY,
		section TEXT NOT NULL,
		label TEXT NOT NULL,
		href TEXT,
		external INTEGER NOT NULL DEFAULT 0,
		sort INTEGER NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS playsets (
		id BIGSERIAL PRIMARY KEY,
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
		id BIGSERIAL PRIMARY KEY,
		session_id TEXT NOT NULL UNIQUE,
		playset_id BIGINT NOT NULL,
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
		id BIGSERIAL PRIMARY KEY,
		ws_id TEXT NOT NULL UNIQUE,
		session_id TEXT NOT NULL,
		connected_at TEXT NOT NULL,
		disconnected_at TEXT,
		close_code INTEGER,
		close_reason TEXT,
		FOREIGN KEY (session_id) REFERENCES playground_sessions(session_id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS playground_logs (
		id BIGSERIAL PRIMARY KEY,
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
	CREATE INDEX IF NOT EXISTS idx_tracking_events_created
		ON tracking_events(created_at DESC);
`;

export const isPostgresConfigured = () => Boolean(connectionString);

const getPool = () => {
	if (!connectionString) return null;
	if (!pool) {
		pool = new Pool({
			connectionString,
			ssl: useSsl ? { rejectUnauthorized: false } : undefined,
			max: Number.isFinite(maxPoolSize) ? maxPoolSize : 10
		});
	}
	return pool;
};

export const ensurePostgresAppSchema = async () => {
	if (!isPostgresConfigured()) return false;
	if (!schemaReadyPromise) {
		schemaReadyPromise = (async () => {
			const activePool = getPool();
			if (!activePool) return;
			await activePool.query(appSchemaSql);
		})();
	}

	await schemaReadyPromise;
	return true;
};

export const ensureTelemetrySchema = ensurePostgresAppSchema;

export const queryPostgres = async <T extends QueryResultRow = QueryResultRow>(
	text: string,
	values: readonly unknown[] = []
) => {
	const activePool = getPool();
	if (!activePool) {
		throw new Error('DATABASE_URL is not configured.');
	}
	const result = await activePool.query<T>(text, values as unknown[]);
	return result.rows;
};

export const executePostgres = async (text: string, values: readonly unknown[] = []) => {
	const activePool = getPool();
	if (!activePool) {
		throw new Error('DATABASE_URL is not configured.');
	}
	await activePool.query(text, values as unknown[]);
};

export const pingPostgres = async () => {
	if (!isPostgresConfigured()) {
		return { configured: false, ok: false };
	}

	try {
		const activePool = getPool();
		if (!activePool) return { configured: true, ok: false };
		await activePool.query('SELECT 1');
		return { configured: true, ok: true };
	} catch {
		return { configured: true, ok: false };
	}
};
