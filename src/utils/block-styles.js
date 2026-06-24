import { getConfigValue } from './config';
import { toCssSpacingValue } from './spacing';

/**
 * Resolve a stored color attribute to a CSS color value.
 *
 * @param {string|number} value Raw attribute value (slug or literal color).
 * @return {string|undefined} CSS color value.
 */
function toCssColorValue(value) {
	if (value === undefined || value === null || value === '') {
		return undefined;
	}

	const stringValue = String(value);

	if (/^(#|rgb|hsl)/i.test(stringValue)) {
		return stringValue;
	}

	return `var(--wp--preset--color--${stringValue})`;
}

/**
 * Get the attribute to block style map for a block.
 *
 * @param {string} blockKey Block key from config/block-styles.json.
 * @return {Object<string, Object>} Block style map.
 */
export function getBlockStyleMap(blockKey) {
	return getConfigValue('block-styles', blockKey, {});
}

/**
 * Resolve a stored attribute value to a CSS value by type.
 *
 * @param {string|number} value Raw attribute value.
 * @param {string}        type  Resolver type (color, spacing, number).
 * @return {string|undefined} CSS value.
 */
export function resolveBlockStyleValue(value, type) {
	if (value === undefined || value === null || value === '') {
		return undefined;
	}

	switch (type) {
		case 'color':
			return toCssColorValue(value);
		case 'spacing':
			return toCssSpacingValue(value);
		case 'number':
			return String(value);
		default:
			return undefined;
	}
}

/**
 * Build CSS custom property style object from attributes and a block style map.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} blockKey   Block key from config/block-styles.json.
 * @return {Object<string, string>} Style object.
 */
export function getBlockStyles(attributes, blockKey) {
	const styles = {};
	const blockStyleMap = getBlockStyleMap(blockKey);

	for (const [attributeName, config] of Object.entries(blockStyleMap)) {
		if (!config?.variable || !config?.type) {
			continue;
		}

		const resolvedValue = resolveBlockStyleValue(
			attributes?.[attributeName],
			config.type
		);

		if (resolvedValue !== undefined) {
			styles[config.variable] = resolvedValue;
		}
	}

	return styles;
}

/**
 * Compatibility alias while block edit files migrate to getBlockStyles().
 *
 * @param {Object} attributes Block attributes.
 * @param {string} blockKey   Block key from config/block-styles.json.
 * @return {Object<string, string>} Style object.
 */
export function getBlockCssVarStyles(attributes, blockKey) {
	return getBlockStyles(attributes, blockKey);
}
