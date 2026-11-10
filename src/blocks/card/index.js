/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { postFeaturedImage } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import Edit from './edit';
import metadata from './block.json';

registerBlockType(metadata.name, {
	icon: postFeaturedImage,
	edit: Edit,
	save: () => null,
});
