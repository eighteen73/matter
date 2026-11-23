/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { symbolFilled } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import Edit from './edit';
import metadata from './block.json';

registerBlockType(metadata.name, {
	icon: symbolFilled,
	edit: Edit,
	// The part's title in List View and the breadcrumb, e.g. "Site header".
	__experimentalLabel: ({ slug }, { context }) =>
		context === 'list-view' || context === 'breadcrumb'
			? (window.matterEditor?.templateParts ?? []).find(
					(part) => part.slug === slug
				)?.title
			: undefined,
});
