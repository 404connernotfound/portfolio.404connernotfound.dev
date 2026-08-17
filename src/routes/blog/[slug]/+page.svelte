<script lang="ts">
	import MarkdownContent from '$lib/components/MarkdownContent.svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { calculateReadTime } from '$lib/utils/content';
	import { formatTitle } from '$lib/utils/seo';
	import type { PageData } from './$types';

	export let data: PageData;

	const description =
		data.post.excerpt ?? (data.post.content ? data.post.content.slice(0, 160) : 'Technical note.');
	const readTime = calculateReadTime(data.post.content ?? data.post.excerpt ?? '');
</script>

<SeoHead title={formatTitle(data.post.title)} {description} type="article" />

<section class="section-pad">
	<div class="note-article">
		<aside class="note-rail" aria-label="Note metadata">
			<a class="source-link" href="/blog">← Notes</a>
			<dl>
				<div>
					<dt>Document</dt>
					<dd>Note</dd>
				</div>
				{#if data.post.publishedAt}
					<div>
						<dt>Date</dt>
						<dd>{data.post.publishedAt}</dd>
					</div>
				{/if}
				<div>
					<dt>Reading time</dt>
					<dd>{readTime}</dd>
				</div>
				{#if data.post.tags}
					<div>
						<dt>Topics</dt>
						<dd>{data.post.tags}</dd>
					</div>
				{/if}
			</dl>
		</aside>

		<article class="note-body">
			<header>
				<p class="system-label">Technical note</p>
				<h1>{data.post.title}</h1>
				{#if data.post.excerpt}<p class="inspection-summary">{data.post.excerpt}</p>{/if}
			</header>

			<div class="inspection-section mt-10">
				{#if data.post.content}
					<MarkdownContent source={data.post.content} className="blog-markdown" />
				{:else if data.post.excerpt}
					<MarkdownContent source={data.post.excerpt} className="blog-markdown" />
				{:else}
					<div class="text-base text-ink-200">No content yet.</div>
				{/if}
			</div>

			{#if data.post.references.length}
				<section class="inspection-section" aria-labelledby="post-references-heading">
					<p class="system-label">Source index</p>
					<h2 id="post-references-heading" class="!text-2xl">References</h2>
					<ol class="inspection-subsystems">
						{#each data.post.references as reference, index}
							<li>
								<span>{String(index + 1).padStart(2, '0')}</span>
								<span>
									<a
										class="inspection-link"
										href={reference.url}
										target="_blank"
										rel="noreferrer noopener"
									>
										{reference.label} <span aria-hidden="true">↗</span>
									</a>
									{#if reference.note}<p class="mt-2 text-sm leading-6">{reference.note}</p>{/if}
								</span>
							</li>
						{/each}
					</ol>
				</section>
			{/if}
		</article>
	</div>
</section>
