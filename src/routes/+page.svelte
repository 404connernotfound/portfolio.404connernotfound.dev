<script lang="ts">
	import ProjectIndexItem from '$lib/components/ProjectIndexItem.svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import SystemTopology from '$lib/components/SystemTopology.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<SeoHead
	title={formatTitle('Home')}
	description={data.siteSettings.heroSubheadline || data.siteSettings.heroHeadline}
/>

<section class="section-pad home-hero">
	<div class="home-intro-grid">
		<div>
			<p class="system-label">404 / Conner Adams / Systems engineer</p>
			<h1 class="home-system-claim">I build systems where the abstraction stops.</h1>
			<p class="hero-description">{data.siteSettings.heroSubheadline}</p>
			<div class="hero-actions">
				<a class="nav-pill cta-primary" href="/work">Inspect systems</a>
				<a class="link-underline" href="/resume">View résumé</a>
			</div>
		</div>
		<aside class="home-intro-aside" aria-label="Engineering focus">
			<p class="system-label">Current interface</p>
			<p>{data.siteSettings.heroHeadline}</p>
		</aside>
	</div>
</section>

{#if data.featuredWork.length}
	<section class="section-pad">
		<SystemTopology items={data.featuredWork} title="Systems under inspection" />
	</section>

	<section class="section-pad" aria-labelledby="selected-systems-title">
		<div class="section-heading-row">
			<div>
				<p class="system-label">Evidence / selected systems</p>
				<h2 id="selected-systems-title">The work is the proof.</h2>
			</div>
			<a class="inspection-link" href="/work"
				>Open systems index <span aria-hidden="true">→</span></a
			>
		</div>
		<div class="systems-index">
			{#each data.featuredWork.slice(0, 2) as project, index}
				<ProjectIndexItem {project} {index} />
			{/each}
		</div>
	</section>
{/if}

<section class="section-pad">
	<div class="evidence-grid">
		<div class="evidence-panel">
			<p class="system-label">Current technical focus</p>
			<h2>{data.siteSettings.focusHeadline}</h2>
			<p>{data.siteSettings.focusBody}</p>
			<a class="inspection-link mt-6" href="/about"
				>Engineering approach <span aria-hidden="true">→</span></a
			>
		</div>
		<div class="evidence-panel">
			<p class="system-label">Latest note</p>
			{#if data.latestNote}
				<p class="note-index-date mt-4">
					{data.latestNote.publishedAt || data.latestNote.createdAt}
				</p>
				<h2 class="!text-3xl">{data.latestNote.title}</h2>
				{#if data.latestNote.excerpt}<p>{data.latestNote.excerpt}</p>{/if}
				<a class="inspection-link mt-6" href={`/blog/${data.latestNote.slug}`}>
					Read note <span aria-hidden="true">→</span>
				</a>
			{:else}
				<h2 class="!text-3xl">Notes are being indexed.</h2>
				<p>Long-form technical writing will appear here when published.</p>
			{/if}
		</div>
	</div>
</section>
