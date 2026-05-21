import { getConfigValue } from './config';

/**
 * Get the attribute to CSS variable map for a block.
 *
 * @param {string} blockKey Block key from config/colors.json (e.g. 'navigation').
 * @return {Object<string, string>} Color variable map.
 */
export function getBlockColorMap(blockKey) {
	return getConfigValue('colors', blockKey, {});
}

/**
 * Resolve a stored color attribute to a CSS color value.
 *
 * @param {string} value Raw attribute value (slug or literal color).
 * @return {string|undefined} CSS color value.
 */
export function toCssColorValue(value) {
	if (!value) {
		return undefined;
	}

	if (/^(#|rgb|hsl)/i.test(value)) {
		return value;
	}

	return `var(--wp--preset--color--${value})`;
}

/**
 * Build CSS custom property style object from attributes and a block color map.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} blockKey   Block key from config/colors.json.
 * @return {Object<string, string>} Style object.
 */
export function getColorStyles(attributes, blockKey) {
	const styles = {};
	const colorVarMap = getBlockColorMap(blockKey);

	for (const [attributeName, cssVariable] of Object.entries(colorVarMap)) {
		const resolvedValue = toCssColorValue(attributes?.[attributeName]);

		if (resolvedValue) {
			styles[cssVariable] = resolvedValue;
		}
	}

	return styles;
}

/**
 * Store slug when available, otherwise the literal color value.
 *
 * @param {string|undefined} slug  Palette slug.
 * @param {string|undefined} value Literal color value.
 * @return {string} Persisted attribute value.
 */
export function storeColorValue(slug, value) {
	return slug || value || '';
}
