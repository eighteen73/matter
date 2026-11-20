/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { gallery } from '@wordpress/icons';
import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import Edit from './edit';
import metadata from './block.json';
import './editor.scss';
import './style.scss';

registerBlockType(metadata.name, {
	icon: gallery,
	edit: Edit,
	save: () => <InnerBlocks.Content />,
});
