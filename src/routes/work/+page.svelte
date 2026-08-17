<script lang="ts">
	import ProjectIndexItem from '$lib/components/ProjectIndexItem.svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import StatusIndicator from '$lib/components/StatusIndicator.svelte';
	import SystemTopology from '$lib/components/SystemTopology.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<SeoHead title={formatTitle('Systems')} description={data.siteSettings.workIntro} />

<section class="section-pad">
	<div class="inspection-shell">
		<div>
			<p class="system-label">Systems index</p>
			<h1 class="inspection-title">{data.siteSettings.workTitle}</h1>
			<p class="inspection-summary">{data.siteSettings.workIntro}</p>
		</div>
		<aside class="inspection-side">
			<p class="system-label">Lifecycle semantics</p>
			<div class="mt-4 flex flex-col gap-3">
				<StatusIndicator state="ACTIVE" compact />
				<StatusIndicator state="EXPERIMENT" compact />
				<StatusIndicator state="ARCHIVED" compact />
			</div>
			<p class="mt-5 text-xs leading-5 text-ink-500">
				Lifecycle appears only when it is explicitly maintained. “Not specified” is intentional, not
				an activity claim.
			</p>
		</aside>
	</div>
</section>

{#if data.workItems.length}
	<section class="section-pad pt-0">
		<SystemTopology items={data.workItems} title="Domain relationships" />
	</section>

	<section class="section-pad pt-0" aria-label="Project systems index">
		<div class="systems-index">
			{#each data.workItems as project, index}
				<ProjectIndexItem {project} {index} />
			{/each}
		</div>
	</section>
{:else}
	<section class="section-pad">
		<div class="glass p-8 text-sm text-ink-200">No systems have been indexed yet.</div>
	</section>
{/if}
