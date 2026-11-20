/**
 * `allow-discrete` stays out of the `transition` shorthand. A browser that
 * doesn't know `transition-behavior` drops the whole declaration when it is
 * in there, and with it every transition the shorthand sets (the accordion's
 * rows animation); as its own declaration it only costs the discrete one.
 */
const fs = require('fs');
const path = require('path');

const scss = (dir) =>
	fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const file = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			return entry.name === 'test' ? [] : scss(file);
		}

		return file.endsWith('.scss') ? [file] : [];
	});

// Filters' own stylesheet: a `::details-content` transition that is the only
// thing in its declaration, so there is nothing else to lose.
const SKIPPED = [path.join('blocks', 'filter', 'style.scss')];

describe('transitions', () => {
	it('never carry allow-discrete in the shorthand', () => {
		const offenders = scss(path.resolve(__dirname, '../..')).filter(
			(file) =>
				!SKIPPED.some((skipped) => file.endsWith(skipped)) &&
				/(?:^|[\s;{])transition\s*:[^;]*allow-discrete/.test(
					fs.readFileSync(file, 'utf8')
				)
		);

		expect(offenders).toEqual([]);
	});
});
