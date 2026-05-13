export type BlogReference = {
	label: string;
	url: string;
	note: string | null;
};

export type WorkCoverSource = {
	imagePath: string | null;
	imageUrl: string | null;
};

const HTML_ESCAPE_MAP: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);

export const isHttpUrl = (value: string) => {
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
};

export const normalizeHttpUrl = (value: string) => {
	const trimmed = value.trim();
	if (!isHttpUrl(trimmed)) return null;
	return new URL(trimmed).toString();
};

const isSafeMarkdownHref = (value: string) => {
	if (value.startsWith('/') || value.startsWith('#')) return true;
	try {
		const url = new URL(value);
		return ['http:', 'https:', 'mailto:'].includes(url.protocol);
	} catch {
		return false;
	}
};

const isSafeMarkdownImageSrc = (value: string) => {
	if (value.startsWith('/')) return true;
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
};

const normalizeStoredReferences = (value: unknown): BlogReference[] => {
	if (!Array.isArray(value)) return [];
	return value
		.map((entry) => {
			if (!entry || typeof entry !== 'object') return null;
			const candidate = entry as Partial<BlogReference>;
			if (typeof candidate.label !== 'string' || typeof candidate.url !== 'string') return null;
			const label = candidate.label.trim();
			const url = normalizeHttpUrl(candidate.url);
			const note = typeof candidate.note === 'string' ? candidate.note.trim() : '';
			if (!label || !url) return null;
			return { label, url, note: note || null };
		})
		.filter((entry): entry is BlogReference => Boolean(entry));
};

export const parseStoredReferences = (value: unknown): BlogReference[] => {
	if (!value) return [];
	if (Array.isArray(value)) return normalizeStoredReferences(value);
	if (typeof value !== 'string') return [];
	try {
		return normalizeStoredReferences(JSON.parse(value));
	} catch {
		return [];
	}
};

export const serializeReferences = (references: BlogReference[]) =>
	references.length > 0 ? JSON.stringify(references) : null;

export const resolveWorkCoverImage = (item: WorkCoverSource) => item.imagePath ?? item.imageUrl;

const PLACEHOLDER_PREFIX = '';
const PLACEHOLDER_SUFFIX = '';
const PLACEHOLDER_PATTERN = /(\d+)/g;

const buildImageTag = (src: string, alt: string, title: string | null) => {
	const safeSrc = escapeHtml(src);
	const safeAlt = escapeHtml(alt);
	const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
	const altAttr = alt ? ` data-image-fallback-text="${safeAlt}"` : '';
	return `<img src="${safeSrc}" alt="${safeAlt}"${titleAttr} loading="lazy" referrerpolicy="no-referrer" data-image-fallback="1"${altAttr} />`;
};

const buildAnchorTag = (href: string, innerHtml: string, title: string | null) => {
	const safeHref = escapeHtml(href);
	const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
	const external = /^https?:\/\//i.test(href)
		? ' rel="noreferrer noopener" target="_blank"'
		: '';
	return `<a href="${safeHref}"${external}${titleAttr}>${innerHtml}</a>`;
};

