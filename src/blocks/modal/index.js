/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import Edit from './edit';
import metadata from './block.json';
// Shared by the modal, drawer and collapsible (every block's editor styles
// load in the editor, so once is enough).
import '../../overlay/editor/editor.scss';
import './style.scss';

registerBlockType(metadata.name, {
	edit: Edit,
	save: () => <InnerBlocks.Content />,
});
