<script lang="ts">
	import MetadataGrid from '$lib/components/MetadataGrid.svelte';
	import ProjectIndexItem from '$lib/components/ProjectIndexItem.svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import SystemTopology from '$lib/components/SystemTopology.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<SeoHead title={formatTitle('Work')} description={data.siteSettings.workIntro} />

<section class="section-pad">
	<div class="inspection-shell">
		<div>
			<p class="system-label">Project index</p>
			<h1 class="inspection-title">{data.siteSettings.workTitle}</h1>
			<p class="inspection-summary">{data.siteSettings.workIntro}</p>
		</div>
		<aside class="inspection-side">
			<MetadataGrid
				items={[
					{ label: 'Range', value: 'Languages to infrastructure' },
					{ label: 'Method', value: 'Inspectable decisions' },
					{ label: 'Standard', value: 'Working software' },
				]}
				label="What the work proves"
			/>
		</aside>
	</div>
</section>

{#if data.workItems.length}
	<section class="section-pad pt-0">
		<SystemTopology items={data.workItems} title="Technical range" />
	</section>

	<section class="section-pad pt-0" aria-label="Project index">
		<div class="systems-index">
			{#each data.workItems as project, index}
				<ProjectIndexItem {project} {index} />
			{/each}
		</div>
	</section>
{:else}
	<section class="section-pad">
		<div class="glass p-8 text-sm text-ink-200">No projects have been indexed yet.</div>
	</section>
{/if}