const renderInlineLabel = (value: string): string => {
	let output = escapeHtml(value);
	output = output.replace(/`([^`\n]+)`/g, (_match, code: string) => `<code>${code}</code>`);
	output = output.replace(/~~([^~\n]+?)~~/g, '<del>$1</del>');
	output = output.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
	output = output.replace(/__([^_\n]+?)__/g, '<strong>$1</strong>');
	output = output.replace(/(^|[^*])\*([^*\s][^*\n]*?)\*/g, '$1<em>$2</em>');
	output = output.replace(/(^|[^_\w])_([^_\s][^_\n]*?)_(?=$|[^_\w])/g, '$1<em>$2</em>');
	return output;
};

const renderInline = (value: string): string => {
	const tokens: string[] = [];
	const reserve = (html: string) => {
		const id = `${PLACEHOLDER_PREFIX}${tokens.length}${PLACEHOLDER_SUFFIX}`;
		tokens.push(html);
		return id;
	};

	let output = value;

	output = output.replace(/`([^`\n]+)`/g, (_match, code: string) =>
		reserve(`<code>${escapeHtml(code)}</code>`)
	);

	output = output.replace(
		/!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"([^"]*)")?\s*\)/g,
		(match, alt: string, src: string, title: string | undefined) => {
			if (!isSafeMarkdownImageSrc(src)) return match;
			return reserve(buildImageTag(src, alt, title ?? null));
		}
	);

	output = output.replace(
		/\[([^\]]+)\]\(\s*([^)\s]+)(?:\s+"([^"]*)")?\s*\)/g,
		(match, label: string, href: string, title: string | undefined) => {
			if (!isSafeMarkdownHref(href)) return match;
			return reserve(buildAnchorTag(href, renderInlineLabel(label), title ?? null));
		}
	);

	output = output.replace(
		/<((?:https?:\/\/|mailto:)[^\s<>]+)>/g,
		(match, url: string) => {
			if (!isSafeMarkdownHref(url)) return match;
			return reserve(buildAnchorTag(url, escapeHtml(url), null));
		}
	);

	output = output.replace(
		/(^|[\s(])(https?:\/\/[^\s<>()"']+)/g,
		(_match, prefix: string, raw: string) => {
			let url = raw;
			let trailing = '';
			while (/[.,;:!?]$/.test(url)) {
				trailing = url.slice(-1) + trailing;
				url = url.slice(0, -1);
			}
			if (!url || !isSafeMarkdownHref(url)) return _match;
			return `${prefix}${reserve(buildAnchorTag(url, escapeHtml(url), null))}${trailing}`;
		}
	);

	output = escapeHtml(output);

	output = output.replace(/~~([^~\n]+?)~~/g, '<del>$1</del>');
	output = output.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
	output = output.replace(/__([^_\n]+?)__/g, '<strong>$1</strong>');
	output = output.replace(/(^|[^*])\*([^*\s][^*\n]*?)\*/g, '$1<em>$2</em>');
	output = output.replace(/(^|[^_\w])_([^_\s][^_\n]*?)_(?=$|[^_\w])/g, '$1<em>$2</em>');

	output = output.replace(/(  +|\\)\n/g, '<br />\n');

	output = output.replace(PLACEHOLDER_PATTERN, (_match, idx: string) => tokens[Number(idx)] ?? '');

	return output;
};

type ListFrame = { type: 'ul' | 'ol'; indent: number };
type TableAlign = 'left' | 'center' | 'right' | null;

const parseTableRow = (line: string): string[] => {
	let s = line.trim();
	if (s.startsWith('|')) s = s.slice(1);
	if (s.endsWith('|')) s = s.slice(0, -1);
	return s.split('|').map((cell) => cell.trim());
};

const isTableSeparator = (line: string): boolean => {
	const trimmed = line.trim();
	if (!/^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(trimmed)) return false;
	return true;
};

const parseTableSeparator = (line: string): TableAlign[] =>
	parseTableRow(line).map((cell) => {
		const left = cell.startsWith(':');
		const right = cell.endsWith(':');
		if (left && right) return 'center';
		if (right) return 'right';
		if (left) return 'left';
		return null;
	});

const renderTable = (header: string[], rows: string[][], aligns: TableAlign[]): string => {
	const alignAttr = (a: TableAlign) => (a ? ` style="text-align: ${a}"` : '');
	const headerCells = header
		.map((cell, idx) => `<th${alignAttr(aligns[idx] ?? null)}>${renderInline(cell)}</th>`)
		.join('');
	const bodyRows = rows
		.map((row) => {
			const cells = row
				.map((cell, idx) => `<td${alignAttr(aligns[idx] ?? null)}>${renderInline(cell)}</td>`)
				.join('');
			return `<tr>${cells}</tr>`;
		})
		.join('');
	return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
};

const measureIndent = (line: string): number => {
	let count = 0;
	for (const ch of line) {
		if (ch === ' ') count += 1;
		else if (ch === '\t') count += 4;
		else break;
	}
	return count;
};

const isHorizontalRule = (line: string): boolean => {
	const compact = line.replace(/\s+/g, '');
	return /^([-*_])\1{2,}$/.test(compact);
};

export const renderMarkdown = (markdown: string | null | undefined): string => {
	const source = (markdown ?? '').replace(/\r\n?/g, '\n');
	if (!source.trim()) return '';

	const lines = source.split('\n');
	const parts: string[] = [];
	const paragraph: string[] = [];
	const listStack: ListFrame[] = [];
	let inCodeFence = false;
	let codeFenceLang = '';
	let codeLines: string[] = [];

	const flushParagraph = () => {
		if (paragraph.length === 0) return;
		parts.push(`<p>${renderInline(paragraph.join('\n'))}</p>`);
		paragraph.length = 0;
	};

	const closeAllLists = () => {
		while (listStack.length > 0) {
			parts.push(`</${listStack.pop()!.type}>`);
		}
	};

	const closeListsBeyondIndent = (indent: number) => {
		while (listStack.length > 0 && listStack[listStack.length - 1].indent > indent) {
			parts.push(`</${listStack.pop()!.type}>`);
		}
	};

	const openOrSwitchList = (type: 'ul' | 'ol', indent: number) => {
		const top = listStack[listStack.length - 1];
		if (!top || top.indent < indent) {
			parts.push(`<${type}>`);
			listStack.push({ type, indent });
			return;
		}
		if (top.indent === indent && top.type !== type) {
			parts.push(`</${listStack.pop()!.type}>`);
			parts.push(`<${type}>`);
			listStack.push({ type, indent });
		}
	};

	for (let i = 0; i < lines.length; i += 1) {
		const rawLine = lines[i];
		const lineNoTrailing = rawLine.replace(/\s+$/g, '');
		const trimmed = lineNoTrailing.trim();
		const indent = measureIndent(rawLine);

		if (inCodeFence) {
			if (/^\s*```\s*$/.test(rawLine)) {
				const langAttr = codeFenceLang
					? ` class="language-${escapeHtml(codeFenceLang)}"`
					: '';
				parts.push(`<pre><code${langAttr}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
				inCodeFence = false;
				codeLines = [];
				codeFenceLang = '';
				continue;
			}
			codeLines.push(rawLine);
			continue;
		}

		const fenceOpen = /^\s*```\s*([\w.+-]*)\s*$/.exec(rawLine);
		if (fenceOpen) {
			flushParagraph();
			closeAllLists();
			inCodeFence = true;
			codeFenceLang = fenceOpen[1] || '';
			codeLines = [];
			continue;
		}

		if (!trimmed) {
			flushParagraph();
			closeAllLists();
			continue;
		}

		if (isHorizontalRule(trimmed)) {
			flushParagraph();
			closeAllLists();
			parts.push('<hr />');
			continue;
		}

		const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(trimmed);
		if (heading) {
			flushParagraph();
			closeAllLists();
			const level = heading[1].length;
			parts.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
			continue;
		}

		if (
			trimmed.startsWith('|') &&
			i + 1 < lines.length &&
			isTableSeparator(lines[i + 1])
		) {
			flushParagraph();
			closeAllLists();
			const headerCells = parseTableRow(trimmed);
			const aligns = parseTableSeparator(lines[i + 1]);
			i += 1;
			const bodyRows: string[][] = [];
			while (i + 1 < lines.length && lines[i + 1].trim().startsWith('|')) {
				i += 1;
				bodyRows.push(parseTableRow(lines[i]));
			}
			parts.push(renderTable(headerCells, bodyRows, aligns));
			continue;
		}

		if (trimmed.startsWith('>')) {
			flushParagraph();
			closeAllLists();
			const quoteLines: string[] = [trimmed.replace(/^>\s?/, '')];
			while (i + 1 < lines.length && /^\s*>/.test(lines[i + 1])) {
				i += 1;
				quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
			}
			parts.push(`<blockquote>${renderMarkdown(quoteLines.join('\n'))}</blockquote>`);
			continue;
		}

		const unordered = /^([-*+])\s+(.+)$/.exec(trimmed);
		if (unordered) {
			flushParagraph();
			closeListsBeyondIndent(indent);
			openOrSwitchList('ul', indent);
			const itemContent = unordered[2];
			const task = /^\[( |x|X)\]\s+(.+)$/.exec(itemContent);
			if (task) {
				const checked = task[1].toLowerCase() === 'x';
				parts.push(
					`<li class="task-list-item"><input type="checkbox" disabled${checked ? ' checked' : ''} /> ${renderInline(task[2])}</li>`
				);
			} else {
				parts.push(`<li>${renderInline(itemContent)}</li>`);
			}
			continue;
		}

		const ordered = /^(\d+)[.)]\s+(.+)$/.exec(trimmed);
		if (ordered) {
			flushParagraph();
			closeListsBeyondIndent(indent);
			openOrSwitchList('ol', indent);
			parts.push(`<li>${renderInline(ordered[2])}</li>`);
			continue;
		}

		closeAllLists();
		paragraph.push(trimmed);
	}

	if (inCodeFence) {
		const langAttr = codeFenceLang ? ` class="language-${escapeHtml(codeFenceLang)}"` : '';
		parts.push(`<pre><code${langAttr}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
	}
	flushParagraph();
	closeAllLists();

	return parts.join('\n');
};
