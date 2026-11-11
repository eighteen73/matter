/**
 * The query blocks a carousel can hold as its slides. Each item is the
 * theme's loop item (`matter/loop-item`), so the design lives in the theme and
 * clients never need to edit the loop.
 *
 * A carousel's query is marked as Matter's (`namespace` on a Query Loop,
 * `collection` on a Product Collection), which gives it a "Posts carousel" /
 * "Products carousel" title and limits its native controls to those that make
 * sense for slides (see query-blocks.js).
 */

export const POSTS = 'core/query';
export const PRODUCTS = 'woocommerce/product-collection';
export const QUERY_BLOCKS = [POSTS, PRODUCTS];

export const POSTS_NAMESPACE = 'matter/carousel-posts';
export const PRODUCTS_COLLECTION = 'matter/product-collection/carousel';

// Query Loop controls a carousel offers (core's `allowedControls`).
export const POSTS_CONTROLS = [
	'postType',
	'postCount',
	'order',
	'sticky',
	'taxQuery',
	'author',
	'search',
	'excludeCurrent',
];

// Product Collection controls a carousel hides (WooCommerce's `hideControls`):
// a carousel shows one page of its own products.
export const PRODUCTS_HIDDEN_CONTROLS = [
	'inherit',
	'filterable',
	'offset',
	'max-pages-to-show',
	'default-order',
	'related-by',
];

// A stacked layout: WooCommerce's grid columns don't apply in a carousel
// (its slide widths come from the carousel's style).
export const PRODUCTS_LAYOUT = { type: 'list' };

/**
 * A query of posts (of a type) whose items become slides.
 *
 * @param {string} postType Post type.
 * @return {Array} Block template.
 */
export const queryTemplate = (postType) => [
	POSTS,
	{
		namespace: POSTS_NAMESPACE,
		query: { perPage: 9, postType, inherit: false },
	},
	[['core/post-template', {}, [['matter/loop-item']]]],
];

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
 * @return {Object} Block attributes.
 */
export const productsAttributes = () => ({
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

/**
 * A Product Collection whose products become slides.
 *
 * @return {Array} Block template.
 */
export const productsTemplate = () => [
	PRODUCTS,
	productsAttributes(),
	[['woocommerce/product-template', {}, [['matter/loop-item']]]],
];

/**
 * The attributes that make a carousel's query Matter's, for carousels made
 * before it was (or by hand). Empty when it already is.
 *
 * @param {string} name       Query block name.
 * @param {Object} attributes Its attributes.
 * @return {Object} Attributes to set.
 */
export function carouselQueryAttributes(name, attributes) {
	const changes = {};

	if (name === POSTS && attributes.namespace !== POSTS_NAMESPACE) {
		changes.namespace = POSTS_NAMESPACE;
	}

	if (name === PRODUCTS) {
		const hidden = attributes.hideControls ?? [];

		if (attributes.collection !== PRODUCTS_COLLECTION) {
			changes.collection = PRODUCTS_COLLECTION;
		}

		if (
			hidden.length !== PRODUCTS_HIDDEN_CONTROLS.length ||
			PRODUCTS_HIDDEN_CONTROLS.some(
				(control) => !hidden.includes(control)
			)
		) {
			changes.hideControls = PRODUCTS_HIDDEN_CONTROLS;
		}

		if (attributes.displayLayout?.type !== PRODUCTS_LAYOUT.type) {
			changes.displayLayout = PRODUCTS_LAYOUT;
		}
	}

	return changes;
}
