<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import SiteNav from '$lib/components/SiteNav.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import { trackPageview } from '$lib/utils/tracking';
	import type { LayoutData } from './$types';

	let { children, data } = $props<{ data: LayoutData }>();
	let scrollProgress = $state(0);
	let reduceMotion = $state(false);

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
		fallback.textContent =
			target.dataset.imageFallbackText || target.alt || 'Image unavailable';
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

<div class="pointer-events-none fixed inset-0 z-0 overflow-hidden">
	<div class="aurora-grid"></div>
	<div
		class="ambient-float-slow absolute -top-40 left-0 h-72 w-72 rounded-full bg-aurora-400/50 blur-[100px] sm:h-96 sm:w-96 sm:blur-[140px]"
	></div>
	<div
		class="ambient-float-medium absolute top-32 right-10 h-80 w-80 rounded-full bg-signal-500/40 blur-[120px] sm:h-[28rem] sm:w-[28rem] sm:blur-[160px]"
	></div>
	<div
		class="ambient-float-fast absolute bottom-[-12rem] left-1/3 h-[26rem] w-[26rem] rounded-full bg-aurora-200/35 blur-[140px] sm:h-[32rem] sm:w-[32rem] sm:blur-[180px]"
	></div>
</div>
<div class="noise-layer fixed inset-0 z-0 opacity-60"></div>

<div class="relative z-10 flex min-h-screen flex-col">
	<SiteNav githubUrl={data.siteSettings.githubUrl} />
	<main id="main-content" class="flex-1" tabindex="-1">{@render children()}</main>
	<SiteFooter
		footerLinks={data.footerLinks}
		currentYear={data.currentYear}
		footerBadge={data.siteSettings.footerBadge}
		footerHeadline={data.siteSettings.footerHeadline}
		footerBody={data.siteSettings.footerBody}
		footerCtaLabel={data.siteSettings.footerCtaLabel}
		footerCtaHref={data.siteSettings.footerCtaHref}
	/>
</div>
