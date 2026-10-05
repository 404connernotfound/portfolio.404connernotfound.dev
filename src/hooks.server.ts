import { getSiteSettings } from '$lib/server/dataStore';
import { isAdminAuthenticatedCached } from '$lib/server/auth';
import { createSecurityHandle } from '$lib/server/routeSecurity';
import { ensurePostgresAppSchema } from '$lib/server/postgres';

// Schema failures stop server initialization instead of surfacing after deployment.
await ensurePostgresAppSchema();

export const handle = createSecurityHandle({ getSiteSettings, isAdminAuthenticated: isAdminAuthenticatedCached });
