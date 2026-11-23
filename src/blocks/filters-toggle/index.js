/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { settings } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import Edit from './edit';
import metadata from './block.json';
import './style.scss';

registerBlockType(metadata.name, {
	icon: settings,
	edit: Edit,
	save: () => null,
});
