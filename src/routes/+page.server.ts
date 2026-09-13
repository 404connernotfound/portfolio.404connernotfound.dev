import type { PageServerLoad } from './$types';
import {
	getFeaturedWork,
	getApprovedTestimonials,
	getPublishedPosts,
	getSiteSettings,
	getStackItems,
} from '$lib/server/dataStore';
import { getOrSetCached } from '$lib/server/cache';

export const load: PageServerLoad = async () => {
	return getOrSetCached('page:home', 20, async () => {
		const [siteSettings, featuredWork, stackItems, posts, testimonials] = await Promise.all([
			getSiteSettings(),
			getFeaturedWork(),
			getStackItems(),
			getPublishedPosts(),
			getApprovedTestimonials(),
		]);
		return {
			siteSettings,
			featuredWork,
			stackItems,
			latestNote: posts[0] ?? null,
			testimonials: testimonials.slice(0, 8).map((review) => ({
				id: review.id,
				name: review.name,
				company: review.company,
				project: review.project,
				quote: review.quote,
				rating: review.rating,
			})),
		};
	});
};
