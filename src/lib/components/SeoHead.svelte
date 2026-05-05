<script lang="ts">
	import { page } from '$app/stores';
	import { siteName } from '$lib/utils/seo';

	export let title: string;
	export let description: string;
	export let type: 'website' | 'article' = 'website';
	export let image = '';
	export let imageAlt = `${siteName} preview`;
	export let noindex = false;

	$: canonical = `${$page.url.origin}${$page.url.pathname}`;
	$: imageUrl = image ? new URL(image, $page.url.origin).toString() : '';
	$: robots =
		noindex || $page.url.pathname.startsWith('/admin') ? 'noindex, nofollow' : 'index, follow';
	$: twitterCard = image ? 'summary_large_image' : 'summary';
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />
	<meta name="robots" content={robots} />

	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content={type} />
	<meta property="og:url" content={canonical} />
	<meta property="og:site_name" content={siteName} />
	{#if imageUrl}
		<meta property="og:image" content={imageUrl} />
		<meta property="og:image:alt" content={imageAlt} />
	{/if}
	<meta property="og:locale" content="en_US" />

	<meta name="twitter:card" content={twitterCard} />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	{#if imageUrl}
		<meta name="twitter:image" content={imageUrl} />
		<meta name="twitter:image:alt" content={imageAlt} />
	{/if}
</svelte:head>
