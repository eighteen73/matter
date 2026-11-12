/**
 * Queries shown as a carousel, accordion or tabs: a Query Loop (or, for
 * carousels, a Product Collection or Terms Query) that is itself the block
 * (see query-display/templates and Blocks\QueryDisplay for the front end).
 *
 * - A `matterDisplay` attribute on the query block (`type`, `style`,
 *   `scheme` and the block's own settings) shows it as that block. Its
 *   sidebar has the block's settings above the query's own controls.
 * - Carousels are live carousels around the query (their slides are the
 *   theme's loop items). Accordions and tabs are the server's rendering, as
 *   on the front end, which can be clicked through.
 * - Posts: "Posts carousel", "Posts accordion" and "Posts tabs" Query Loop
 *   variations, matched by `namespace`, with core's `allowedControls`.
 * - Products (carousels only): a "Products carousel" collection, with
 *   WooCommerce's `hideControls` (its Layout and Width settings are hidden by
 *   the editor stylesheet instead). No "Choose collection" button.
 * - Terms (carousels only): a "Terms carousel" Terms Query variation, matched
 *   by its display, with core's own controls (taxonomy, order, empty terms,
 *   nesting, chosen terms). Its slides are the theme's term loop items.
 * - In the post editor these replace the plain Query Loop, Product
 *   Collection (and WooCommerce's other collections) and Terms Query in the
 *   inserter. The Site Editor keeps them all, for templates.
 * - The query's items can't be selected, edited or added to.
 */

/**
 * WordPress dependencies
 */
import {
	getBlockType,
	getBlockVariations,
	registerBlockVariation,
	unregisterBlockVariation,
} from '@wordpress/blocks';
import { createHigherOrderComponent } from '@wordpress/compose';
import domReady from '@wordpress/dom-ready';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';
import { category, postList, store as shop } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import {
	ATTRIBUTE,
	DISPLAY_BLOCKS,
	ITEMS,
	NAMESPACES,
	POSTS,
	POSTS_CONTROLS,
	PRODUCTS,
	PRODUCTS_COLLECTION,
	PRODUCTS_HIDDEN_CONTROLS,
	PRODUCTS_LAYOUT,
	QUERY_BLOCKS,
	TERMS,
	TERMS_VARIATION,
	displayOf,
	postsTemplate,
	termsAttributes,
} from '../../../query-display/templates';
import CarouselEdit from './carousel-edit';
import PreviewEdit from './preview-edit';

const DISPLAY_ATTRIBUTE = { [ATTRIBUTE]: { type: 'object' } };
const DISPLAY_CONTEXT = 'matter/display';

// The Site Editor keeps the plain query blocks in its inserter.
const isPostEditor = () => !document.body.classList.contains('site-editor-php');

const POSTS_VARIATIONS = {
	carousel: {
		title: __('Posts carousel', 'matter'),
		description: __('Posts shown as slides.', 'matter'),
	},
	accordion: {
		title: __('Posts accordion', 'matter'),
		description: __(
			'Posts shown as an accordion: each post’s title opens its panel.',
			'matter'
		),
	},
	tabs: {
		title: __('Posts tabs', 'matter'),
		description: __(
			'Posts shown as tabs: each post’s title is a tab.',
			'matter'
		),
	},
};

/*
 * The attribute, on query blocks registered after this script (filter) and
 * before it (e.g. WooCommerce's, updated in the store).
 */
const withDisplay = (settings) => ({
	...settings,
	attributes: { ...settings.attributes, ...DISPLAY_ATTRIBUTE },
	// Loop items inside pick the theme's pattern for the block (also in the
	// post template's previews of its other items, which are outside the
	// editor's block tree but inside this context).
	providesContext: {
		...settings.providesContext,
		[DISPLAY_CONTEXT]: ATTRIBUTE,
	},
});

// Also reaches blocks registered before this script (e.g. WooCommerce's
// Product Collection): the post and site editors reapply block type filters
// when they start.
addFilter(
	'blocks.registerBlockType',
	'matter/query-display/attribute',
	(settings, name) =>
		QUERY_BLOCKS.includes(name) ? withDisplay(settings) : settings
);

