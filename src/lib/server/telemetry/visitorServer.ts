import { createTrackingEvent } from '../telemetryStore';
import { rateLimit } from '../rateLimit';
import { createVisitorIngestion } from './visitorIngestion';

export const visitorIngestion = createVisitorIngestion({
	rateLimit,
	record: (event, referrer) => createTrackingEvent(event.type, event.name, event.path, referrer, null, null, null, { actorType: 'visitor', source: 'public' }),
});
