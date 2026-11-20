/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { addFilter } from '@wordpress/hooks';
import { funnel } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import Edit from './edit';
import metadata from './block.json';
import { sourceIcon } from './icons';
import './style.scss';

const sources = () => window.matterEditor?.filterSources ?? [];

// Each variation ("Category filter", from the server) with its source's icon:
// in the inserter, the toolbar and the list view.
addFilter(
	'blocks.registerBlockType',
	'matter/filter/variation-icons',
	(settings, name) =>
		name !== metadata.name
			? settings
			: {
					...settings,
					variations: (settings.variations ?? []).map(
						(variation) => ({
							...variation,
							icon: sourceIcon(
								sources().find(
									({ key }) =>
										key === variation.attributes?.source
								)
							),
						})
					),
				}
);

registerBlockType(metadata.name, {
	icon: funnel,
	edit: Edit,
	save: () => null,
	// "Category filter", "Colour filter"…: one variation per source, from the
	// server (Filters\Filters::variations()).
	__experimentalLabel: ({ source, label }, { context }) => {
		if (context !== 'list-view' && context !== 'breadcrumb') {
			return undefined;
		}

		const found = sources().find(({ key }) => key === source);

		return label || found?.label || undefined;
	},
});
