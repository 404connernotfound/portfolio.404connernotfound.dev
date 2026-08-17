<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import SiteNav from '$lib/components/SiteNav.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import { trackPageview } from '$lib/utils/tracking';
	import type { LayoutData } from './$types';

	let { children, data } = $props<{ data: LayoutData }>();
	let scrollProgress = $state(0);
	let reduceMotion = $state(false);
	let isAdminSurface = $derived($page.url.pathname.startsWith('/admin'));

	const shouldTrack = (pathname: string) => !pathname.startsWith('/admin');
	const updateScrollProgress = () => {
		const max = document.documentElement.scrollHeight - window.innerHeight;
		scrollProgress = max <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / max));
	};

	const handleImageError = (event: Event) => {
		const target = event.target;
		if (!(target instanceof HTMLImageElement)) return;
		if (target.dataset.imageFallback !== '1') return;
		if (target.dataset.imageFallbackApplied === '1') return;
		target.dataset.imageFallbackApplied = '1';
		const fallback = document.createElement('span');
		fallback.className = 'image-fallback';
		fallback.textContent = target.dataset.imageFallbackText || target.alt || 'Image unavailable';
		target.replaceWith(fallback);
	};

	onMount(() => {
		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		const updateMotionPreference = () => {
			reduceMotion = media.matches;
		};

		updateMotionPreference();
		updateScrollProgress();
		window.addEventListener('scroll', updateScrollProgress, { passive: true });
		window.addEventListener('resize', updateScrollProgress);
		window.addEventListener('error', handleImageError, true);
		media.addEventListener('change', updateMotionPreference);

		afterNavigate(({ to }) => {
			if (!to) return;
			requestAnimationFrame(updateScrollProgress);
			if (!shouldTrack(to.url.pathname)) return;
			trackPageview(`${to.url.pathname}${to.url.search}`);
		});

		return () => {
			window.removeEventListener('scroll', updateScrollProgress);
			window.removeEventListener('resize', updateScrollProgress);
			window.removeEventListener('error', handleImageError, true);
			media.removeEventListener('change', updateMotionPreference);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
</svelte:head>

<a class="skip-link" href="#main-content">Skip to content</a>

<div
	class="scroll-progress"
	class:scroll-progress-static={reduceMotion}
	style={`transform: scaleX(${scrollProgress});`}
></div>

<div class="site-backdrop" aria-hidden="true"></div>

<div class="relative z-10 flex min-h-screen flex-col">
	{#if isAdminSurface}
		<header class="admin-shell-header">
			<a class="admin-shell-brand" href="/admin"><span>404</span> / Control</a>
			<div class="admin-shell-context">
				<span>Portfolio administration</span>
				<a href="/">View public site ↗</a>
			</div>
		</header>
		<main id="main-content" class="admin-surface flex-1" tabindex="-1">{@render children()}</main>
	{:else}
		<SiteNav githubUrl={data.siteSettings.githubUrl} />
		<main id="main-content" class="flex-1" tabindex="-1">{@render children()}</main>
		<SiteFooter
			footerLinks={data.footerLinks}
			currentYear={data.currentYear}
			footerBadge={data.siteSettings.footerBadge}
			footerCtaLabel={data.siteSettings.footerCtaLabel}
			footerCtaHref={data.siteSettings.footerCtaHref}
		/>
	{/if}
</div>
