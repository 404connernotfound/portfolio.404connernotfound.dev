<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import type { ActionData } from './$types';

	export let form: ActionData | undefined;
	let rating = Number(form?.fields?.rating ?? 0);
</script>

<SeoHead
	title={formatTitle('Leave a review')}
	description="Share feedback about working with Conner Adams."
/>

<main class="review-page">
	<section class="review-intro">
		<div>
			<p class="review-kicker">Client feedback</p>
			<h1>A useful note for the next person.</h1>
		</div>
		<p>
			If we’ve worked together, I’d value the honest version: what the problem was, how the work
			felt, and what changed afterward. Every submission is reviewed before it appears publicly.
		</p>
	</section>

	{#if form?.success}
		<section class="review-success" role="status">
			<p class="review-kicker">Received</p>
			<h2>Thank you for taking the time.</h2>
			<p>Your review is saved and waiting for moderation. Nothing is published automatically.</p>
			<a href="/">Return home <span aria-hidden="true">↗</span></a>
		</section>
	{:else}
		<form class="review-form" method="POST" action="?/submit">
			<div class="honeypot" aria-hidden="true">
				<label for="website">Website</label><input
					id="website"
					name="website"
					tabindex="-1"
					autocomplete="off"
				/>
			</div>
			<fieldset>
				<legend>Your rating *</legend>
				<div class="rating-options">
					{#each [1, 2, 3, 4, 5] as value}
						<label class:active={rating === value}>
							<input bind:group={rating} type="radio" name="rating" {value} required />
							<span aria-hidden="true">★</span>
							<small>{value} star{value === 1 ? '' : 's'}</small>
						</label>
					{/each}
				</div>
			</fieldset>
			<div class="review-fields">
				<label
					><span>Name *</span><input
						name="name"
						required
						maxlength="120"
						autocomplete="name"
						value={form?.fields?.name ?? ''}
					/></label
				>
				<label
					><span>Company / organization</span><input
						name="company"
						maxlength="180"
						autocomplete="organization"
						value={form?.fields?.company ?? ''}
					/></label
				>
				<label class="wide"
					><span>Project</span><input
						name="project"
						maxlength="180"
						value={form?.fields?.project ?? ''}
						placeholder="What did we work on?"
					/></label
				>
				<label class="wide"
					><span>Your review *</span><textarea
						name="review"
						required
						minlength="20"
						maxlength="2000"
						rows="7"
						placeholder="What would be most useful for a future client to know?"
						>{form?.fields?.quote ?? ''}</textarea
					></label
				>
			</div>
			<div class="review-submit">
				<div aria-live="polite">
					{#if form?.message}<p class="form-message">{form.message}</p>{/if}
					<p>Reviews are stored privately until approved.</p>
				</div>
				<button type="submit">Submit for review <span aria-hidden="true">↗</span></button>
			</div>
		</form>
	{/if}
</main>

<style>
	.review-page {
		width: min(100%, 90rem);
		margin: 0 auto;
		padding: clamp(3rem, 7vw, 7rem) clamp(1.25rem, 5vw, 4rem) clamp(7rem, 12vw, 12rem);
	}
	.review-intro {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(18rem, 0.5fr);
		gap: clamp(3rem, 8vw, 8rem);
		align-items: end;
		border-top: 1px solid var(--line-strong);
		padding-top: 1rem;
	}
	.review-kicker,
	legend,
	.review-fields span {
		font:
			650 0.65rem ui-monospace,
			monospace;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--signal-bright);
	}
	.review-kicker {
		margin: 0;
	}
	h1 {
		max-width: 10ch;
		margin: clamp(3rem, 7vw, 7rem) 0 0;
		font-size: clamp(4rem, 9vw, 9rem);
		font-weight: 580;
		line-height: 0.88;
		letter-spacing: -0.08em;
	}
	.review-intro > p {
		margin: 0;
		font-size: 1.08rem;
		line-height: 1.7;
		color: var(--ink-soft);
	}
	.review-form {
		max-width: 64rem;
		margin: clamp(6rem, 12vw, 12rem) 0 0 auto;
		border-top: 1px solid var(--line-strong);
		padding-top: 2rem;
	}
	fieldset {
		margin: 0;
		border: 0;
		padding: 0;
	}
	legend {
		margin-bottom: 1rem;
	}
	.rating-options {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 0.6rem;
	}
	.rating-options label {
		display: grid;
		place-items: center;
		min-height: 6.5rem;
		border: 1px solid var(--line);
		border-radius: 0.8rem;
		cursor: pointer;
		color: var(--ink-faint);
		transition:
			transform var(--motion-fast),
			border-color var(--motion-fast),
			background var(--motion-fast);
	}
	.rating-options label:hover {
		transform: translateY(-2px);
		border-color: var(--signal);
	}
	.rating-options label.active {
		border-color: var(--signal);
		background: rgba(73, 103, 255, 0.12);
		color: #ffd76a;
	}
	.rating-options input {
		position: absolute;
		opacity: 0;
	}
	.rating-options span {
		font-size: 1.6rem;
	}
	.rating-options small {
		margin-top: 0.35rem;
		font-size: 0.65rem;
		color: var(--ink-soft);
	}
	.review-fields {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.2rem;
		margin-top: 2.5rem;
	}
	.review-fields label > span {
		display: block;
		margin-bottom: 0.55rem;
		color: var(--ink-soft);
	}
	.review-fields input,
	.review-fields textarea {
		width: 100%;
		border: 1px solid var(--line-strong);
		border-radius: 0.75rem;
		background: #0a0a0d;
		padding: 0.9rem 1rem;
		color: white;
	}
	.review-fields textarea {
		resize: vertical;
	}
	.wide {
		grid-column: 1 / -1;
	}
	.review-submit {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		margin-top: 1.5rem;
	}
	.review-submit p {
		margin: 0;
		font-size: 0.75rem;
		color: var(--ink-faint);
	}
	.review-submit .form-message {
		margin-bottom: 0.4rem;
		color: #ffb4b4;
	}
	.review-submit button,
	.review-success a {
		display: inline-flex;
		justify-content: space-between;
		gap: 2rem;
		border: 0;
		border-radius: 999px;
		background: white;
		padding: 1rem 1.25rem;
		font-size: 0.82rem;
		font-weight: 680;
		color: #050505;
		transition:
			transform var(--motion-fast),
			background var(--motion-fast),
			color var(--motion-fast);
	}
	.review-submit button:hover,
	.review-success a:hover {
		transform: translateY(-2px);
		background: var(--signal);
		color: white;
	}
	.review-success {
		max-width: 60rem;
		margin: clamp(7rem, 13vw, 13rem) 0;
		border-left: 3px solid var(--signal);
		padding: clamp(2rem, 5vw, 4rem);
		background: rgba(73, 103, 255, 0.08);
	}
	.review-success h2 {
		margin: 1rem 0;
		font-size: clamp(2.8rem, 6vw, 6rem);
		line-height: 0.95;
	}
	.review-success > p:not(.review-kicker) {
		color: var(--ink-soft);
	}
	.review-success a {
		margin-top: 1.5rem;
	}
	.honeypot {
		position: absolute;
		left: -10000px;
		width: 1px;
		height: 1px;
		overflow: hidden;
	}
	@media (max-width: 720px) {
		.review-intro {
			grid-template-columns: 1fr;
		}
		.review-fields {
			grid-template-columns: 1fr;
		}
		.wide {
			grid-column: 1;
		}
	}
	@media (max-width: 520px) {
		.rating-options {
			grid-template-columns: repeat(5, minmax(0, 1fr));
			gap: 0.35rem;
		}
		.rating-options label {
			min-height: 5rem;
			padding: 0.3rem;
		}
		.rating-options small {
			font-size: 0.55rem;
		}
		.review-submit {
			align-items: stretch;
			flex-direction: column;
		}
		.review-submit button {
			width: 100%;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.rating-options label,
		.review-submit button,
		.review-success a {
			transition: none;
		}
	}
</style>
