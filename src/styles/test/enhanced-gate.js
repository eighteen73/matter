/**
 * The enhanced gate is a contract: themes copy it (Pulsar's `matter-enhanced()`
 * in `src/css/tools/mixins/_matter.scss`), so a change to it needs a CHANGELOG
 * line that says the copies must follow. A theme can't `@use` Matter's Sass
 * (its build can't count on Matter's source being there), so the string is
 * kept in step by hand, and by this test.
 */
const fs = require('fs');
const path = require('path');

const GATE =
	':is(.is-enhanced, html.matter-js:is(:not(.matter-late), .matter-ready-{type}) *, .editor-styles-wrapper *)';

const read = (file) =>
	fs.readFileSync(path.join(__dirname, '..', '..', '..', file), 'utf8');

describe('the enhanced gate', () => {
	it('is the string themes copy', () => {
		const source = read('src/styles/_enhanced.scss');
		const aboutToBe = source.match(
			/@function about-to-be\(\$type\) \{\s*@return "([^"]*)";/
		)[1];
		const gate = source
			.match(/@function enhanced\(\$type\) \{\s*@return "([^"]*)";/)[1]
			.replace('#{about-to-be($type)}', aboutToBe)
			.replace(/#\{\$type\}/g, '{type}');

		expect(gate).toBe(GATE);
	});

	it('is in the CHANGELOG, so a change to it says so', () => {
		expect(read('CHANGELOG.md')).toContain(`\`${GATE}\``);
	});
});
