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
	// Clients see the item's post type ("Product", "Post") in List View and
	// the breadcrumb; developers see "Loop item" in the block's details.
	__experimentalLabel: ({ itemLabel }) => itemLabel,
});
