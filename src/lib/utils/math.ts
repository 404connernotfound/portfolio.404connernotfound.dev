import katex from 'katex';

const delimiters = [
	{ open: '$$', close: '$$', display: true },
	{ open: '\\[', close: '\\]', display: true },
	{ open: '\\(', close: '\\)', display: false },
	{ open: '$', close: '$', display: false },
];

/** Read a formula before Markdown can interpret its TeX syntax. */
export const readMath = (source: string, start = 0) => {
	const delimiter = delimiters.find(({ open }) => source.startsWith(open, start));
	if (!delimiter) return null;
	const contentStart = start + delimiter.open.length;
	const singleDollar = delimiter.open === '$';
	if (singleDollar && /\s|\$/.test(source[contentStart] ?? ' ')) return null;
	for (let end = contentStart; end < source.length; end += 1) {
		if (singleDollar && source[end] === '\n') return null;
		if (source.startsWith(delimiter.close, end)) {
			if (singleDollar && (/\s/.test(source[end - 1]) || /\d/.test(source[end + 1] ?? ''))) {
				return null;
			}
			const tex = source.slice(contentStart, end);
			if (!tex.trim()) return null;
			return {
				length: end + delimiter.close.length - start,
				display: delimiter.display,
				html: katex.renderToString(tex, {
					displayMode: delimiter.display,
					throwOnError: false,
					trust: false,
					strict: 'ignore',
					maxSize: 20,
					maxExpand: 1000,
				}),
			};
		}
		if (source[end] === '\\') end += 1;
	}
	return null;
};

export const protectInlineMath = (source: string, reserve: (html: string) => string) => {
	let output = '';
	for (let i = 0; i < source.length; ) {
		const math = readMath(source, i);
		if (math) {
			output += reserve(math.html);
			i += math.length;
		} else if (source[i] === '\\' && /[$\\]/.test(source[i + 1] ?? '')) {
			output += source[i + 1];
			i += 2;
		} else if (source.startsWith('$$', i)) {
			output += '$$';
			i += 2;
		} else {
			output += source[i];
			i += 1;
		}
	}
	return output;
};
