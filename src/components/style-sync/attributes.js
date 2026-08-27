/**
 * WordPress dependencies
 */
import { applyFilters } from '@wordpress/hooks';
import { getBlockType } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import { stripOrderClasses } from '../../extensions/order/class-names';
import {
	hasAlignSupport,
	hasAspectRatioSupport,
	hasBorderSupport,
	hasBackgroundColorSupport,
	hasTextAlignSupport,
	hasTextColorSupport,
	hasGradientSupport,
	hasCustomClassNameSupport,
	hasFontFamilySupport,
	hasFontSizeSupport,
	hasLayoutSupport,
	hasScaleSupport,
	hasStyleSupport,
} from './supports';

/**
 * Default style attributes allowlist, matching Gutenberg Copy/Paste Styles
 * plus aspect ratio / scale for blocks like Image.
 *
 * Each value is a support checker `( blockName ) => boolean`.
 *
 * Filterable via `matter.styleSync.attributes` so custom blocks can
 * append keys (e.g. bespoke colour attributes). Custom keys without a checker
 * function are treated as transferable when both block types define the attribute.
 *
 * @type {Object.<string, Function|true>}
 */
export const DEFAULT_STYLE_ATTRIBUTES = {
	align: hasAlignSupport,
	aspectRatio: hasAspectRatioSupport,
	borderColor: (nameOrType) => hasBorderSupport(nameOrType, 'color'),
	backgroundColor: hasBackgroundColorSupport,
	textAlign: hasTextAlignSupport,
	textColor: hasTextColorSupport,
	gradient: hasGradientSupport,
	className: hasCustomClassNameSupport,
	fontFamily: hasFontFamilySupport,
	fontSize: hasFontSizeSupport,
	layout: hasLayoutSupport,
	scale: hasScaleSupport,
	// Includes style.spacing, style.dimensions.aspectRatio, typography, color, border, etc.
	style: hasStyleSupport,
};

/**
 * Get the filtered style attributes map.
 *
 * @return {Object.<string, Function|true>} Attribute key to support checker.
 */
export function getStyleAttributesMap() {
	return applyFilters(
		'matter.styleSync.attributes',
		DEFAULT_STYLE_ATTRIBUTES
	);
}

/**
 * Whether a style attribute can transfer between two blocks.
 *
 * @param {string}        attributeKey Attribute name.
 * @param {Function|true} hasSupport   Support checker or true.
 * @param {string}        sourceName   Source block name.
 * @param {string}        targetName   Target block name.
 * @return {boolean} Whether the attribute may be applied.
 */
function canTransferAttribute(
	attributeKey,
	hasSupport,
	sourceName,
	targetName
) {
	if (typeof hasSupport === 'function') {
		return hasSupport(sourceName) && hasSupport(targetName);
	}

	// Custom filtered attributes: require the attribute on both block types.
	const sourceType = getBlockType(sourceName);
	const targetType = getBlockType(targetName);

	return (
		!!sourceType?.attributes?.[attributeKey] &&
		!!targetType?.attributes?.[attributeKey]
	);
}

/**
 * Normalize a style attribute so column-order utilities are not synced.
 *
 * @param {string} attributeKey Attribute name.
 * @param {*}      value        Attribute value.
 * @return {*} Sanitized value.
 */
function sanitizeStyleAttribute(attributeKey, value) {
	if (attributeKey !== 'className') {
		return value;
	}

	return stripOrderClasses(value) || undefined;
}

/**
 * Extract transferable style attributes from a source block for a target.
 *
 * @param {Object} sourceBlock Source block.
 * @param {Object} targetBlock Target block.
 * @return {Object} Attributes to apply.
 */
export function getStyleAttributes(sourceBlock, targetBlock) {
	const map = getStyleAttributesMap();

	return Object.entries(map).reduce(
		(attributes, [attributeKey, hasSupport]) => {
			if (
				canTransferAttribute(
					attributeKey,
					hasSupport,
					sourceBlock.name,
					targetBlock.name
				)
			) {
				attributes[attributeKey] = sanitizeStyleAttribute(
					attributeKey,
					sourceBlock.attributes?.[attributeKey]
				);
			}
			return attributes;
		},
		{}
	);
}

/**
 * Build a stable snapshot of style-related attributes for change detection.
 *
 * @param {Object} blockAttributes Block attributes.
 * @return {string} Serialized snapshot.
 */
export function getStyleSnapshot(blockAttributes = {}) {
	const map = getStyleAttributesMap();
	const snapshot = {};

	Object.keys(map).forEach((key) => {
		if (key in blockAttributes) {
			snapshot[key] = sanitizeStyleAttribute(key, blockAttributes[key]);
		}
	});

	return JSON.stringify(snapshot);
}

/**
 * Whether two style snapshots differ.
 *
 * @param {string} previous Previous snapshot.
 * @param {string} next     Next snapshot.
 * @return {boolean} True when styles changed.
 */
export function hasStyleSnapshotChanged(previous, next) {
	return previous !== next;
}
