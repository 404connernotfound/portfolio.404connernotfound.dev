<script lang="ts">
	import { page } from '$app/stores';
	export let githubUrl: string;

	const links = [
		{ label: 'Systems', href: '/work' },
		{ label: 'Notes', href: '/blog' },
		{ label: 'About', href: '/about' },
		{ label: 'Resume', href: '/resume' },
		{ label: 'Contact', href: '/contact' },
	];

	const isActive = (href: string) => {
		const pathname = $page.url.pathname;
		if (href === '/') return pathname === '/';
		return pathname.startsWith(href);
	};
</script>

<header class="site-header">
	<div class="site-nav-shell">
		<a href="/" class="site-brand" aria-label="404connernotfound home">
			<span class="brand-monogram" aria-hidden="true">404</span>
			<span class="brand-name">Conner Adams</span>
		</a>
		<nav class="site-links" aria-label="Primary">
			{#each links as link}
				<a
					class="site-link"
					class:site-link-active={isActive(link.href)}
					href={link.href}
					aria-current={isActive(link.href) ? 'page' : undefined}
				>
					{link.label}
				</a>
			{/each}
		</nav>
		<a
			class="site-external"
			href={githubUrl}
			target="_blank"
			rel="noreferrer noopener"
			aria-label="GitHub (opens in a new tab)"
		>
			Source <span aria-hidden="true">↗</span>
		</a>
	</div>
</header>
