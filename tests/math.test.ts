import assert from 'node:assert/strict';
import test from 'node:test';
import { renderMarkdown } from '../src/lib/utils/content';

// This renderer preserves mathematical notation as text/code; it does not load
// a separate math engine. Exercise that existing contract alongside Markdown.
test('mathematical notation preserves Unicode and safely escapes comparisons', () => {
	const html = renderMarkdown('For x < y and y > 0, π ≈ 3.14159 and x² + y² = r².');
	assert.match(html, /x &lt; y and y &gt; 0/);
	assert.match(html, /π ≈ 3\.14159 and x² \+ y² = r²/);
});

test('inline and fenced formula code stays inert', () => {
	const html = renderMarkdown('`x < y && y > 0`\n\n```latex\n\\frac{a}{b} < c\n<script>harmless</script>\n```');
	assert.match(html, /<code>x &lt; y &amp;&amp; y &gt; 0<\/code>/);
	assert.match(html, /class="language-latex"/);
	assert.match(html, /&lt;script&gt;harmless&lt;\/script&gt;/);
	assert.doesNotMatch(html, /<script>/);
});
