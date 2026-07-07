import { __ } from '@wordpress/i18n';
import { createBlock } from '@wordpress/blocks';

/**
 * Extract button text from trigger inner blocks.
 *
 * @param {Array} innerBlocks Trigger inner blocks.
 * @return {string|undefined} Button text if found.
 */
export function getTriggerButtonText(innerBlocks) {
	const buttonsBlock = innerBlocks?.[0];
	const buttonBlock = buttonsBlock?.innerBlocks?.[0];

	if (
		buttonsBlock?.name !== 'core/buttons' ||
		buttonBlock?.name !== 'core/button'
	) {
		return undefined;
	}

	return buttonBlock.attributes?.text;
}

/**
 * Resolve an accessible name for a trigger block.
 *
 * @param {Array}  innerBlocks Trigger inner blocks.
 * @param {Object} attributes  Trigger block attributes.
 * @return {string|undefined} Accessible name if found.
 */
export function getTriggerAccessibleName(innerBlocks, attributes) {
	const buttonText = getTriggerButtonText(innerBlocks);

	if (buttonText) {
		return buttonText;
	}

	const accessibleLabel = attributes?.accessibleLabel?.trim();

	return accessibleLabel || undefined;
}

/**
 * Create a button trigger block.
 *
 * @param {Object} attributes Trigger block attributes.
 * @param {string} buttonText Button label text.
 * @return {Object} Block object.
 */
export function createButtonTrigger(attributes, buttonText) {
	return createBlock(
		'matter/trigger',
		{
			targetId: attributes.targetId || '',
			triggerType: 'button',
			accessibleLabel: '',
		},
		[
			createBlock('core/buttons', {}, [
				createBlock('core/button', {
					text: buttonText,
					tagName: 'button',
				}),
			]),
		]
	);
}

/**
 * Create a content trigger block.
 *
 * @param {Object} attributes      Trigger block attributes.
 * @param {string} accessibleLabel Optional accessible label.
 * @return {Object} Block object.
 */
export function createContentTrigger(attributes, accessibleLabel = '') {
	return createBlock(
		'matter/trigger',
		{
			targetId: attributes.targetId || '',
			triggerType: 'content',
			accessibleLabel,
		},
		[createBlock('core/group', {}, [])]
	);
}

/**
 * Block transforms from matter/trigger to matter/trigger-hamburger.
 *
 * @return {Object} Transform definition.
 */
export function triggerToTriggerHamburgerTransform() {
	return {
		type: 'block',
		blocks: ['matter/trigger-hamburger'],
		transform: (attributes, innerBlocks) => {
			const accessibleName = getTriggerAccessibleName(
				innerBlocks,
				attributes
			);

			return createBlock('matter/trigger-hamburger', {
				label: accessibleName || __('Open menu', 'matter'),
				showLabel: false,
				targetId: attributes.targetId || '',
			});
		},
	};
}

/**
 * Block transforms from matter/trigger-hamburger to matter/trigger (button).
 *
 * @return {Object} Transform definition.
 */
export function triggerHamburgerToTriggerTransform() {
	return {
		type: 'block',
		blocks: ['matter/trigger'],
		__experimentalLabel: () => __('Button trigger', 'matter'),
		transform: ({ label, showLabel, targetId }) => {
			const buttonText =
				showLabel && label ? label : __('Open', 'matter');

			return createButtonTrigger({ targetId }, buttonText);
		},
	};
}

/**
 * Block transforms from matter/trigger-hamburger to matter/trigger (content).
 *
 * @return {Object} Transform definition.
 */
export function triggerHamburgerToContentTriggerTransform() {
	return {
		type: 'block',
		blocks: ['matter/trigger'],
		__experimentalLabel: () => __('Group trigger', 'matter'),
		transform: ({ label, targetId }) =>
			createContentTrigger({ targetId }, label?.trim() || ''),
	};
}
