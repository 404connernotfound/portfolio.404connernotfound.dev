import type { RequestHandler } from './$types';
import { visitorIngestion } from '$lib/server/telemetry/visitorServer';

export const OPTIONS: RequestHandler = visitorIngestion.options;
export const POST: RequestHandler = visitorIngestion.post;
