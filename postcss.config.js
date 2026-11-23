/**
 * Logical properties and `:dir()` stay as written (every supported browser
 * has them), so styles follow the direction of the content they're in, and
 * `:dir(rtl)` adds no specificity. `:is()` stays too (every supported browser
 * has it): expanded, `:is()` multiplies selectors (a panel's collapsed CSS
 * was 12 KB, inlined per panel, most of it copies for the editor), and
 * `:not()` around a list that has `:not()` in it came out wrong.
 */
module.exports = {
	plugins: {
		'postcss-preset-env': {
			features: {
				'dir-pseudo-class': false,
				'is-pseudo-class': false,
				'logical-properties-and-values': false,
			},
		},
	},
};
