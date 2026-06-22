/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { button } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import Edit from './edit';
import metadata from './block.json';
import './style.scss';

registerBlockType(metadata.name, {
	icon: button,
	edit: Edit,
});
