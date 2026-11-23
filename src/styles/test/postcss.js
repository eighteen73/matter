/**
 * The build leaves `:is()` as written. Expanded, a selector list inside
 * `:is()` multiplies every rule that uses it (a panel's collapsed CSS, which
 * is inlined per panel, was 12 KB), and `:not()` around an `:is()` list that
 * has `:not()` in it came out wrong, which un-gated every block.
 */
const { execFileSync } = require('child_process');
const path = require('path');

// postcss-preset-env is an ES module, so it runs in node, with the build's
// own config, rather than in Jest.
const run = (css) =>
	execFileSync(
		process.execPath,
		[
			'-e',
			`
			const postcss = require('postcss');
			const config = require('./postcss.config');
			Promise.all(
				Object.entries(config.plugins).map(async ([name, options]) =>
					(await import(name)).default(options)
				)
			)
				.then((plugins) =>
					postcss(plugins).process(process.argv[1], { from: undefined })
				)
				.then((result) => process.stdout.write(result.css));
			`,
			css,
		],
		{ cwd: path.resolve(__dirname, '../../..'), encoding: 'utf8' }
	);

describe('the stylesheet build', () => {
	it('keeps :is() as it is written', () => {
		const css = run(
			'.a:not(:is(.b, html.c:is(:not(.d), .e) *)) > .f { display: none; }'
		);

		expect(css).toContain(':not(:is(.b, html.c:is(:not(.d), .e) *))');
	});
});
