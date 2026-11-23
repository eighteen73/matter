/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { postList } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import Edit from './edit';
import metadata from './block.json';
import './editor.scss';

registerBlockType(metadata.name, {
	icon: postList,
	edit: Edit,
	save: () => null,
});
