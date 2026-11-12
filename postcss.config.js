/**
 * Logical properties and `:dir()` stay as written (every supported browser
 * has them), so styles follow the direction of the content they're in, and
 * `:dir(rtl)` adds no specificity.
 */
module.exports = {
	plugins: {
		'postcss-preset-env': {
			features: {
				'dir-pseudo-class': false,
				'logical-properties-and-values': false,
			},
		},
	},
};
