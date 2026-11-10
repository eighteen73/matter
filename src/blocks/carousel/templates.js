/**
 * The query blocks a carousel can hold as its slides. Each item is the
 * theme's card (`matter/card`), so the design lives in the theme and clients
 * never need to edit the loop.
 */

export const POSTS = 'core/query';
export const PRODUCTS = 'woocommerce/product-collection';
export const QUERY_BLOCKS = [POSTS, PRODUCTS];

/**
 * A query of posts (of a type) whose items become slides.
 *
 * @param {string} postType Post type.
 * @return {Array} Block template.
 */
export const queryTemplate = (postType) => [
	POSTS,
	{ query: { perPage: 9, postType, inherit: false } },
	[['core/post-template', {}, [['matter/card']]]],
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
 * "Product Catalog" collection (no `collection`: with inner blocks it shows
 * products straight away rather than the collection chooser). The whole
 * `query` is given because WooCommerce replaces, rather than merges, it.
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
	displayLayout: { type: 'flex', columns: 3, shrinkColumns: true },
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
	[['woocommerce/product-template', {}, [['matter/card']]]],
];
