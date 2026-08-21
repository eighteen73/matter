/**
 * WordPress dependencies
 */
import {
	getBlockSupport,
	getBlockType,
	hasBlockSupport,
} from '@wordpress/blocks';

/**
 * Support helpers mirrored from Gutenberg block-editor hooks/supports
 * for determining which style attributes can transfer between blocks.
 */

const BORDER_SUPPORT_KEY = '__experimentalBorder';
const COLOR_SUPPORT_KEY = 'color';
const CUSTOM_CLASS_NAME_SUPPORT_KEY = 'customClassName';
const FONT_FAMILY_SUPPORT_KEY = 'typography.__experimentalFontFamily';
const FONT_SIZE_SUPPORT_KEY = 'typography.fontSize';
const LINE_HEIGHT_SUPPORT_KEY = 'typography.lineHeight';
const FONT_STYLE_SUPPORT_KEY = 'typography.__experimentalFontStyle';
const FONT_WEIGHT_SUPPORT_KEY = 'typography.__experimentalFontWeight';
const TEXT_ALIGN_SUPPORT_KEY = 'typography.textAlign';
const TEXT_COLUMNS_SUPPORT_KEY = 'typography.textColumns';
const TEXT_DECORATION_SUPPORT_KEY = 'typography.__experimentalTextDecoration';
const WRITING_MODE_SUPPORT_KEY = 'typography.__experimentalWritingMode';
const TEXT_TRANSFORM_SUPPORT_KEY = 'typography.__experimentalTextTransform';
const LETTER_SPACING_SUPPORT_KEY = 'typography.__experimentalLetterSpacing';
const LAYOUT_SUPPORT_KEY = 'layout';
const SPACING_SUPPORT_KEY = 'spacing';
const DIMENSIONS_SUPPORT_KEY = 'dimensions';
const ASPECT_RATIO_SUPPORT_KEY = 'dimensions.aspectRatio';

const TYPOGRAPHY_SUPPORT_KEYS = [
	LINE_HEIGHT_SUPPORT_KEY,
	FONT_SIZE_SUPPORT_KEY,
	FONT_STYLE_SUPPORT_KEY,
	FONT_WEIGHT_SUPPORT_KEY,
	FONT_FAMILY_SUPPORT_KEY,
	TEXT_ALIGN_SUPPORT_KEY,
	TEXT_COLUMNS_SUPPORT_KEY,
	TEXT_DECORATION_SUPPORT_KEY,
	TEXT_TRANSFORM_SUPPORT_KEY,
	WRITING_MODE_SUPPORT_KEY,
	LETTER_SPACING_SUPPORT_KEY,
];

const STYLE_SUPPORT_KEYS = [
	'shadow',
	...TYPOGRAPHY_SUPPORT_KEYS,
	BORDER_SUPPORT_KEY,
	COLOR_SUPPORT_KEY,
	SPACING_SUPPORT_KEY,
	DIMENSIONS_SUPPORT_KEY,
];

/**
 * @param {string|Object} nameOrType Block name or type.
 * @return {boolean} Whether align is supported.
 */
export const hasAlignSupport = (nameOrType) =>
	hasBlockSupport(nameOrType, 'align');

/**
 * @param {string|Object} nameOrType Block name or type.
 * @param {string}        feature    Border feature.
 * @return {boolean} Whether border support exists.
 */
export function hasBorderSupport(nameOrType, feature = 'any') {
	const support = getBlockSupport(nameOrType, BORDER_SUPPORT_KEY);

	if (support === true) {
		return true;
	}

	if (feature === 'any') {
		return !!(
			support?.color ||
			support?.radius ||
			support?.width ||
			support?.style
		);
	}

	return !!support?.[feature];
}

/**
 * @param {string|Object} nameOrType Block name or type.
 * @return {boolean} Whether background color is supported.
 */
export const hasBackgroundColorSupport = (nameOrType) => {
	const colorSupport = getBlockSupport(nameOrType, COLOR_SUPPORT_KEY);
	return colorSupport && colorSupport.background !== false;
};

/**
 * @param {string|Object} nameOrType Block name or type.
 * @return {boolean} Whether text align is supported.
 */
export const hasTextAlignSupport = (nameOrType) =>
	hasBlockSupport(nameOrType, TEXT_ALIGN_SUPPORT_KEY);

/**
 * @param {string|Object} nameOrType Block name or type.
 * @return {boolean} Whether text color is supported.
 */
export const hasTextColorSupport = (nameOrType) => {
	const colorSupport = getBlockSupport(nameOrType, COLOR_SUPPORT_KEY);
	return colorSupport && colorSupport.text !== false;
};

/**
 * @param {string|Object} nameOrType Block name or type.
 * @return {boolean} Whether gradients are supported.
 */
export const hasGradientSupport = (nameOrType) => {
	const colorSupport = getBlockSupport(nameOrType, COLOR_SUPPORT_KEY);
	return (
		colorSupport !== null &&
		typeof colorSupport === 'object' &&
		!!colorSupport.gradients
	);
};

/**
 * @param {string|Object} nameOrType Block name or type.
 * @return {boolean} Whether custom class names are supported.
 */
export const hasCustomClassNameSupport = (nameOrType) =>
	hasBlockSupport(nameOrType, CUSTOM_CLASS_NAME_SUPPORT_KEY, true);

/**
 * @param {string|Object} nameOrType Block name or type.
 * @return {boolean} Whether font family is supported.
 */
export const hasFontFamilySupport = (nameOrType) =>
	hasBlockSupport(nameOrType, FONT_FAMILY_SUPPORT_KEY);

/**
 * @param {string|Object} nameOrType Block name or type.
 * @return {boolean} Whether font size is supported.
 */
export const hasFontSizeSupport = (nameOrType) =>
	hasBlockSupport(nameOrType, FONT_SIZE_SUPPORT_KEY);

/**
 * @param {string|Object} nameOrType Block name or type.
 * @return {boolean} Whether layout is supported.
 */
export const hasLayoutSupport = (nameOrType) =>
	hasBlockSupport(nameOrType, LAYOUT_SUPPORT_KEY);

/**
 * Whether the block supports aspect ratio via attribute or dimensions support.
 *
 * @param {string|Object} nameOrType Block name or type.
 * @return {boolean} Whether aspect ratio can be synced.
 */
export const hasAspectRatioSupport = (nameOrType) => {
	if (hasBlockSupport(nameOrType, ASPECT_RATIO_SUPPORT_KEY)) {
		return true;
	}

	const blockType =
		typeof nameOrType === 'string' ? getBlockType(nameOrType) : nameOrType;

	return !!blockType?.attributes?.aspectRatio;
};

/**
 * Whether the block supports object-fit scale (paired with aspect ratio on Image).
 *
 * @param {string|Object} nameOrType Block name or type.
 * @return {boolean} Whether scale can be synced.
 */
export const hasScaleSupport = (nameOrType) => {
	const blockType =
		typeof nameOrType === 'string' ? getBlockType(nameOrType) : nameOrType;

	return !!blockType?.attributes?.scale;
};

/**
 * @param {string|Object} nameOrType Block name or type.
 * @return {boolean} Whether any style-related support exists.
 */
export const hasStyleSupport = (nameOrType) =>
	STYLE_SUPPORT_KEYS.some((key) => hasBlockSupport(nameOrType, key));
