<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import MarkdownContent from '$lib/components/MarkdownContent.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import type { PageData } from './$types';

	export let data: PageData;

	const description =
		data.post.excerpt ?? (data.post.content ? data.post.content.slice(0, 160) : 'Blog entry.');
</script>

<SeoHead title={formatTitle(data.post.title)} description={description} type="article" />

<section class="section-pad">
	<div class="space-y-4">
		<a class="link-underline" href="/blog">Back to blog</a>
		<h1 class="text-4xl font-semibold text-white sm:text-5xl">{data.post.title}</h1>
		<div class="flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em] text-ink-200">
			{#if data.post.publishedAt}
				<span>{data.post.publishedAt}</span>
			{/if}
			{#if data.post.tags}
				<span>{data.post.tags}</span>
			{/if}
		</div>
		{#if data.post.content}
			<MarkdownContent source={data.post.content} className="max-w-3xl" />
		{:else if data.post.excerpt}
			<MarkdownContent source={data.post.excerpt} className="max-w-3xl" />
		{:else}
			<div class="text-base text-ink-200">No content yet.</div>
		{/if}
		{#if data.post.references.length}
			<section class="mt-10 max-w-3xl rounded-2xl border border-ink-200/30 bg-white/5 p-5" aria-labelledby="post-references-heading">
				<h2 id="post-references-heading" class="text-xl font-semibold text-white">References</h2>
				<ol class="mt-4 list-decimal space-y-4 pl-5 text-sm text-ink-200">
					{#each data.post.references as reference}
						<li>
							<a
								class="link-underline"
								href={reference.url}
								target="_blank"
								rel="noreferrer noopener"
							>
								{reference.label}
							</a>
							{#if reference.note}
								<p class="mt-2 leading-6 text-ink-200">{reference.note}</p>
							{/if}
						</li>
					{/each}
				</ol>
			</section>
		{/if}
	</div>
</section>
