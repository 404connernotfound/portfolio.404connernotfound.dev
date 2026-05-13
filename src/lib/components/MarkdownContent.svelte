<script lang="ts">
	import { renderMarkdown } from '$lib/utils/content';

	export let source: string | null | undefined;
	export let className = '';
</script>

<div class={`markdown-content ${className}`}>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- renderMarkdown escapes raw HTML and only emits controlled Markdown tags. -->
	{@html renderMarkdown(source)}
</div>
