import type { RequestEvent } from '@sveltejs/kit';
import path from 'node:path';

// Only transport dependencies are substituted. Tests execute the real action and audit modules.
const records: unknown[][] = [];
const operations: string[] = [];
let failWrites = false;
let failAudit = false;
let draft = 1;
const files = new Map<string, Buffer>();
export const dev = false;
export const activeCookie = 'active-session-cookie-for-audit-test';
export const rateLimit = () => Promise.resolve(true);
export const resetRecords = () => {
	records.length = 0; operations.length = 0; failWrites = false; failAudit = false;
	files.clear(); files.set(path.resolve('static/assets/work/old.webp'), Buffer.from('existing image'));
};
export const readRecords = () => records;
export const readOperations = () => operations;
export const setWriteFailure = (value: boolean) => { failWrites = value; };
export const setAuditFailure = (value: boolean) => { failAudit = value; };
export const readFiles = () => [...files.keys()];
export const setDraft = (value: number) => { draft = value; };

export const isAdminAuthenticatedCached = (event: RequestEvent) => Promise.resolve(event.cookies.get('admin_session') === activeCookie);
export const requireAdminCached = async (event: RequestEvent) => {
	if (!(await isAdminAuthenticatedCached(event))) throw new Error('Unauthorized admin action.');
};
export const createTrackingEvent = (...record: unknown[]) => {
	if (failAudit) throw new Error('Simulated audit failure.');
	records.push(record);
	return Promise.resolve();
};
const write = (operation: string) => {
	if (failWrites) throw new Error('Simulated persistence failure.');
	operations.push(operation);
	return Promise.resolve(true);
};
export const getSiteSettings = () => Promise.resolve({ id: 1 });
export const getPosts = () => Promise.resolve([{ id: 1, draft }]);
export const updateSiteSettings = () => write('settings');
export const restoreSiteSettingsDefaults = () => write('restore_settings');
export const createPost = () => write('create_post');
export const updatePost = () => write('update_post');
export const deletePost = () => write('delete_post');
export const getAppointments = () => Promise.resolve([]);
export const updateAppointmentStatus = () => write('appointment_status');
export const getTestimonials = () => Promise.resolve([]);
export const updateTestimonialApproval = () => write('review_moderation');
export const getCrisisItems = () => Promise.resolve([]);
export const createCrisisItem = () => write('create_crisis');
export const updateCrisisItem = () => write('update_crisis');
export const deleteCrisisItem = () => write('delete_crisis');
export const getFooterLinks = () => Promise.resolve([]);
export const createFooterLink = () => write('create_footer');
export const updateFooterLink = () => write('update_footer');
export const deleteFooterLink = () => write('delete_footer');
export const getStackItems = () => Promise.resolve([]);
export const createStackItem = () => write('create_stack');
export const updateStackItem = () => write('update_stack');
export const deleteStackItem = () => write('delete_stack');
export const reorderStackItems = () => write('reorder_stack');
export const getWorkItems = () => Promise.resolve([{ id: 1, imagePath: '/assets/work/old.webp' }]);
export const createWorkItem = () => write('create_work');
export const updateWorkItem = () => write('update_work');
export const deleteWorkItem = () => write('delete_work');

export default {
	mkdirSync: () => undefined,
	writeFileSync: (target: string, bytes: Uint8Array) => { files.set(target, Buffer.from(bytes)); operations.push('fs_write'); },
	existsSync: (target: string) => files.has(target),
	unlinkSync: (target: string) => { files.delete(target); operations.push('fs_delete'); },
};
