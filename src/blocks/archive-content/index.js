/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { archive } from '@wordpress/icons';
import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import Edit from './edit';
import metadata from './block.json';

registerBlockType(metadata.name, {
	icon: archive,
	edit: Edit,
	save: () => <InnerBlocks.Content />,
});
