/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { tabs } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import Edit from './edit';
import Save from './save';
import metadata from './block.json';
import variations from './variations';
import './style.scss';

const { name } = metadata;

export { metadata, name };

registerBlockType(metadata.name, {
	icon: tabs,
	edit: Edit,
	save: Save,
	variations,
});
