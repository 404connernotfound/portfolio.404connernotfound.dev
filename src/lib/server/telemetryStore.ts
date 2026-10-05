import type { TrackingEvent } from '$lib/server/db';
import { getOrSetCached, invalidateCachedPrefix } from '$lib/server/cache';
import {
	createInboundMessage as createInboundMessageSqlite,
	createTrackingEvent as createTrackingEventSqlite,
	getTrackingCounts as getTrackingCountsSqlite,
	getTrackingEvents as getTrackingEventsSqlite,
	upsertNewsletterSubscription as upsertNewsletterSubscriptionSqlite
} from '$lib/server/db';
import {
	ensureTelemetrySchema,
	isPostgresConfigured,
	queryPostgres
} from '$lib/server/postgres';

const clampString = (value: string, max: number) =>
	value.length > max ? value.slice(0, max) : value;
const TRACKING_CACHE_PREFIX = 'tracking:';
const TRACKING_COUNTS_CACHE_KEY = `${TRACKING_CACHE_PREFIX}counts`;
const trackingEventsCacheKey = (limit: number) => `${TRACKING_CACHE_PREFIX}events:${limit}`;

const getCount = async (sql: string, values: readonly unknown[] = []) => {
	const rows = await queryPostgres<{ count: number }>(sql, values);
	return rows[0]?.count ?? 0;
};

const withPostgresFallback = async <T>(
	operation: () => Promise<T>,
	fallback: () => T
) => {
	if (!isPostgresConfigured()) {
		return fallback();
	}

	await ensureTelemetrySchema();
	return operation();
};

export const createInboundMessage = async (
	channel: 'contact' | 'collaborate',
	name: string,
	email: string,
	scope: string,
	ip: string | null,
	userAgent: string | null
) => {
	return withPostgresFallback(
		async () => {
			const safeChannel = channel === 'collaborate' ? 'collaborate' : 'contact';
			const now = new Date().toISOString();

			await queryPostgres(
				`INSERT INTO inbound_messages (channel, name, email, scope, ip, user_agent, created_at)
				 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
				[
					safeChannel,
					clampString(name.trim(), 160),
					clampString(email.trim().toLowerCase(), 320),
					clampString(scope.trim(), 10_000),
					ip ? clampString(ip, 80) : null,
					userAgent ? clampString(userAgent, 512) : null,
					now
				]
			);
		},
		() => createInboundMessageSqlite(channel, name, email, scope, ip, userAgent)
	);
};

export const upsertNewsletterSubscription = async (
	name: string | null,
	email: string,
	interest: string | null,
	ip: string | null,
	userAgent: string | null
) => {
	return withPostgresFallback(
		async () => {
			const now = new Date().toISOString();
			const normalizedEmail = clampString(email.trim().toLowerCase(), 320);
			const normalizedName = name ? clampString(name.trim(), 160) : null;
			const normalizedInterest = interest ? clampString(interest.trim(), 160) : null;

			await queryPostgres(
				`INSERT INTO newsletter_subscriptions (email, name, interest, ip, user_agent, created_at, updated_at)
				 VALUES ($1, $2, $3, $4, $5, $6, $7)
				 ON CONFLICT(email) DO UPDATE SET
					name = EXCLUDED.name,
					interest = EXCLUDED.interest,
					ip = EXCLUDED.ip,
					user_agent = EXCLUDED.user_agent,
					updated_at = EXCLUDED.updated_at`,
				[
					normalizedEmail,
					normalizedName,
					normalizedInterest,
					ip ? clampString(ip, 80) : null,
					userAgent ? clampString(userAgent, 512) : null,
					now,
					now
				]
			);
		},
		() => upsertNewsletterSubscriptionSqlite(name, email, interest, ip, userAgent)
	);
};

export const createTrackingEvent = async (
	type: string,
	name: string | null,
	pathValue: string | null,
	referrer: string | null,
	userAgent: string | null,
	ip: string | null,
	payload: string | null,
	actor: { actorType: 'visitor'; source: 'public' } | { actorType: 'admin'; source: 'server' } = { actorType: 'visitor', source: 'public' }
) => {
	const result = await withPostgresFallback(
		async () => {
			const now = new Date().toISOString();
			await queryPostgres(
				`INSERT INTO tracking_events (type, name, path, referrer, user_agent, ip, payload, created_at, actor_type, source)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
				[type, name, pathValue, referrer, userAgent, ip, payload, now, actor.actorType, actor.source]
			);
		},
		() => createTrackingEventSqlite(type, name, pathValue, referrer, userAgent, ip, payload, actor)
	);

	await invalidateCachedPrefix(TRACKING_CACHE_PREFIX);
	return result;
};

export const getTrackingEvents = async (limit = 100): Promise<TrackingEvent[]> => {
	const clampedLimit = Math.min(500, Math.max(1, Math.floor(limit)));
	return getOrSetCached(trackingEventsCacheKey(clampedLimit), 15, () =>
		withPostgresFallback(
			async () => {
				return queryPostgres<TrackingEvent>(
					`SELECT
						id, type, name, path, referrer, user_agent as "userAgent", ip, payload, created_at as "createdAt", actor_type as "actorType", source
				 FROM tracking_events
				 ORDER BY created_at DESC, id DESC
				 LIMIT $1`,
					[clampedLimit]
				);
			},
			() => getTrackingEventsSqlite(clampedLimit)
		)
	);
}

export const getTrackingCounts = async () => {
	return getOrSetCached(TRACKING_COUNTS_CACHE_KEY, 15, () =>
		withPostgresFallback(
			async () => {
				const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
				const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

				const [
					total,
					lastDay,
					lastWeek,
					byType,
					topPaths
				] = await Promise.all([
					getCount('SELECT COUNT(*)::int as count FROM tracking_events'),
					getCount('SELECT COUNT(*)::int as count FROM tracking_events WHERE created_at >= $1', [dayAgo]),
					getCount('SELECT COUNT(*)::int as count FROM tracking_events WHERE created_at >= $1', [weekAgo]),
					queryPostgres<{ type: string; count: number }>(
						`SELECT type, COUNT(*)::int as count
						 FROM tracking_events
						 GROUP BY type
						 ORDER BY count DESC`
					),
					queryPostgres<{ path: string; count: number }>(
						`SELECT path, COUNT(*)::int as count
						 FROM tracking_events
						 WHERE path IS NOT NULL AND path != ''
						 GROUP BY path
						 ORDER BY count DESC
						 LIMIT 8`
					)
				]);

				return {
					total,
					lastDay,
					lastWeek,
					byType,
					topPaths
				};
			},
			() => getTrackingCountsSqlite()
		)
	);
};
