<script lang="ts">
	import MarkdownContent from '$lib/components/MarkdownContent.svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { calculateReadTime } from '$lib/utils/content';
	import { formatTitle } from '$lib/utils/seo';
	import type { PageData } from './$types';

	export let data: PageData;

	const formatDate = (value: string | null) => {
		if (!value) return 'Date not specified';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return value;
		return new Intl.DateTimeFormat('en', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		}).format(date);
	};
</script>

<SeoHead title={formatTitle('Notes')} description={data.siteSettings.blogIntro} />

<section class="section-pad">
	<div class="inspection-shell">
		<div>
			<p class="system-label">Writing / engineering field notes</p>
			<h1 class="inspection-title">{data.siteSettings.blogTitle}</h1>
			<p class="inspection-summary">{data.siteSettings.blogIntro}</p>
		</div>
		<aside class="inspection-side">
			<p class="system-label">Why I write</p>
			<p class="mt-3 text-sm leading-6 text-ink-400">
				To make the reasoning visible: constraints, tradeoffs, failures, and the decisions that
				survive contact with real software.
			</p>
		</aside>
	</div>
</section>

{#if data.blogPosts.length}
	<section class="section-pad pt-0">
		<div class="note-index">
			{#each data.blogPosts as post}
				<article class="note-index-item">
					<div>
						<p class="note-index-date">{formatDate(post.publishedAt)}</p>
						<p class="note-index-tags mt-2">{calculateReadTime(post.content || post.excerpt)}</p>
					</div>
					<div class="note-index-copy">
						<h2><a href={`/blog/${post.slug}`}>{post.title}</a></h2>
						{#if post.excerpt}<MarkdownContent source={post.excerpt} />{/if}
						{#if post.tags}<p class="note-index-tags">{post.tags}</p>{/if}
					</div>
					<a class="note-index-link" href={`/blog/${post.slug}`}>Read note →</a>
				</article>
			{/each}
		</div>
	</section>
{:else}
	<section class="section-pad">
		<div class="glass p-8 text-sm text-ink-200">No notes have been published yet.</div>
	</section>
{/if}
