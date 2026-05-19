/**
 * Resolves block colour attributes to a CSS custom property entry.
 *
 * @param {string|undefined} attribute       Preset colour slug.
 * @param {string|undefined} customAttribute Custom hex colour.
 * @param {string}           varName         CSS custom property name.
 * @return {Object} Style object fragment.
 */
export function getColorCSSVar(attribute, customAttribute, varName) {
	if (attribute) {
		return { [varName]: `var(--wp--preset--color--${attribute})` };
	}

	if (customAttribute) {
		return { [varName]: customAttribute };
	}

	return {};
}

export const DOT_COLOR_VAR = '--eighteen73-blocks--carousel--dot--color';
export const DOT_ACTIVE_COLOR_VAR =
	'--eighteen73-blocks--carousel--dot--color-active';
export const BUTTON_ICON_COLOR_VAR =
	'--eighteen73-blocks--carousel--button--icon-color';
export const PROGRESS_BAR_COLOR_VAR =
	'--eighteen73-blocks--carousel--progress--bar';

/**
 * Resolves preset slug and custom hex from attributes and withColors objects.
 *
 * @param {string|undefined} attrSlug   Attribute preset slug.
 * @param {string|undefined} attrCustom Attribute custom hex.
 * @param {Object|undefined} colorObj   withColors colour object.
 * @return {{ slug: string|undefined, custom: string|undefined }} Color pair object.
 */
export function resolveColorPair(attrSlug, attrCustom, colorObj) {
	const slug = attrSlug ?? colorObj?.slug;

	if (slug) {
		return { slug, custom: undefined };
	}

	return {
		slug: undefined,
		custom: attrCustom ?? colorObj?.color,
	};
}

/**
 * Builds inline style properties from colour pair configs.
 *
 * @param {Array<{ slug: string|undefined, custom: string|undefined, cssVar: string }>} configs Colour configs.
 * @return {Object} Style properties for useBlockProps.
 */
export function buildCustomColorStyles(configs) {
	return configs.reduce((styles, { slug, custom, cssVar }) => {
		return {
			...styles,
			...getColorCSSVar(slug, custom, cssVar),
		};
	}, {});
}

/**
 * Builds inline style properties from attribute definitions.
 *
 * @param {Object}        attributes     Block attributes.
 * @param {Array<Object>} definitions    Definition objects.
 * @param {Object}        [colorObjects] Optional withColors objects keyed by definition key.
 * @return {Object} Style properties for useBlockProps.
 */
export function buildCustomColorStylesFromAttributes(
	attributes,
	definitions,
	colorObjects = {}
) {
	const configs = definitions.map(
		({ slugAttr, customAttr, cssVar, colorKey }) => {
			const colorObj = colorKey ? colorObjects[colorKey] : null;
			const resolved = resolveColorPair(
				attributes[slugAttr],
				attributes[customAttr],
				colorObj
			);

			return {
				slug: resolved.slug,
				custom: resolved.custom,
				cssVar,
			};
		}
	);

	return buildCustomColorStyles(configs);
}

/**
 * Builds a semicolon-separated inline style string from attribute definitions.
 *
 * @param {Object}        attributes  Block attributes.
 * @param {Array<Object>} definitions Definition objects.
 * @return {string} Inline style string (may be empty).
 */
export function buildCustomColorStyleString(attributes, definitions) {
	const styles = buildCustomColorStylesFromAttributes(
		attributes,
		definitions
	);

	const style = Object.entries(styles)
		.map(([key, value]) => `${key}: ${value}`)
		.join('; ');

	// Trailing semicolon when merged with other inline style strings.
	return style ? `${style};` : '';
}

const DOT_COLOR_DEFINITIONS = [
	{
		slugAttr: 'dotColor',
		customAttr: 'customDotColor',
		cssVar: DOT_COLOR_VAR,
		colorKey: 'dotColor',
	},
	{
		slugAttr: 'dotActiveColor',
		customAttr: 'customDotActiveColor',
		cssVar: DOT_ACTIVE_COLOR_VAR,
		colorKey: 'dotActiveColor',
	},
];

const BUTTON_ICON_COLOR_DEFINITIONS = [
	{
		slugAttr: 'arrowColor',
		customAttr: 'customArrowColor',
		cssVar: BUTTON_ICON_COLOR_VAR,
		colorKey: 'arrowColor',
	},
];

const PROGRESS_BAR_COLOR_DEFINITIONS = [
	{
		slugAttr: 'barColor',
		customAttr: 'customBarColor',
		cssVar: PROGRESS_BAR_COLOR_VAR,
		colorKey: 'barColor',
	},
];

/**
 * Builds inline style properties for carousel dot colours.
 *
 * @param {Object}      attributes     Block attributes.
 * @param {Object|null} dotColor       withColors inactive dot object.
 * @param {Object|null} dotActiveColor withColors active dot object.
 * @return {Object} Style properties for useBlockProps.
 */
export function getDotColorStyles(attributes, dotColor, dotActiveColor) {
	return buildCustomColorStylesFromAttributes(
		attributes,
		DOT_COLOR_DEFINITIONS,
		{ dotColor, dotActiveColor }
	);
}

/**
 * Builds inline style properties for carousel nav button arrow colour.
 *
 * @param {Object}      attributes Block attributes.
 * @param {Object|null} arrowColor withColors arrow colour object.
 * @return {Object} Style properties for useBlockProps.
 */
export function getButtonIconColorStyles(attributes, arrowColor) {
	return buildCustomColorStylesFromAttributes(
		attributes,
		BUTTON_ICON_COLOR_DEFINITIONS,
		{ arrowColor }
	);
}

/**
 * Builds inline style properties for carousel progress bar colour.
 *
 * @param {Object}      attributes Block attributes.
 * @param {Object|null} barColor   withColors bar colour object.
 * @return {Object} Style properties for useBlockProps.
 */
export function getProgressBarColorStyles(attributes, barColor) {
	return buildCustomColorStylesFromAttributes(
		attributes,
		PROGRESS_BAR_COLOR_DEFINITIONS,
		{ barColor }
	);
}

/**
 * Builds a semicolon-separated inline style string for dot colour CSS variables.
 *
 * @param {Object} attributes Block attributes.
 * @return {string} Inline style string (may be empty).
 */
export function getDotColorStyleString(attributes) {
	return buildCustomColorStyleString(attributes, DOT_COLOR_DEFINITIONS);
}

/**
 * Builds a semicolon-separated inline style string for button arrow colour.
 *
 * @param {Object} attributes Block attributes.
 * @return {string} Inline style string (may be empty).
 */
export function getButtonIconColorStyleString(attributes) {
	return buildCustomColorStyleString(
		attributes,
		BUTTON_ICON_COLOR_DEFINITIONS
	);
}

/**
 * Builds a semicolon-separated inline style string for progress bar colour.
 *
 * @param {Object} attributes Block attributes.
 * @return {string} Inline style string (may be empty).
 */
export function getProgressBarColorStyleString(attributes) {
	return buildCustomColorStyleString(
		attributes,
		PROGRESS_BAR_COLOR_DEFINITIONS
	);
}

export {
	BUTTON_ICON_COLOR_DEFINITIONS,
	DOT_COLOR_DEFINITIONS,
	PROGRESS_BAR_COLOR_DEFINITIONS,
};
