import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireAdminCached } from '$lib/server/auth';
import { getCsrfToken, validateCsrfToken } from '$lib/server/csrf';
import { getAppointments, updateAppointmentStatus } from '$lib/server/dataStore';
import type { AppointmentStatus } from '$lib/server/dataStore';

const isAppointmentStatus = (value: string): value is AppointmentStatus =>
	value === 'pending' || value === 'confirmed' || value === 'cancelled';

export const load: PageServerLoad = async (event) => {
	await requireAdminCached(event);
	return { appointments: await getAppointments(), csrfToken: getCsrfToken(event) };
};

export const actions: Actions = {
	setStatus: async (event) => {
		await requireAdminCached(event);
		const data = await event.request.formData();
		if (!validateCsrfToken(event, data)) return fail(403, { message: 'Invalid CSRF token.' });
		const id = Number(data.get('id'));
		const status = String(data.get('status') ?? '');
		if (!Number.isInteger(id) || id < 1 || !isAppointmentStatus(status)) {
			return fail(400, { message: 'Invalid appointment update.' });
		}
		try {
			const updated = await updateAppointmentStatus(id, status);
			if (!updated) {
				return fail(409, { message: 'That time is already held by another active request.' });
			}
		} catch {
			return fail(500, { message: 'The appointment could not be updated right now.' });
		}
		return { success: true, message: 'Appointment status updated.' };
	},
};
