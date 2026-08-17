<script lang="ts">
	import { createEventDispatcher, onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';

	export let open = false;
	export let title = 'Modal';
	export let description = '';
	export let maxWidthClass = 'max-w-4xl';

	const dispatch = createEventDispatcher<{ close: void }>();
	let dialog: HTMLDivElement | null = null;
	let previousFocus: HTMLElement | null = null;
	let previousOverflow = '';
	let wasOpen = false;

	const close = () => {
		dispatch('close');
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (open && event.key === 'Escape') {
			event.preventDefault();
			close();
		}
		if (!open || event.key !== 'Tab' || !dialog) return;
		const focusable = Array.from(
			dialog.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
			),
		).filter((element) => !element.hasAttribute('hidden'));
		if (!focusable.length) {
			event.preventDefault();
			dialog.focus();
			return;
		}
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	};

	$: if (browser && open !== wasOpen) {
		wasOpen = open;
		if (open) {
			previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
			previousOverflow = document.body.style.overflow;
			document.body.style.overflow = 'hidden';
			void tick().then(() => dialog?.focus());
		} else {
			document.body.style.overflow = previousOverflow;
			previousFocus?.focus();
			previousFocus = null;
		}
	}

	onDestroy(() => {
		if (!browser) return;
		document.body.style.overflow = previousOverflow;
		previousFocus?.focus();
	});
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/80 px-4 py-8 backdrop-blur-sm sm:py-12"
		role="presentation"
		on:click={close}
	>
		<div
			bind:this={dialog}
			class={`glass w-full ${maxWidthClass} border border-ink-200/40 p-6 sm:p-8`}
			role="dialog"
			aria-modal="true"
			aria-label={title}
			tabindex="-1"
			on:click|stopPropagation
			on:keydown|stopPropagation={() => {}}
		>
			<div class="flex items-start justify-between gap-4">
				<div class="space-y-1">
					<h2 class="text-2xl font-semibold text-white">{title}</h2>
					{#if description}
						<p class="text-sm text-ink-200">{description}</p>
					{/if}
				</div>
				<button class="nav-pill" type="button" on:click={close}>Close</button>
			</div>
			<div class="mt-6">
				<slot />
			</div>
		</div>
	</div>
{/if}
