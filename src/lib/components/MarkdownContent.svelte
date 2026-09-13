<script lang="ts">
	import 'katex/dist/katex.min.css';
	import { renderMarkdown } from '$lib/utils/content';

	export let source: string | null | undefined;
	export let className = '';
</script>

<div class={`markdown-content ${className}`}>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- Raw HTML is escaped; math uses KaTeX with trust disabled. -->
	{@html renderMarkdown(source)}
</div>
