<script lang="ts">
	export let state: string | null | undefined = null;
	export let compact = false;

	$: normalized = state?.trim().toUpperCase() || 'NOT SPECIFIED';
	$: tone = ['ACTIVE', 'MAINTAINED'].includes(normalized)
		? 'active'
		: normalized === 'EXPERIMENT'
			? 'experiment'
			: ['RETIRED', 'ARCHIVED'].includes(normalized)
				? 'inactive'
				: 'neutral';
</script>

<span class:status-compact={compact} class={`status-indicator status-${tone}`}>
	<span class="status-mark" aria-hidden="true"></span>
	<span>{normalized}</span>
</span>
