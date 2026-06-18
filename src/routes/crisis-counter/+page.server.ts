import type { PageServerLoad } from './$types';
import { getCrisisItems } from '$lib/server/dataStore';
import { getOrSetCached } from '$lib/server/cache';

export const load: PageServerLoad = async () => {
	return getOrSetCached('page:crisis-counter', 20, async () => ({
		crisisItems: await getCrisisItems()
	}));
};
