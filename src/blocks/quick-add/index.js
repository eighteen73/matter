/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { plus } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import Edit from './edit';
import metadata from './block.json';
import './style.scss';

registerBlockType(metadata.name, {
	icon: plus,
	edit: Edit,
	save: () => null,
});
