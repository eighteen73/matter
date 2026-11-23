/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { termCount } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import Edit from './edit';
import metadata from './block.json';

registerBlockType(metadata.name, {
	icon: termCount,
	edit: Edit,
	save: () => null,
});
