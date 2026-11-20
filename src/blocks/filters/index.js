/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { funnel } from '@wordpress/icons';
import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import Edit from './edit';
import metadata from './block.json';
import './editor.scss';
import './style.scss';

registerBlockType(metadata.name, {
	icon: funnel,
	edit: Edit,
	save: () => <InnerBlocks.Content />,
});
