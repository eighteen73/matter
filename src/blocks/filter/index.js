/**
 * WordPress dependencies
 */
import {
	getBlockVariations,
	registerBlockType,
	registerBlockVariation,
	unregisterBlockVariation,
} from '@wordpress/blocks';
import { select, subscribe } from '@wordpress/data';
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

// The variations a listing offers: those for what it lists, so a blog's
// filters offer a post's category and a shop's a product's (both are named
// "Category"). Core can't vary them by where they're inserted, so they're
// registered again when the selection moves to a listing of another post
// type (filters are only inserted in a listing, so one is selected).
let all;
let offeredFor;

subscribe(() => {
	const { getSelectedBlockClientId, getBlockParents, getBlockAttributes } =
		select('core/block-editor');
	const selected = getSelectedBlockClientId();

	if (!selected) {
		return;
	}

	const query = [selected, ...getBlockParents(selected, true)]
		.map((clientId) => getBlockAttributes(clientId)?.query)
		.find((attributes) => attributes?.postType);
	const postType = query?.postType;

	if (!postType || postType === offeredFor) {
		return;
	}

	offeredFor = postType;
	all ??= getBlockVariations(metadata.name) ?? [];

	const fits = (variation) => {
		const postTypes = sources().find(
			({ key }) => key === variation.attributes?.source
		)?.postTypes;

		return !postTypes?.length || postTypes.includes(postType);
	};

	for (const variation of all) {
		unregisterBlockVariation(metadata.name, variation.name);
	}

	for (const variation of all.filter(fits)) {
		registerBlockVariation(metadata.name, variation);
	}
}, 'core/block-editor');
