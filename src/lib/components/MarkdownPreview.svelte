<script lang="ts">
	import MarkdownContent from './MarkdownContent.svelte';

	export let source: string;
	export let label: string;
	let open = false;
</script>

<p class="mt-2 text-xs leading-6 text-ink-200">
	Markdown and LaTeX supported. Use <code>{'$E = mc^2$'}</code> inline or
	<code>{'$$\\sum_{n=1}^{10} n$$'}</code> for a display equation.
</p>
<details bind:open class="mt-3 min-w-0 rounded-2xl border border-ink-200/30 bg-ink-950/50 p-4">
	<summary class="cursor-pointer text-sm font-semibold text-ink-200">{label} preview</summary>
	{#if open}
		<div class="mt-4">
			{#if source.trim()}
				<MarkdownContent {source} />
			{:else}
				<p class="text-sm text-ink-300">Start writing to preview Markdown and equations.</p>
			{/if}
		</div>
	{/if}
</details>
