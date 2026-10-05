export type VisitorEventType = 'pageview' | 'navigation' | 'cta_click' | 'form_submit' | 'form_outcome' | 'client_error' | 'pixel';
export type VisitorEvent = { type: VisitorEventType; name: string | null; path: string | null };

const containsControlCharacters = (value: string) => {
	for (const character of value) if (character.charCodeAt(0) < 32) return true;
	return false;
};

export const visitorPath = (value: string): string | null => {
	if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || containsControlCharacters(value)) return null;
	let path: string;
	try {
		// Preserve encoded reserved separators, matching SvelteKit's route decoding.
		path = value.split(/[?#]/, 1)[0].split('%25').map((segment) => decodeURI(segment)).join('%25');
	} catch { return null; }
	if (path.length > 512 || path.includes('\\') || containsControlCharacters(path) || path === '/admin' || path.startsWith('/admin/')) return null;
	return path;
};

export const parseVisitorEvent = (value: unknown): VisitorEvent | null => {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
	if (Object.keys(value).some((key) => !['type', 'name', 'path'].includes(key))) return null;
	if (!('type' in value)) return null;
	const type = value.type;
	if (type !== 'pageview' && type !== 'navigation' && type !== 'cta_click' && type !== 'form_submit' && type !== 'form_outcome' && type !== 'client_error' && type !== 'pixel') return null;
	let name: string | null = null;
	if ('name' in value && value.name !== null) {
		if (typeof value.name !== 'string' || !/^[a-zA-Z0-9_.:-]{1,80}$/.test(value.name)) return null;
		name = value.name;
	}
	let path: string | null = null;
	if ('path' in value && value.path !== null) {
		if (typeof value.path !== 'string') return null;
		path = visitorPath(value.path);
		if (path === null) return null;
	}
	return { type, name, path };
};
