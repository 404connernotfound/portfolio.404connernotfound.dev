import type { RequestHandler } from './$types';
import { getPublishedPosts, getWorkItems } from '$lib/server/dataStore';
import { getOrSetCached } from '$lib/server/cache';
import { workItemPath } from '$lib/utils/content';

const buildUrlEntry = (loc: string, lastmod?: string) => {
	const lastmodTag = lastmod ? `<lastmod>${lastmod}</lastmod>` : '';
	return `<url><loc>${loc}</loc>${lastmodTag}</url>`;
};

export const GET: RequestHandler = async ({ url }) => {
	const origin = url.origin;
	const body = await getOrSetCached(`xml:sitemap:${origin}`, 60, async () => {
		const now = new Date().toISOString();
		const [posts, workItems] = await Promise.all([getPublishedPosts(), getWorkItems()]);

		const staticPaths = [
			'/',
			'/about',
			'/work',
			'/blog',
			'/resume',
			'/contact',
			'/book',
			'/reviews',
			'/privacy-policy',
			'/cookie-policy',
		];
		const staticUrls = staticPaths.map((path) => buildUrlEntry(`${origin}${path}`, now));

		const postUrls = posts.map((post) => {
			const lastmod = post.publishedAt ?? post.createdAt;
			return buildUrlEntry(`${origin}/blog/${post.slug}`, lastmod);
		});
		const workUrls = workItems.map((item) => buildUrlEntry(`${origin}${workItemPath(item)}`, now));

		return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...workUrls, ...postUrls].join('')}
</urlset>`;
	});

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml',
		},
	});
};
