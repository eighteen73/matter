/**
 * The overlays (modal, drawer, collapsible blocks) in what's being edited.
 */

/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

export const OVERLAY_BLOCKS = [
	'matter/modal',
	'matter/drawer',
	'matter/collapsible',
];

export const TYPE_LABELS = {
	'matter/modal': __('Modal', 'matter'),
	'matter/drawer': __('Drawer', 'matter'),
	'matter/collapsible': __('Collapsible', 'matter'),
};

const textOf = (html) =>
	String(html ?? '')
		.replace(/<[^>]*>/g, '')
		.trim();

/**
 * First heading text in a block tree.
 *
 * @param {Array} blocks Blocks.
 * @return {string} Heading text, or ''.
 */
const firstHeading = (blocks) => {
	for (const block of blocks) {
		const text =
			block.name === 'core/heading'
				? textOf(block.attributes.content)
				: firstHeading(block.innerBlocks ?? []);

		if (text) {
			return text;
		}
	}

	return '';
};

/**
 * First text (e.g. a button's) in a block tree.
 *
 * @param {Array} blocks Blocks.
 * @return {string} Text, or ''.
 */
const firstText = (blocks) => {
	for (const block of blocks) {
		const text =
			textOf(block.attributes.text ?? block.attributes.content) ||
			firstText(block.innerBlocks ?? []);

		if (text) {
			return text;
		}
	}

	return '';
};

/**
 * Client IDs of the overlay blocks being edited.
 *
 * @param {Function} select Registry select.
 * @return {string[]} Client IDs.
 */
export const getOverlayIds = (select) =>
	select(blockEditorStore).getBlocksByName(OVERLAY_BLOCKS);

/**
 * An overlay's details for lists and link suggestions.
 *
 * @param {Function} select   Registry select.
 * @param {string}   clientId Block client ID.
 * @return {Object|null} { clientId, name, type, id, title, hasTrigger, attributes }.
 */
export const getOverlay = (select, clientId) => {
	const { getBlock } = select(blockEditorStore);
	const block = getBlock(clientId);

	if (!block) {
		return null;
	}

	const { attributes, innerBlocks = [] } = block;
	const slot = (name) =>
		innerBlocks.find((inner) => inner.attributes.name === name);
	const type = TYPE_LABELS[block.name];

	return {
		clientId,
		name: block.name,
		type,
		id: attributes.overlayId,
		// Its name, else its first heading, else its trigger's text.
		title:
			attributes.label?.trim() ||
			firstHeading(slot('content')?.innerBlocks ?? []) ||
			firstText(slot('trigger')?.innerBlocks ?? []) ||
			type,
		hasTrigger: !!slot('trigger')?.innerBlocks.length,
		attributes,
	};
};
