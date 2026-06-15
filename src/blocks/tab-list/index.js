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

const { name } = metadata;

export { metadata, name };

registerBlockType(metadata.name, {
	icon: tabList,
	edit: Edit,
	save: Save,
});
