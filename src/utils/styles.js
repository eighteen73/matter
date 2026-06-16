/**
 * Get CSS declarations.
 *
 * @param {Object} values Resolved values.
 * @param {string} prefix Prefix.
 * @return {Object<string, string>} CSS declarations.
 */
export function getCssDeclarations(values, prefix = '--matter') {
	return Object.fromEntries(
		Object.entries(values).map(([key, value]) => [
			`${prefix}--${key}`,
			value,
		])
	);
}

/**
 * Compile CSS rules into a stylesheet string.
 *
 * @param {Array} rules CSS rules.
 * @return {string} Stylesheet.
 */
export function compileCssRules(rules) {
	return rules
		.map(({ rulesGroup, selector, declarations }) => {
			const cssDeclarations = Object.entries(declarations)
				.map(([property, value]) => `${property}:${value}`)
				.join(';');
			const rule = `${selector}{${cssDeclarations}}`;

			return rulesGroup ? `${rulesGroup}{${rule}}` : rule;
		})
		.join('');
}
