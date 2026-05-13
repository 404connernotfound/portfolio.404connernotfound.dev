<script lang="ts">
	import { page } from '$app/stores';

	const links = [
		{ label: 'Dashboard', href: '/admin' },
		{ label: 'Site', href: '/admin/site' },
		{ label: 'About', href: '/admin/about' },
		{ label: 'Stack', href: '/admin/stack' },
		{ label: 'Work', href: '/admin/work' },
		{ label: 'Blog', href: '/admin/blog' },
		{ label: 'Contact', href: '/admin/contact' },
		{ label: 'Errors', href: '/admin/errors' },
		{ label: 'Footer', href: '/admin/footer' },
		{ label: 'Tracking', href: '/admin/tracking' },
		{ label: 'Resume', href: '/admin/resume' }
	];

	const isActive = (href: string) => {
		const pathname = $page.url.pathname;
		if (href === '/admin') return pathname === '/admin';
		return pathname.startsWith(href);
	};
</script>

<nav class="flex flex-wrap gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-ink-200">
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
