<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	export let delay = 0;
	export let y = 16;
	export let x = 0;
	export let scale = 0.99;
	export let blur = 0;
	export let duration = 0.7;
	export let className = '';
	export let once = true;
	export let threshold = 0.18;
	export let rootMargin = '0px 0px -8% 0px';

	let prefersReducedMotion = false;
	let isReady = false;
	let isVisible = true;
	let container: HTMLDivElement | null = null;

	const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

	$: safeDelay = Math.max(0, delay);
	$: safeDuration = Math.max(0, duration);
	$: safeThreshold = clamp(threshold, 0, 1);
	$: isAdminSurface = $page.url.pathname.startsWith('/admin');

	onMount(() => {
		const media = window.matchMedia('(prefers-reduced-motion: reduce)');

		const update = () => {
			prefersReducedMotion = media.matches;
			if (prefersReducedMotion) {
				isReady = false;
				isVisible = true;
			}
		};

		update();

		media.addEventListener('change', update);

		if (prefersReducedMotion || isAdminSurface || !container) {
			return () => media.removeEventListener('change', update);
		}

		const rect = container.getBoundingClientRect();
		const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
		const revealLine = viewportHeight * (1 - safeThreshold);
		isVisible = rect.top <= revealLine;
		isReady = true;

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.target !== container) continue;
					if (entry.isIntersecting) {
						isVisible = true;
						if (once) {
							observer.unobserve(entry.target);
						}
					} else if (!once) {
						isVisible = false;
					}
				}
			},
			{
				threshold: safeThreshold,
				rootMargin,
			},
		);

		observer.observe(container);

		return () => {
			observer.disconnect();
			media.removeEventListener('change', update);
		};
	});
</script>

<div
	bind:this={container}
	class={`motion-reveal ${isReady ? 'motion-reveal-enabled' : ''} ${isVisible ? 'motion-reveal-visible' : ''} ${className}`}
	style={`--motion-delay: ${safeDelay}s; --motion-duration: ${safeDuration}s; --motion-y: ${y}px; --motion-x: ${x}px; --motion-scale: ${scale}; --motion-blur: ${blur}px;`}
>
	<slot />
</div>

<style>
	.motion-reveal {
		opacity: 1;
		transform: translate3d(0, 0, 0) scale(1);
		filter: blur(0);
	}

	.motion-reveal-enabled {
		will-change: transform, opacity, filter;
		transition-property: transform, opacity, filter;
		transition-duration: var(--motion-duration, 0.6s);
		transition-delay: var(--motion-delay, 0s);
		transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
	}

	.motion-reveal-enabled:not(.motion-reveal-visible) {
		opacity: 0;
		transform: translate3d(var(--motion-x, 0px), var(--motion-y, 16px), 0)
			scale(var(--motion-scale, 0.99));
		filter: blur(var(--motion-blur, 0px));
	}

	@media (prefers-reduced-motion: reduce) {
		.motion-reveal,
		.motion-reveal-enabled,
		.motion-reveal-enabled:not(.motion-reveal-visible) {
			opacity: 1;
			transform: none;
			filter: none;
			transition: none;
		}
	}
</style>
