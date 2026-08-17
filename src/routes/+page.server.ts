import type { PageServerLoad } from './$types';
import {
	getFeaturedWork,
	getPublishedPosts,
	getSiteSettings,
	getStackItems,
} from '$lib/server/dataStore';
import { getOrSetCached } from '$lib/server/cache';

export const load: PageServerLoad = async () => {
	return getOrSetCached('page:home', 20, async () => {
		const [siteSettings, featuredWork, stackItems, posts] = await Promise.all([
			getSiteSettings(),
			getFeaturedWork(),
			getStackItems(),
			getPublishedPosts(),
		]);
		return { siteSettings, featuredWork, stackItems, latestNote: posts[0] ?? null };
	});
};
