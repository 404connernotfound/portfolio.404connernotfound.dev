import assert from 'node:assert/strict';
import path from 'node:path';
import {
	buildAvailability,
	isProjectCategory,
	PORTFOLIO_TIME_ZONE,
} from '../src/lib/booking/availability';
import {
	isReviewModeration,
	moderationFromDatabase,
	moderationToDatabase,
	parseReviewRating,
} from '../src/lib/reviews/reviewSubmission';
import { reviewFingerprint } from '../src/lib/server/reviewFingerprint';

const now = new Date('2026-09-14T12:00:00.000Z');
const availability = buildAvailability(new Set(), now);
assert.ok(availability.length > 0);
assert.equal(PORTFOLIO_TIME_ZONE, 'America/New_York');
assert.ok(availability.every((day) => day.slots.length > 0));
assert.ok(availability.flatMap((day) => day.slots).every((slot) => new Date(slot.startsAt) > now));

const firstSlot = availability[0].slots[0];
const withoutBooked = buildAvailability(new Set([firstSlot.startsAt]), now);
assert.ok(
	withoutBooked.flatMap((day) => day.slots).every((slot) => slot.startsAt !== firstSlot.startsAt),
);

assert.equal(isProjectCategory('AI / Automation'), true);
assert.equal(isProjectCategory('Anything at all'), false);
assert.equal(parseReviewRating('5'), 5);
assert.equal(parseReviewRating('0'), null);
assert.equal(parseReviewRating('3.5'), null);
assert.equal(isReviewModeration('approved'), true);
assert.equal(isReviewModeration('deleted'), false);
assert.equal(moderationFromDatabase(-1), 'rejected');
assert.equal(moderationToDatabase('approved'), 1);

const fingerprint = reviewFingerprint({
	name: 'Ada',
	quote: 'Excellent systems work.',
	clientAddress: '127.0.0.1',
});
assert.equal(fingerprint.length, 64);
assert.equal(
	fingerprint,
	reviewFingerprint({ name: 'ADA', quote: 'EXCELLENT SYSTEMS WORK.', clientAddress: '127.0.0.1' }),
);

process.env.DB_PATH = path.join(
	'/tmp',
	`portfolio-booking-review-${process.pid}-${Date.now()}.sqlite`,
);
process.env.DB_AUTO_SEED = 'true';
process.env.NODE_ENV = 'test';
delete process.env.DATABASE_URL;

const db = await import('../src/lib/server/db');
assert.equal(
	db.createTestimonial(
		'Ada',
		null,
		'Analytical Engines',
		'Excellent systems work.',
		'Engine',
		null,
		null,
		5,
		fingerprint,
	),
	true,
);
assert.equal(
	db.createTestimonial(
		'Ada',
		null,
		'Analytical Engines',
		'Excellent systems work.',
		'Engine',
		null,
		null,
		5,
		fingerprint,
	),
	false,
);
assert.equal(db.getTestimonials()[0].rating, 5);
assert.equal(db.getApprovedTestimonials().length, 0);
db.updateTestimonialApproval(db.getTestimonials()[0].id, 1);
assert.equal(db.getApprovedTestimonials().length, 1);
db.updateTestimonialApproval(db.getTestimonials()[0].id, -1);
assert.equal(db.getTestimonials()[0].approved, -1);
assert.equal(db.getApprovedTestimonials().length, 0);

const appointment = {
	name: 'Grace Hopper',
	email: 'grace@example.com',
	company: null,
	projectType: 'Software Development',
	description: 'A compiler project that needs a clear implementation plan.',
	startsAt: firstSlot.startsAt,
	visitorTimezone: 'America/Los_Angeles',
	ipHash: 'test-ip-hash',
};
assert.equal(db.createAppointment(appointment), true);
assert.equal(db.createAppointment(appointment), false);
assert.deepEqual(db.getBookedAppointmentStarts('2026-01-01', '2027-01-01'), [
	{ startsAt: firstSlot.startsAt },
]);
const storedAppointment = db.getAppointments()[0];
assert.equal(storedAppointment.status, 'pending');
assert.equal(db.updateAppointmentStatus(storedAppointment.id, 'cancelled'), true);
assert.equal(db.createAppointment({ ...appointment, email: 'second@example.com' }), true);
assert.equal(db.updateAppointmentStatus(storedAppointment.id, 'confirmed'), false);

console.log('booking and review tests passed');
