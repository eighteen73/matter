/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { accordionItem } from '@wordpress/icons';
import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import Edit from './edit';
import metadata from './block.json';

registerBlockType(metadata.name, {
	icon: accordionItem,
	edit: Edit,
	save: () => <InnerBlocks.Content />,
	__experimentalLabel: ({ title }) => title,
});
