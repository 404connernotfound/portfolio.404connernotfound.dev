<script lang="ts">
	import MetadataGrid from '$lib/components/MetadataGrid.svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<SeoHead title={formatTitle('About')} description={data.siteSettings.aboutBody} />

<section class="section-pad">
	<div class="inspection-shell">
		<div>
			<p class="system-label">About / Conner Adams</p>
			<h1 class="inspection-title">{data.siteSettings.aboutHeadline}</h1>
			<p class="inspection-summary">{data.siteSettings.aboutBody}</p>
		</div>
		<aside class="inspection-side">
			<MetadataGrid
				items={data.stackItems.slice(0, 4).map((item) => ({
					label: item.category || 'Interest',
					value: item.label,
				}))}
				label="Current technical interests"
			/>
		</aside>
	</div>
</section>

<section class="section-pad pt-0">
	<div class="evidence-grid">
		<div class="evidence-panel">
			<p class="system-label">Engineering approach</p>
			<h2>Make the constraints visible.</h2>
			<p>
				I prefer designs whose state, boundaries, and failure modes can be inspected. Correctness
				comes from making assumptions explicit; performance work starts with the actual execution
				path; and simplicity means removing machinery that is not earning its place.
			</p>
		</div>
		<div class="evidence-panel">
			<p class="system-label">Current focus</p>
			<h2 class="!text-3xl">{data.siteSettings.focusHeadline}</h2>
			<p>{data.siteSettings.focusBody}</p>
		</div>
	</div>
</section>

{#if data.stackItems.length}
	<section class="section-pad pt-0" aria-labelledby="working-set-title">
		<div class="section-heading-row">
			<div>
				<p class="system-label">Maintained working set</p>
				<h2 id="working-set-title">{data.siteSettings.stackTitle}</h2>
			</div>
			<p class="max-w-lg text-sm leading-6 text-ink-400">{data.siteSettings.stackIntro}</p>
		</div>
		<ol class="capability-list mt-10">
			{#each data.stackItems as item, index}
				<li class="capability-row">
					<span class="capability-index">{String(index + 1).padStart(2, '0')}</span>
					<h3>{item.label}</h3>
					<p>{item.detail || 'Maintained technical interest.'}</p>
				</li>
			{/each}
		</ol>
		<a class="inspection-link mt-10" href="/contact"
			>Establish a connection <span aria-hidden="true">→</span></a
		>
	</section>
{/if}
