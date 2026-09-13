import assert from 'node:assert/strict';
import { renderMarkdown } from '../src/lib/utils/content';

for (const source of ['$E = mc^2$', String.raw`\(x_1 + x_2\)`]) {
	const html = renderMarkdown(source);
	assert.match(html, /class="katex"/);
	assert.match(html, /<math /);
	assert.doesNotMatch(html, /class="katex-display"/);
}

for (const source of [
	String.raw`$$\sum_{n=1}^{10} n$$`,
	String.raw`\[\frac{a}{b}\]`,
	'Before\n$$\n\\begin{aligned}\nx &= 1 \\\\\n\ny &= 2\n\\end{aligned}\n$$\nAfter',
]) {
	const html = renderMarkdown(source);
	assert.match(html, /class="katex-display"/);
	assert.doesNotMatch(html, /class="katex-error"/);
}

assert.equal(
	renderMarkdown('Price $5 and $10. Escaped \\$x\\$.'),
	'<p>Price $5 and $10. Escaped $x$.</p>',
);
assert.equal(renderMarkdown('Unclosed $x and $$y'), '<p>Unclosed $x and $$y</p>');
assert.equal(renderMarkdown('`$x$`'), '<p><code>$x$</code></p>');
assert.equal(
	renderMarkdown('```tex\n$$x$$\n\\(y\\)\n```'),
	'<pre><code class="language-tex">$$x$$\n\\(y\\)</code></pre>',
);

for (const source of [
	'# Formula $x_1$',
	'- Value $x^2$',
	'> $$x^2$$',
	'| Value | Formula |\n| --- | --- |\n| x | $x^2$ |',
	'[Value $x^2$](https://example.com)',
	'**Result: $x_1 + x_2$**',
]) {
	const html = renderMarkdown(source);
	assert.match(html, /class="katex"/);
	assert.doesNotMatch(html, /[]/);
}

const malformed = renderMarkdown(String.raw`$\frac{1}{$`);
assert.match(malformed, /class="katex-error"/);
assert.match(renderMarkdown(String.raw`$\unknowncommand$`), /color:/);
for (const source of [
	String.raw`$\href{javascript:alert(1)}{click}$`,
	String.raw`$\includegraphics{https://example.com/tracker.png}$`,
	String.raw`$\htmlStyle{background:url(javascript:alert(1))}{x}$`,
	String.raw`$\invalid{<img src=x onerror=alert(1)>}$`,
]) {
	assert.doesNotMatch(renderMarkdown(source), /<img|<script|href="javascript:|style="background:/i);
}
assert.match(renderMarkdown('$a < b$'), /a &lt; b/);
assert.match(renderMarkdown('$$x$$\n\nAfter'), /<\/span>\n<p>After<\/p>$/);
assert.match(renderMarkdown('$$x$$ trailing text'), /<\/span>\n<p>trailing text<\/p>$/);
assert.match(renderMarkdown('[`$x$`](https://example.com)'), /<code>\$x\$<\/code>/);
console.log('math tests passed');
