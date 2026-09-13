<script lang="ts">
	import AdminNav from '$lib/components/AdminNav.svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import { moderationFromDatabase } from '$lib/reviews/reviewSubmission';
	import type { ActionData, PageData } from './$types';

	export let data: PageData;
	export let form: ActionData | undefined;
	$: pending = data.reviews.filter((review) => review.approved === 0);
	$: resolved = data.reviews.filter((review) => review.approved !== 0);

	const submittedLabel = (createdAt: string) =>
		new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		}).format(new Date(createdAt));
</script>

<SeoHead title={formatTitle('Admin | Reviews')} description="Moderate submitted client reviews." />

<section class="section-pad">
	<div class="space-y-4">
		<p class="badge">Admin / Trust</p>
		<h1 class="text-4xl font-semibold text-white sm:text-5xl">Reviews</h1>
		<p class="max-w-2xl text-lg text-ink-200">
			Approve only feedback you are comfortable publishing. Rejected reviews remain recorded and
			private.
		</p>
		<AdminNav />
	</div>
</section>

<section class="section-pad review-admin">
	{#if form?.message}<p class={`admin-notice ${form.success ? 'success' : ''}`} role="status">
			{form.message}
		</p>{/if}
	<div class="review-group">
		<header>
			<p class="badge">Needs attention</p>
			<span>{pending.length} pending</span>
		</header>
		<div class="review-grid">
			{#each pending as review}
				<article class="review-card">
					<div class="review-card-top">
						<span class="stars" aria-label={`${review.rating} out of 5 stars`}
							>{'★'.repeat(review.rating)}</span
						><span class="status pending">pending</span>
					</div>
					<blockquote>“{review.quote}”</blockquote>
					<p>
						<strong>{review.name}</strong>{review.company || review.project
							? ` · ${review.company || review.project}`
							: ''}
					</p>
					<time datetime={review.createdAt}>Submitted {submittedLabel(review.createdAt)}</time>
					<form method="POST" action="?/moderate">
						<input type="hidden" name="csrfToken" value={data.csrfToken} /><input
							type="hidden"
							name="id"
							value={review.id}
						/>
						<button class="nav-pill" name="moderation" value="rejected" type="submit">Reject</button
						>
						<button class="nav-pill cta-primary" name="moderation" value="approved" type="submit"
							>Approve</button
						>
					</form>
				</article>
			{:else}
				<div class="empty-state">No reviews are waiting for moderation.</div>
			{/each}
		</div>
	</div>
	<div class="review-group">
		<header>
			<p class="badge">History</p>
			<span>{resolved.length} resolved</span>
		</header>
		<div class="review-grid">
			{#each resolved as review}
				<article class="review-card">
					<div class="review-card-top">
						<span class="stars" aria-label={`${review.rating} out of 5 stars`}
							>{'★'.repeat(review.rating)}</span
						><span class={`status ${moderationFromDatabase(review.approved)}`}
							>{moderationFromDatabase(review.approved)}</span
						>
					</div>
					<blockquote>“{review.quote}”</blockquote>
					<p>
						<strong>{review.name}</strong>{review.company || review.project
							? ` · ${review.company || review.project}`
							: ''}
					</p>
					<time datetime={review.createdAt}>Submitted {submittedLabel(review.createdAt)}</time>
					<form method="POST" action="?/moderate">
						<input type="hidden" name="csrfToken" value={data.csrfToken} /><input
							type="hidden"
							name="id"
							value={review.id}
						/>
						<button class="nav-pill" name="moderation" value="pending" type="submit"
							>Return to pending</button
						>
					</form>
				</article>
			{/each}
		</div>
	</div>
</section>

<style>
	.admin-notice {
		margin: 0 0 1rem;
		border-left: 2px solid #f59e0b;
		padding: 0.8rem 1rem;
		background: rgba(245, 158, 11, 0.08);
		color: var(--ink-soft);
	}
	.admin-notice.success {
		border-color: #34d399;
		background: rgba(52, 211, 153, 0.08);
	}
	.review-admin {
		display: grid;
		gap: 4rem;
	}
	.review-group > header {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: center;
		margin-bottom: 1rem;
	}
	.review-group > header > span {
		font:
			650 0.65rem ui-monospace,
			monospace;
		color: var(--ink-faint);
	}
	.review-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}
	.review-card,
	.empty-state {
		border: 1px solid var(--line);
		border-radius: 1.25rem;
		background: rgba(255, 255, 255, 0.025);
		padding: 1.5rem;
	}
	.review-card-top {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
	}
	.stars {
		color: #ffd76a;
		letter-spacing: 0.12em;
	}
	.status {
		font:
			650 0.6rem ui-monospace,
			monospace;
		text-transform: uppercase;
		color: var(--ink-faint);
	}
	.status.approved {
		color: #6ee7b7;
	}
	.status.rejected {
		color: #fca5a5;
	}
	blockquote {
		margin: 1.5rem 0;
		font-size: 1.1rem;
		line-height: 1.6;
	}
	.review-card > p {
		font-size: 0.75rem;
		color: var(--ink-soft);
	}
	.review-card time {
		display: block;
		margin-top: 0.5rem;
		font:
			600 0.62rem ui-monospace,
			monospace;
		color: var(--ink-faint);
	}
	.review-card form {
		display: flex;
		gap: 0.6rem;
		justify-content: flex-end;
		margin-top: 1.5rem;
	}
	@media (max-width: 760px) {
		.review-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
