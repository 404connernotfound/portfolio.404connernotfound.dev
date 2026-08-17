<script lang="ts">
	import MetadataGrid from '$lib/components/MetadataGrid.svelte';
	import StatusIndicator from '$lib/components/StatusIndicator.svelte';
	import type { WorkItem } from '$lib/server/db';
	import { parseLineList, workItemPath } from '$lib/utils/content';

	export let project: WorkItem;
	export let index = 0;

	$: subsystems = parseLineList(project.subsystems);
</script>

<article class="system-index-item">
	<div class="system-index-rail" aria-hidden="true">
		<span>{String(index + 1).padStart(2, '0')}</span>
	</div>
	<div class="system-index-main">
		<header class="system-index-header">
			<div>
				<p class="system-label">{project.domain || project.role || 'System'}</p>
				<h2><a href={workItemPath(project)}>{project.title}</a></h2>
			</div>
			<StatusIndicator state={project.lifecycle} />
		</header>

		<p class="system-index-description">{project.description}</p>

		<MetadataGrid
			items={[
				{ label: 'Type', value: project.role },
				{ label: 'Implementation', value: project.tech },
				{ label: 'Owner', value: project.owner },
				{ label: 'Version', value: project.version },
			]}
			label={`${project.title} metadata`}
		/>

		{#if subsystems.length}
			<div class="subsystem-list" aria-label={`${project.title} subsystems`}>
				<span class="system-label">Subsystems</span>
				<ul>
					{#each subsystems as subsystem}
						<li>{subsystem}</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="system-index-actions">
			<a class="inspection-link" href={workItemPath(project)}
				>Inspect system <span aria-hidden="true">→</span></a
			>
			{#if project.link}
				<a
					class="source-link"
					href={project.link}
					target="_blank"
					rel="noreferrer noopener"
					aria-label={`${project.title} source repository (opens in a new tab)`}
				>
					Source ↗
				</a>
			{/if}
		</div>
	</div>
</article>
