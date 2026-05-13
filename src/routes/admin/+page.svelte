<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import MotionReveal from '$lib/components/MotionReveal.svelte';
	import AdminNav from '$lib/components/AdminNav.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import type { PageData } from './$types';

	export let data: PageData;

	const statCards = [
		{
			label: 'Blog',
			value: data.stats.posts,
			detail: `${data.stats.publishedPosts} live / ${data.stats.draftPosts} draft`,
			href: '/admin/blog',
		},
		{
			label: 'Work',
			value: data.stats.workItems,
			detail: 'Proof projects in rotation',
			href: '/admin/work',
		},
	];

	const primaryActions = [
		{
			label: 'Write',
			href: '/admin/blog',
			detail: 'Create drafts, publish posts, and edit the blog intro.',
		},
		{
			label: 'Update Work',
			href: '/admin/work',
			detail: 'Keep the systems proof projects current.',
		},
		{
			label: 'Resume',
			href: '/admin/resume',
			detail: 'Replace the public resume PDF.',
		},
		{
			label: 'Public Blog',
			href: '/blog',
			detail: 'Review the live blog index.',
		},
	];

	const sections = [
		{ label: 'Site settings', href: '/admin/site', detail: 'Hero, focus, and global copy.' },
		{ label: 'About', href: '/admin/about', detail: 'About page content.' },
		{ label: 'Stack', href: '/admin/stack', detail: 'Stack items and section intro.' },
		{ label: 'Work', href: '/admin/work', detail: 'Projects and featured work.' },
		{ label: 'Blog', href: '/admin/blog', detail: 'Posts, drafts, and blog intro.' },
		{ label: 'Contact', href: '/admin/contact', detail: 'Contact copy and email.' },
		{ label: 'Footer', href: '/admin/footer', detail: 'Footer navigation links.' },
		{ label: 'Errors', href: '/admin/errors', detail: 'Maintenance + error messaging.' },
		{ label: 'Tracking', href: '/admin/tracking', detail: 'Metrics and event activity.' },
		{ label: 'Resume', href: '/admin/resume', detail: 'Upload your PDF resume.' },
	];
</script>

<SeoHead title={formatTitle('Admin')} description="Admin dashboard for site content updates." />

<section class="section-pad">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
		<div class="space-y-4">
			<p class="badge">Admin</p>
			<h1 class="text-4xl font-semibold text-white sm:text-5xl">Control center</h1>
			<p class="max-w-2xl text-lg text-ink-200">
				Update the public site, write posts, and keep unfinished surfaces behind the admin gate.
			</p>
		</div>
		<form method="POST" action="?/logout">
			<input type="hidden" name="csrfToken" value={data.csrfToken} />
			<button class="nav-pill border-ink-100 bg-ink-900 text-white" type="submit"> Log out </button>
		</form>
	</div>
	<div class="mt-8">
		<AdminNav />
	</div>
</section>

<section class="section-pad">
	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		{#each statCards as stat, index}
			<MotionReveal delay={0.04 * index} className="glass p-6">
				<p class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200">{stat.label}</p>
				<p class="mt-3 text-4xl font-semibold text-white">{stat.value}</p>
				<p class="mt-2 text-sm text-ink-200">{stat.detail}</p>
				<a class="link-underline mt-5" href={stat.href}>Open</a>
			</MotionReveal>
		{/each}
	</div>
</section>

<section class="section-pad">
	<div class="grid gap-6 lg:grid-cols-[0.7fr_0.3fr]">
		<MotionReveal className="glass p-8">
			<p class="badge">Next actions</p>
			<div class="mt-6 grid gap-4 sm:grid-cols-2">
				{#each primaryActions as action}
					<a class="card block space-y-3" href={action.href}>
						<h2 class="text-2xl font-semibold text-white">{action.label}</h2>
						<p class="text-sm text-ink-200">{action.detail}</p>
					</a>
				{/each}
			</div>
		</MotionReveal>
		<MotionReveal className="glass p-8">
			<p class="badge">Status</p>
			<h2 class="mt-4 text-2xl font-semibold text-white">Public surface</h2>
			<p class="mt-3 text-sm text-ink-200">
				Blog is public. Admin and tracking remain gated while removed experimental surfaces return
				404.
			</p>
		</MotionReveal>
	</div>
</section>

<section class="section-pad">
	<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="badge">Sections</p>
			<h2 class="mt-4 text-3xl font-semibold text-white">All admin areas</h2>
		</div>
	</div>
	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
		{#each sections as section, index}
			<MotionReveal delay={0.04 * index} className="card space-y-3">
				<p class="text-xs uppercase tracking-[0.2em] text-ink-200">Section</p>
				<h3 class="text-2xl font-semibold text-white">{section.label}</h3>
				<p class="text-sm text-ink-200">{section.detail}</p>
				<a class="link-underline" href={section.href}>Open {section.label}</a>
			</MotionReveal>
		{/each}
	</div>
</section>
