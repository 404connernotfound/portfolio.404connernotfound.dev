export const PORTFOLIO_TIME_ZONE = 'America/New_York';
export const BOOKING_WINDOW_DAYS = 45;

export const PROJECT_CATEGORIES = [
	'Software Development',
	'Web Development',
	'AI / Automation',
	'Infrastructure / Systems',
	'Consulting',
	'Custom / Other',
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

type DailyAvailability = Readonly<{
	weekday: number;
	times: readonly string[];
}>;

export type AppointmentSlot = Readonly<{
	startsAt: string;
	ownerLabel: string;
}>;

export type AvailabilityDay = Readonly<{
	date: string;
	label: string;
	slots: readonly AppointmentSlot[];
}>;

// Availability lives here so changing the schedule does not require editing the UI.
// Weekdays follow JavaScript's convention: Sunday = 0, Monday = 1.
const WEEKLY_AVAILABILITY: readonly DailyAvailability[] = [
	{ weekday: 1, times: ['10:00', '11:30', '13:30', '15:00'] },
	{ weekday: 2, times: ['10:00', '11:30', '13:30', '15:00'] },
	{ weekday: 3, times: ['10:00', '11:30', '13:30', '15:00'] },
	{ weekday: 4, times: ['10:00', '11:30', '13:30', '15:00'] },
	{ weekday: 5, times: ['10:00', '11:30'] },
];

const BLACKOUT_DATES = new Set<string>();
const MINIMUM_LEAD_TIME_MS = 24 * 60 * 60 * 1000;

const datePartsFormatter = new Intl.DateTimeFormat('en-CA', {
	timeZone: PORTFOLIO_TIME_ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
});

const zonePartsFormatter = new Intl.DateTimeFormat('en-US', {
	timeZone: PORTFOLIO_TIME_ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
	hourCycle: 'h23',
});

const dayLabelFormatter = new Intl.DateTimeFormat('en-US', {
	timeZone: 'UTC',
	weekday: 'short',
	month: 'short',
	day: 'numeric',
});

const timeLabelFormatter = new Intl.DateTimeFormat('en-US', {
	timeZone: PORTFOLIO_TIME_ZONE,
	hour: 'numeric',
	minute: '2-digit',
	timeZoneName: 'short',
});

const partsRecord = (formatter: Intl.DateTimeFormat, date: Date): Record<string, string> =>
	Object.fromEntries(
		formatter
			.formatToParts(date)
			.filter((part) => part.type !== 'literal')
			.map((part) => [part.type, part.value]),
	);

const currentOwnerDate = (now: Date): string => {
	const parts = partsRecord(datePartsFormatter, now);
	return `${parts.year}-${parts.month}-${parts.day}`;
};

const addDays = (date: string, count: number): string => {
	const [year, month, day] = date.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day + count)).toISOString().slice(0, 10);
};

const weekdayForDate = (date: string): number => {
	const [year, month, day] = date.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

const zonedDateTimeToUtc = (date: string, time: string): Date => {
	const [year, month, day] = date.split('-').map(Number);
	const [hour, minute] = time.split(':').map(Number);
	const wallClockMs = Date.UTC(year, month - 1, day, hour, minute);
	let candidateMs = wallClockMs;

	for (let attempt = 0; attempt < 2; attempt += 1) {
		const parts = partsRecord(zonePartsFormatter, new Date(candidateMs));
		const representedMs = Date.UTC(
			Number(parts.year),
			Number(parts.month) - 1,
			Number(parts.day),
			Number(parts.hour),
			Number(parts.minute),
			Number(parts.second),
		);
		candidateMs = wallClockMs - (representedMs - candidateMs);
	}

	return new Date(candidateMs);
};

export const buildAvailability = (
	bookedStartsAt: ReadonlySet<string>,
	now = new Date(),
): AvailabilityDay[] => {
	const firstDate = currentOwnerDate(now);
	const days: AvailabilityDay[] = [];
	const earliestStart = now.getTime() + MINIMUM_LEAD_TIME_MS;

	for (let offset = 0; offset < BOOKING_WINDOW_DAYS; offset += 1) {
		const date = addDays(firstDate, offset);
		if (BLACKOUT_DATES.has(date)) continue;

		const daily = WEEKLY_AVAILABILITY.find((entry) => entry.weekday === weekdayForDate(date));
		if (!daily) continue;

		const slots = daily.times
			.map((time) => zonedDateTimeToUtc(date, time))
			.filter((startsAt) => startsAt.getTime() >= earliestStart)
			.map((startsAt) => ({
				startsAt: startsAt.toISOString(),
				ownerLabel: timeLabelFormatter.format(startsAt),
			}))
			.filter((slot) => !bookedStartsAt.has(slot.startsAt));

		if (slots.length === 0) continue;
		const [year, month, day] = date.split('-').map(Number);
		days.push({
			date,
			label: dayLabelFormatter.format(new Date(Date.UTC(year, month - 1, day))),
			slots,
		});
	}

	return days;
};

export const isProjectCategory = (value: string): value is ProjectCategory =>
	PROJECT_CATEGORIES.some((category) => category === value);
