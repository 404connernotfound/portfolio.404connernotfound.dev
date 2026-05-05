<script lang="ts">
	import { page } from '$app/stores';
	export let githubUrl: string;

	const links = [
		{ label: 'Work', href: '/work' },
		{ label: 'Resume', href: '/resume' },
		{ label: 'Contact', href: '/contact' },
	];

	const isActive = (href: string) => {
		const pathname = $page.url.pathname;
		if (href === '/') return pathname === '/';
		return pathname.startsWith(href);
	};
</script>

<header class="relative z-20 px-6 pb-4 pt-8 sm:px-10 lg:px-16">
	<div
		class="site-nav-shell flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-soft backdrop-blur-lg md:flex-row md:items-center md:justify-between"
	>
		<a href="/" class="text-xl font-semibold uppercase tracking-[0.18em] text-white">
			404connernotfound
		</a>
		<nav
			class="flex flex-wrap gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-ink-200"
			aria-label="Primary"
		>
			{#each links as link}
				<a
					class="nav-pill"
					class:nav-pill-active={isActive(link.href)}
					href={link.href}
					aria-current={isActive(link.href) ? 'page' : undefined}
				>
					{link.label}
				</a>
			{/each}
		</nav>
		<div class="flex flex-wrap gap-3">
			<a
				class="nav-pill border-ink-100/70 bg-ink-900 text-white hover:border-ink-100"
				href={githubUrl}
				target="_blank"
				rel="noreferrer noopener"
				aria-label="GitHub (opens in a new tab)"
			>
				GitHub
			</a>
		</div>
	</div>
</header>
