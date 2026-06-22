/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { tabList } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import Edit from './edit';
import metadata from './block.json';
import './style.scss';

const { name } = metadata;

export { metadata, name };

registerBlockType(metadata.name, {
	icon: tabList,
	edit: Edit,
});
