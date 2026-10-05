import type { RequestHandler } from './$types';
import { visitorIngestion } from '$lib/server/telemetry/visitorServer';

export const GET: RequestHandler = visitorIngestion.pixel;
