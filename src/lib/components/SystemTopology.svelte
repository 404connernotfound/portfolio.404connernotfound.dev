<script lang="ts">
	import { workItemPath } from '$lib/utils/content';
	import type { WorkItem } from '$lib/server/db';

	export let items: WorkItem[] = [];
	export let title = 'Living systems';

	let activeId: number | null = null;
	$: visibleItems = items.slice(0, 5);
	$: if (activeId === null && visibleItems.length) activeId = visibleItems[0].id;
</script>

<section class="topology" aria-labelledby="topology-title">
	<header class="topology-header">
		<div>
			<p class="system-label">Topology / indexed systems</p>
			<h2 id="topology-title">{title}</h2>
		</div>
		<p class="topology-help">Focus a system to inspect its active path.</p>
	</header>

	<div class="topology-bus" aria-hidden="true">
		<span>DOMAIN BUS</span>
	</div>

	<ul class="topology-list">
		{#each visibleItems as item, index}
			<li class:topology-row-active={activeId === item.id} class="topology-row">
				<div class="topology-domain">
					<span class="topology-index">{String(index + 1).padStart(2, '0')}</span>
					<span>{item.domain || item.role || 'Domain not specified'}</span>
				</div>
				<div class="topology-trace" aria-hidden="true">
					<span class="topology-signal"></span>
				</div>
				<a
					class="topology-node"
					href={workItemPath(item)}
					on:mouseenter={() => (activeId = item.id)}
					on:focus={() => (activeId = item.id)}
				>
					<span class="topology-port" aria-hidden="true"></span>
					<span>
						<strong>{item.title}</strong>
						<small>{item.tech || 'Implementation not specified'}</small>
					</span>
					<span class="topology-arrow" aria-hidden="true">↗</span>
				</a>
			</li>
		{/each}
	</ul>

	<p class="sr-only">
		The topology lists each project beside its maintained domain and implementation metadata. Every
		project can be opened as a normal text-based detail page.
	</p>
</section>
