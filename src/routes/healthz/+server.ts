import type { RequestHandler } from './$types';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { pingPostgres } from '$lib/server/postgres';
import { pingRedis } from '$lib/server/redis';

export const GET: RequestHandler = async () => {
	const memory = process.memoryUsage();
	const cpu = process.cpuUsage();
	const eventLoop = performance.eventLoopUtilization();
	const [postgres, redis] = await Promise.all([pingPostgres(), pingRedis()]);
	const dependenciesOk = [postgres, redis].every((dependency) => !dependency.configured || dependency.ok);
	const status = dependenciesOk ? 'ok' : 'degraded';
	const verbose = process.env.HEALTHZ_VERBOSE === 'true' || process.env.NODE_ENV !== 'production';

	const body = verbose ? {
		status,
		timestamp: new Date().toISOString(),
		uptimeSeconds: process.uptime(),
		memory: {
			rss: memory.rss,
			heapTotal: memory.heapTotal,
			heapUsed: memory.heapUsed,
			external: memory.external
		},
		cpu,
		loadAverage: os.loadavg(),
		eventLoop: {
			utilization: eventLoop.utilization,
			active: eventLoop.active,
			idle: eventLoop.idle
		},
		dependencies: {
			postgres,
			redis
		},
		latencySpikes: [] as string[]
	} : {
		status,
		timestamp: new Date().toISOString()
	};

	return new Response(JSON.stringify(body), {
		status: dependenciesOk ? 200 : 503,
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-store'
		}
	});
};
