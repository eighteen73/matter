/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { drawerRight } from '@wordpress/icons';
import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import Edit from './edit';
import metadata from './block.json';
import './style.scss';

registerBlockType(metadata.name, {
	icon: drawerRight,
	edit: Edit,
	save: () => <InnerBlocks.Content />,
});