// After the blocks register (their icons) and WooCommerce's registry loads.
domReady(() => {
	Object.entries(POSTS_VARIATIONS).forEach(([type, variation]) => {
		const [, attributes] = postsTemplate(type, 'post');

		registerBlockVariation(POSTS, {
			...variation,
			name: NAMESPACES[type],
			icon: getBlockType(DISPLAY_BLOCKS[type])?.icon?.src ?? postList,
			scope: isPostEditor() ? ['inserter'] : [],
			isDefault: isPostEditor() && type === 'carousel',
			attributes,
			isActive: ['namespace'],
			allowedControls: POSTS_CONTROLS,
			innerBlocks: [['core/post-template', {}, ITEMS[type]]],
		});
	});

	window.wc?.wcBlocksRegistry?.__experimentalRegisterProductCollection?.({
		name: PRODUCTS_COLLECTION,
		title: __('Products carousel', 'matter'),
		description: __('Products shown as slides.', 'matter'),
		icon: shop,
		scope: isPostEditor() ? ['inserter'] : [],
		attributes: {
			[ATTRIBUTE]: { type: 'carousel' },
			hideControls: PRODUCTS_HIDDEN_CONTROLS,
			displayLayout: PRODUCTS_LAYOUT,
			query: { perPage: 9 },
		},
		innerBlocks: [['woocommerce/product-template', {}, ITEMS.carousel]],
	});

	if (getBlockType(TERMS)) {
		registerBlockVariation(TERMS, {
			name: TERMS_VARIATION,
			title: __('Terms carousel', 'matter'),
			description: __(
				'Categories, tags or other terms shown as slides.',
				'matter'
			),
			icon: getBlockType(DISPLAY_BLOCKS.carousel)?.icon?.src ?? category,
			scope: isPostEditor() ? ['inserter'] : [],
			isDefault: isPostEditor(),
			attributes: termsAttributes(),
			// A Terms Query has no `namespace`: its display marks it.
			isActive: (attributes) => !!displayOf(TERMS, attributes),
			innerBlocks: [['core/term-template', {}, ITEMS.carousel]],
		});
	}

	if (!isPostEditor()) {
		return;
	}

	// Clients get Matter's, not the plain blocks or other collections.
	const ours = [
		...Object.values(NAMESPACES),
		PRODUCTS_COLLECTION,
		TERMS_VARIATION,
	];

	QUERY_BLOCKS.forEach((name) =>
		(getBlockVariations(name) ?? []).forEach((variation) => {
			if (
				!ours.includes(variation.name) &&
				variation.scope?.includes('inserter')
			) {
				unregisterBlockVariation(name, variation.name);
				registerBlockVariation(name, {
					...variation,
					isDefault: false,
					scope: variation.scope.filter(
						(scope) => scope !== 'inserter'
					),
				});
			}
		})
	);

	// The carousel collection stands in for the plain Product Collection.
	const products = (getBlockVariations(PRODUCTS) ?? []).find(
		({ name }) => name === PRODUCTS_COLLECTION
	);

	if (products && !products.isDefault) {
		unregisterBlockVariation(PRODUCTS, PRODUCTS_COLLECTION);
		registerBlockVariation(PRODUCTS, { ...products, isDefault: true });
	}
});

// Nothing can be added inside a displayed query: its items are fixed. (Core's
// filter for insertion rules; `__unstable` in name only, as WooCommerce uses
// it.)
addFilter(
	'blockEditor.__unstableCanInsertBlockType',
	'matter/query-display/locked-query',
	(canInsert, blockType, rootClientId, { getBlock }) => {
		const root = rootClientId ? getBlock(rootClientId) : null;

		return root && displayOf(root.name, root.attributes)
			? false
			: canInsert;
	}
);

const EDITS = {
	carousel: CarouselEdit,
	accordion: PreviewEdit,
	tabs: PreviewEdit,
};

addFilter(
	'editor.BlockEdit',
	'matter/query-display/edit',
	createHigherOrderComponent(
		(BlockEdit) =>
			function QueryDisplayEdit(props) {
				const display = displayOf(props.name, props.attributes);
				const Edit = display ? EDITS[display.type] : null;

				return Edit ? (
					<Edit BlockEdit={BlockEdit} props={props} />
				) : (
					<BlockEdit {...props} />
				);
			},
		'withQueryDisplay'
	)
);

// The query's own outline is drawn around the whole block instead (see
// editor/canvas.scss).
addFilter(
	'editor.BlockListBlock',
	'matter/query-display/outline',
	createHigherOrderComponent(
		(BlockListBlock) =>
			function QueryDisplayBlock(props) {
				return displayOf(props.name, props.attributes) ? (
					<BlockListBlock
						{...props}
						className={[props.className, 'is-display-query']
							.filter(Boolean)
							.join(' ')}
					/>
				) : (
					<BlockListBlock {...props} />
				);
			},
		'withQueryDisplayOutline'
	)
);
