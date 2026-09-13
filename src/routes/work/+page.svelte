<script lang="ts">
	import MetadataGrid from '$lib/components/MetadataGrid.svelte';
	import ProjectIndexItem from '$lib/components/ProjectIndexItem.svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import SystemTopology from '$lib/components/SystemTopology.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<SeoHead
	title={formatTitle('Work')}
	description="Inspect the technical decisions, constraints, and working systems behind Conner Adams' software projects."
/>

<section class="section-pad">
	<div class="inspection-shell">
		<div>
			<p class="system-label">Evidence / Project index</p>
			<h1 class="inspection-title">Work that makes the judgment visible.</h1>
			<p class="inspection-summary">
				These are not screenshots arranged to look impressive. They are inspectable examples of how
				I frame constraints, make technical decisions, and turn difficult systems into working
				software.
			</p>
		</div>
		<aside class="inspection-side">
			<MetadataGrid
				items={[
					{ label: 'Look for', value: 'Decisions, not decoration' },
					{ label: 'Evidence', value: 'Constraints made explicit' },
					{ label: 'Standard', value: 'Software that works' },
				]}
				label="How to read the work"
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
