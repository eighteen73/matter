/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { tabPanel } from '@wordpress/icons';
import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import Edit from './edit';
import metadata from './block.json';

registerBlockType(metadata.name, {
	icon: tabPanel,
	edit: Edit,
	save: () => <InnerBlocks.Content />,
	__experimentalLabel: ({ label }) => label,
});
