import { __ } from '@wordpress/i18n';
import { createBlock } from '@wordpress/blocks';

/**
 * Extract button text from trigger inner blocks.
 *
 * @param {Array} innerBlocks Trigger inner blocks.
 * @return {string|undefined} Button text if found.
 */
function getTriggerButtonText(innerBlocks) {
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
 * Block transforms from matter/trigger to matter/trigger-hamburger.
 *
 * @return {Object} Transform definition.
 */
export function triggerToTriggerHamburgerTransform() {
	return {
		type: 'block',
		blocks: ['matter/trigger-hamburger'],
		transform: (attributes, innerBlocks) => {
			const buttonText = getTriggerButtonText(innerBlocks);

			return createBlock('matter/trigger-hamburger', {
				label: buttonText || __('Open menu', 'matter'),
				showLabel: false,
				targetId: attributes.targetId || '',
			});
		},
	};
}

/**
 * Block transforms from matter/trigger-hamburger to matter/trigger.
 *
 * @return {Object} Transform definition.
 */
export function triggerHamburgerToTriggerTransform() {
	return {
		type: 'block',
		blocks: ['matter/trigger'],
		transform: ({ label, showLabel, targetId }) => {
			const buttonText =
				showLabel && label ? label : __('Open', 'matter');

			return createBlock(
				'matter/trigger',
				{
					targetId: targetId || '',
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
		},
	};
}
