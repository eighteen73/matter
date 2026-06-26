/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { tabList } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import Edit from './edit';
import Save from './save';
import metadata from './block.json';
import './style.scss';

registerBlockType(metadata.name, {
	icon: tabList,
	edit: Edit,
	save: Save,
});
