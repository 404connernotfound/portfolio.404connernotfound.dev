export type ReviewRating = 1 | 2 | 3 | 4 | 5;
export type ReviewModeration = 'pending' | 'approved' | 'rejected';

export const parseReviewRating = (value: string): ReviewRating | null => {
	const rating = Number(value);
	return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? (rating as ReviewRating) : null;
};

export const moderationFromDatabase = (approved: number): ReviewModeration => {
	if (approved === 1) return 'approved';
	if (approved === -1) return 'rejected';
	return 'pending';
};

export const moderationToDatabase = (moderation: ReviewModeration): number => {
	if (moderation === 'approved') return 1;
	if (moderation === 'rejected') return -1;
	return 0;
};

export const isReviewModeration = (value: string): value is ReviewModeration =>
	value === 'pending' || value === 'approved' || value === 'rejected';
