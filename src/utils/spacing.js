/**
 * Resolve a stored spacing attribute to a CSS spacing value.
 *
 * @param {string} value Raw attribute value (slug or literal spacing).
 * @return {string} CSS spacing value.
 */
export function toCssSpacingValue(value) {
	if (!value) {
		return '0';
	}

	const stringValue = String(value);

	if (stringValue === '0') {
		return '0';
	}

	const presetMatch = stringValue.match(/var:preset\|spacing\|(.+)/);

	if (presetMatch) {
		return `var(--wp--preset--spacing--${presetMatch[1]})`;
	}

	if (/^(var\(|[\d.]+(px|rem|em|%|vh|vw)|clamp\()/i.test(stringValue)) {
		return stringValue;
	}

	return `var(--wp--preset--spacing--${stringValue})`;
}

/**
 * Build responsive CSS custom properties for spacing values.
 *
 * @param {Object}   params                  Params object.
 * @param {string}   params.prefix           Variable prefix without suffix.
 * @param {string}   params.baseValue        Base spacing value.
 * @param {Object}   params.breakpointLayers Breakpoint layers.
 * @param {string[]} params.breakpointTokens Breakpoint token list.
 * @return {Object<string, string>}           CSS variable map.
 */
export function buildResponsiveSpacingCssVars({
	prefix,
	baseValue,
	breakpointLayers,
	breakpointTokens,
}) {
	const styles = {
		[`${prefix}-base`]: toCssSpacingValue(baseValue),
	};

	for (const token of breakpointTokens) {
		const layerValue = breakpointLayers?.[token]?.options?.slideGap || '';
		styles[`${prefix}-${token}`] = toCssSpacingValue(
			layerValue || baseValue
		);
	}

	return styles;
}
