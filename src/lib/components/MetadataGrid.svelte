<script lang="ts">
	export let items: { label: string; value: string | null | undefined }[] = [];
	export let label = 'System metadata';

	$: visibleItems = items.filter((item) => Boolean(item.value?.trim()));
</script>

{#if visibleItems.length}
	<dl class="metadata-grid" aria-label={label}>
		{#each visibleItems as item}
			<div class="metadata-cell">
				<dt>{item.label}</dt>
				<dd>{item.value}</dd>
			</div>
		{/each}
	</dl>
{/if}
