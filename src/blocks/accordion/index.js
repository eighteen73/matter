/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { accordion } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import Edit from './edit';
import Save from './save';
import metadata from './block.json';
import variations from './variations';
import './style.scss';

registerBlockType(metadata.name, {
	icon: accordion,
	edit: Edit,
	save: Save,
	variations,
});
