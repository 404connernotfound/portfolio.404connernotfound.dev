<script lang="ts">
	export let src: string;
	export let alt = '';
	export let className = '';
	export let width: number | string | undefined = undefined;
	export let height: number | string | undefined = undefined;
	export let loading: 'lazy' | 'eager' = 'lazy';

	let failed = false;

	$: if (src) failed = false;

	const handleError = () => {
		failed = true;
	};
</script>

{#if failed}
	<slot name="fallback">
		<span class="image-fallback">{alt || 'Image unavailable'}</span>
	</slot>
{:else}
	<img
		{src}
		{alt}
		{width}
		{height}
		{loading}
		class={className}
		referrerpolicy="no-referrer"
		on:error={handleError}
	/>
{/if}
