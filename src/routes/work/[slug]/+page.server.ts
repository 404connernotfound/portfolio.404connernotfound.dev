import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getSiteSettings, getWorkItems } from '$lib/server/dataStore';
import { workItemPath } from '$lib/utils/content';

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.slug.split('-', 1)[0]);
	if (!Number.isInteger(id) || id <= 0) throw error(404, 'System not found.');

	const [siteSettings, workItems] = await Promise.all([getSiteSettings(), getWorkItems()]);
	const project = workItems.find((item) => item.id === id);
	if (!project) throw error(404, 'System not found.');

	const canonicalPath = workItemPath(project);
	if (`/work/${params.slug}` !== canonicalPath) throw redirect(308, canonicalPath);

	return { siteSettings, project };
};
