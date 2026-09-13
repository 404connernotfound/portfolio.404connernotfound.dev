import { createHash } from 'node:crypto';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	BOOKING_WINDOW_DAYS,
	buildAvailability,
	isProjectCategory,
	PORTFOLIO_TIME_ZONE,
	PROJECT_CATEGORIES,
} from '$lib/booking/availability';
import {
	createAppointment,
	getBookedAppointmentStarts,
	getSiteSettings,
} from '$lib/server/dataStore';
import { rateLimit } from '$lib/server/rateLimit';

const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 320;
const MAX_COMPANY_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 3_000;

const isValidEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value);

const isValidTimeZone = (value: string) => {
	if (!value || value.length > 80) return false;
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
		return true;
	} catch {
		return false;
	}
};

const getAvailability = async (now = new Date()) => {
	const end = new Date(now.getTime() + (BOOKING_WINDOW_DAYS + 2) * 24 * 60 * 60 * 1000);
	const booked = await getBookedAppointmentStarts(now.toISOString(), end.toISOString());
	return buildAvailability(new Set(booked.map((appointment) => appointment.startsAt)), now);
};

export const load: PageServerLoad = async () => {
	const [siteSettings, availability] = await Promise.all([getSiteSettings(), getAvailability()]);
	return {
		siteSettings,
		availability,
		projectCategories: PROJECT_CATEGORIES,
		portfolioTimeZone: PORTFOLIO_TIME_ZONE,
	};
};

export const actions: Actions = {
	request: async (event) => {
		const data = await event.request.formData();
		const name = String(data.get('name') ?? '').trim();
		const email = String(data.get('email') ?? '')
			.trim()
			.toLowerCase();
		const company = String(data.get('company') ?? '').trim();
		const projectType = String(data.get('projectType') ?? '').trim();
		const description = String(data.get('description') ?? '').trim();
		const startsAt = String(data.get('startsAt') ?? '').trim();
		const visitorTimezone = String(data.get('visitorTimezone') ?? PORTFOLIO_TIME_ZONE).trim();
		const website = String(data.get('website') ?? '').trim();
		const fields = { name, email, company, projectType, description, startsAt };

		if (website) return { success: true };

		const ip = event.getClientAddress();
		if (!(await rateLimit(`booking:${ip}`, { windowMs: 30 * 60 * 1000, max: 5 }))) {
			return fail(429, { message: 'Too many booking attempts. Please try again later.', fields });
		}

		if (!name || !email || !projectType || !description || !startsAt) {
			return fail(400, {
				message: 'Please complete every required field and choose a time.',
				fields,
			});
		}
		if (!isValidEmail(email) || email.length > MAX_EMAIL_LENGTH) {
			return fail(400, { message: 'Please provide a valid email address.', fields });
		}
		if (name.length > MAX_NAME_LENGTH || company.length > MAX_COMPANY_LENGTH) {
			return fail(400, { message: 'Name or company is longer than expected.', fields });
		}
		if (description.length > MAX_DESCRIPTION_LENGTH) {
			return fail(400, { message: 'Keep the project description under 3,000 characters.', fields });
		}
		if (!isProjectCategory(projectType)) {
			return fail(400, { message: 'Choose one of the available project types.', fields });
		}
		if (!isValidTimeZone(visitorTimezone)) {
			return fail(400, { message: 'Your time zone could not be recognized.', fields });
		}

		const availability = await getAvailability();
		const validSlot = availability
			.flatMap((day) => day.slots)
			.some((slot) => slot.startsAt === startsAt);
		if (!validSlot) {
			return fail(409, {
				message: 'That time is no longer available. Please choose another open slot.',
				fields: { ...fields, startsAt: '' },
			});
		}

		try {
			const created = await createAppointment({
				name,
				email,
				company: company || null,
				projectType,
				description,
				startsAt,
				visitorTimezone,
				ipHash: createHash('sha256').update(ip).digest('hex'),
			});
			if (!created) {
				return fail(409, {
					message: 'That time was just requested by someone else. Please choose another slot.',
					fields: { ...fields, startsAt: '' },
				});
			}
		} catch {
			return fail(500, {
				message: 'I could not save that request. Please try again shortly.',
				fields,
			});
		}

		return { success: true, startsAt, visitorTimezone };
	},
};
