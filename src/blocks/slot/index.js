/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import Edit from './edit';
import { Slot as icon } from '../../components/icons/slot';
import metadata from './block.json';

/**
 * A slot's name as a label for the list view and breadcrumbs: `media-end`
 * becomes "Media end".
 *
 * @param {Object} attributes      Block attributes.
 * @param {string} attributes.name Slot name.
 * @return {string|undefined} Label, or undefined for the block's title.
 */
export const slotLabel = ({ name }) => {
	const words = String(name ?? '')
		.replace(/[-_]+/g, ' ')
		.trim();

	return words ? words.charAt(0).toUpperCase() + words.slice(1) : undefined;
};

registerBlockType(metadata.name, {
	edit: Edit,
	save: () => <InnerBlocks.Content />,
	icon,
	__experimentalLabel: slotLabel,
});
