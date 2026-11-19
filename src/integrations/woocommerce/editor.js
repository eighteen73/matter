/**
 * WooCommerce integration: the editor's "Products carousel".
 *
 * Enqueued by Integrations\WooCommerce only when WooCommerce is active, after
 * Matter's editor script (its dependency), whose helpers it uses from
 * `window.matterEditor.queryDisplay`. On the server the integration adds the
 * Product Collection to the query blocks that can be shown as a carousel, so
 * Matter's editor already treats it as one; this adds what's particular to
 * WooCommerce:
 *
 * - A "Products carousel" collection, registered with WooCommerce's
 *   `__experimentalRegisterProductCollection`, with WooCommerce's
 *   `hideControls` (its Layout and Width settings are hidden by
 *   editor.scss). No "Choose collection" button. In the post editor it's the
 *   Product Collection's default, standing in for the plain block.
 * - The carousel slide picker's "Products" option and the products carousel
 *   it inserts.
 * - The attributes that mark a Product Collection carousel as Matter's.
 */

/**
 * WordPress dependencies
 */
import {
	getBlockVariations,
	registerBlockVariation,
	unregisterBlockVariation,
} from '@wordpress/blocks';
import domReady from '@wordpress/dom-ready';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';
import { store as shop } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import './editor.scss';

const PRODUCTS = 'woocommerce/product-collection';
const PRODUCTS_COLLECTION = 'matter/product-collection/carousel';

// Product Collection controls a carousel hides (WooCommerce's `hideControls`):
// a carousel shows one page of its own products.
const PRODUCTS_HIDDEN_CONTROLS = [
	'inherit',
	'filterable',
	'offset',
	'max-pages-to-show',
	'default-order',
	'related-by',
];

// A stacked layout: WooCommerce's grid columns don't apply in a carousel
// (its slide widths come from the carousel's style).
const PRODUCTS_LAYOUT = { type: 'list' };

const { ATTRIBUTE, ITEMS, isPostEditor, queryExample } =
	window.matterEditor?.queryDisplay ?? {};

/**
 * WooCommerce's stock statuses to show, as its own Product Collection
 * defaults them (all, less out of stock when the store hides those).
 *
 * @return {Array|undefined} Stock status keys, if WooCommerce's settings are loaded.
 */
function stockStatuses() {
	const getSetting =
		window.wc?.wcSettings?.getSetting ??
		((name, fallback) => window.wcSettings?.[name] ?? fallback);
	const options = Object.keys(getSetting('stockStatusOptions', {}) ?? {});

	if (!options.length) {
		return undefined;
	}

	return getSetting('hideOutOfStockItems', false)
		? options.filter((status) => status !== 'outofstock')
		: options;
}

/**
 * A Product Collection's attributes, as WooCommerce sets them for its
 * "Product Catalog" collection, as Matter's carousel collection. With inner
 * blocks it shows products straight away rather than the collection chooser.
 * The whole `query` is given because WooCommerce replaces, rather than
 * merges, it.
 *
 * @param {string} style Carousel style (block style name), if any.
 * @return {Object} Block attributes.
 */
const productsAttributes = (style) => ({
	[ATTRIBUTE]: { type: 'carousel', ...(style && { style }) },
	query: {
		perPage: 9,
		pages: 0,
		offset: 0,
		postType: 'product',
		order: 'desc',
		orderBy: 'date',
		search: '',
		exclude: [],
		inherit: false,
		taxQuery: {},
		isProductCollectionBlock: true,
		featured: false,
		woocommerceOnSale: false,
		woocommerceStockStatus: stockStatuses(),
		woocommerceAttributes: [],
		woocommerceHandPickedProducts: [],
		filterable: false,
		relatedBy: { categories: true, tags: true },
	},
	tagName: 'div',
	collection: PRODUCTS_COLLECTION,
	hideControls: PRODUCTS_HIDDEN_CONTROLS,
	displayLayout: PRODUCTS_LAYOUT,
	dimensions: { widthType: 'fill' },
	queryContextIncludes: ['collection'],
	forcePageReload: false,
});

// A new products carousel, from the carousel's slide picker.
addFilter(
	'matter.queryDisplay.carouselTemplate',
	'matter/woocommerce/carousel-template',
	(template, name, style) =>
		name === PRODUCTS
			? [
					PRODUCTS,
					productsAttributes(style),
					[['woocommerce/product-template', {}, ITEMS.carousel]],
				]
			: template
);

// The slide picker's "Products" option, after posts.
addFilter(
	'matter.carousel.queryOptions',
	'matter/woocommerce/query-option',
	(options) => [
		...options,
		{
			name: PRODUCTS,
			title: __('Products', 'matter'),
			description: __('One slide per product.', 'matter'),
		},
	]
);

// A products carousel made before (or by hand) is marked as Matter's.
addFilter(
	'matter.queryDisplay.displayAttributes',
	'matter/woocommerce/display-attributes',
	(changes, name, attributes) => {
		if (name !== PRODUCTS) {
			return changes;
		}

		const hidden = attributes.hideControls ?? [];

		return {
			...changes,
			...(attributes.collection !== PRODUCTS_COLLECTION && {
				collection: PRODUCTS_COLLECTION,
			}),
			...((hidden.length !== PRODUCTS_HIDDEN_CONTROLS.length ||
				PRODUCTS_HIDDEN_CONTROLS.some(
					(control) => !hidden.includes(control)
				)) && { hideControls: PRODUCTS_HIDDEN_CONTROLS }),
			...(attributes.displayLayout?.type !== PRODUCTS_LAYOUT.type && {
				displayLayout: PRODUCTS_LAYOUT,
			}),
		};
	}
);

// After WooCommerce's registry loads, and after Matter's editor script has
// moved the Product Collection's other collections out of the inserter.
domReady(() => {
	if (!ATTRIBUTE) {
		return;
	}

	const attributes = {
		[ATTRIBUTE]: { type: 'carousel' },
		hideControls: PRODUCTS_HIDDEN_CONTROLS,
		displayLayout: PRODUCTS_LAYOUT,
		query: { perPage: 9 },
	};
	const innerBlocks = [['woocommerce/product-template', {}, ITEMS.carousel]];

	window.wc?.wcBlocksRegistry?.__experimentalRegisterProductCollection?.({
		name: PRODUCTS_COLLECTION,
		title: __('Products carousel', 'matter'),
		description: __('Products shown as slides.', 'matter'),
		icon: shop,
		scope: isPostEditor() ? ['inserter'] : [],
		attributes,
		innerBlocks,
		example: queryExample(
			{ ...attributes, collection: PRODUCTS_COLLECTION },
			innerBlocks
		),
	});

	if (!isPostEditor()) {
		return;
	}

	// The carousel collection stands in for the plain Product Collection.
	const products = (getBlockVariations(PRODUCTS) ?? []).find(
		({ name }) => name === PRODUCTS_COLLECTION
	);

	if (products && !products.isDefault) {
		unregisterBlockVariation(PRODUCTS, PRODUCTS_COLLECTION);
		registerBlockVariation(PRODUCTS, { ...products, isDefault: true });
	}
});
