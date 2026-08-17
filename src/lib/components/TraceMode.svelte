<script lang="ts">
	export let steps: string[] = [];
	export let title = 'Execution trace';

	let enabled = true;
	let activeIndex = 0;

	const setActive = (index: number) => {
		if (enabled) activeIndex = index;
	};
</script>

<section class:trace-disabled={!enabled} class="trace-mode" aria-labelledby="trace-mode-title">
	<header class="trace-mode-header">
		<div>
			<p class="system-label">Trace mode</p>
			<h2 id="trace-mode-title">{title}</h2>
		</div>
		<button
			class="trace-toggle"
			type="button"
			aria-pressed={enabled}
			on:click={() => (enabled = !enabled)}
		>
			{enabled ? 'Disable trace' : 'Enable trace'}
		</button>
	</header>

	<ol class="trace-steps">
		{#each steps as step, index}
			<li
				class:trace-step-active={enabled && activeIndex === index}
				class:trace-step-complete={enabled && index < activeIndex}
				class="trace-step"
			>
				<button
					type="button"
					on:mouseenter={() => setActive(index)}
					on:focus={() => setActive(index)}
					on:click={() => setActive(index)}
					aria-current={enabled && activeIndex === index ? 'step' : undefined}
				>
					<span class="trace-step-number">{String(index + 1).padStart(2, '0')}</span>
					<span class="trace-step-name">{step}</span>
				</button>
			</li>
		{/each}
	</ol>
</section>
