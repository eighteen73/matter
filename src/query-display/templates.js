/**
 * Queries shown as a carousel, accordion or tabs (see Blocks\QueryDisplay for
 * the front end and editor/extensions/query-display for the editor).
 *
 * The query block itself is the carousel, accordion or tabs: a
 * `matterDisplay` attribute holds the type, the block's style and colour
 * scheme and its own settings. It's marked as Matter's (`namespace` on a
 * Query Loop, `collection` on a Product Collection) for its title and the
 * native controls it offers. Its items are fixed: the theme's loop item for
 * a carousel's slides, or an accordion item or tab holding the theme's panel
 * design (a loop item with the `panel` design).
 */

export const POSTS = 'core/query';
export const PRODUCTS = 'woocommerce/product-collection';
export const QUERY_BLOCKS = [POSTS, PRODUCTS];

export const ATTRIBUTE = 'matterDisplay';

// The block each type is shown as.
export const DISPLAY_BLOCKS = {
	carousel: 'matter/carousel',
	accordion: 'matter/accordion',
	tabs: 'matter/tabs',
};

// Each type's Query Loop variation, matched by `namespace`.
export const NAMESPACES = {
	carousel: 'matter/carousel-posts',
	accordion: 'matter/accordion-posts',
	tabs: 'matter/tabs-posts',
};

export const POSTS_NAMESPACE = NAMESPACES.carousel;
export const PRODUCTS_COLLECTION = 'matter/product-collection/carousel';

const PANEL = ['matter/loop-item', { design: 'panel' }];

// What the post template holds, per type.
export const ITEMS = {
	carousel: [['matter/loop-item']],
	accordion: [['matter/accordion-item', {}, [PANEL]]],
	tabs: [['matter/tab', {}, [PANEL]]],
};

// Query Loop controls these offer (core's `allowedControls`).
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
 * A query's display (its `matterDisplay`), if it's shown as a block.
 *
 * @param {string} name       Block name.
 * @param {Object} attributes Block attributes.
 * @return {Object|null} Display, with its `type`.
 */
export function displayOf(name, attributes) {
	const display = attributes?.[ATTRIBUTE];

	if (
		!QUERY_BLOCKS.includes(name) ||
		!display ||
		typeof display !== 'object' ||
		!DISPLAY_BLOCKS[display.type]
	) {
		return null;
	}

	// Products are carousels only.
	return name === POSTS || display.type === 'carousel' ? display : null;
}

/**
 * A query of posts shown as a block.
 *
 * @param {string} type     Display type (carousel, accordion or tabs).
 * @param {string} postType Post type.
 * @param {Object} display  The block's settings (e.g. its `style`).
 * @return {Array} Block template.
 */
export const postsTemplate = (type, postType, display = {}) => [
	POSTS,
	{
		namespace: NAMESPACES[type],
		[ATTRIBUTE]: { ...display, type },
		query: {
			perPage: type === 'carousel' ? 9 : 10,
			postType,
			inherit: false,
			...(type !== 'carousel' && { order: 'asc', orderBy: 'title' }),
		},
	},
	[['core/post-template', {}, ITEMS[type]]],
];

/**
 * A posts carousel.
 *
 * @param {string} postType Post type.
 * @param {string} style    Carousel style (block style name), if any.
 * @return {Array} Block template.
 */
export const queryTemplate = (postType, style) =>
	postsTemplate('carousel', postType, style ? { style } : {});

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
export const productsAttributes = (style) => ({
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

/**
 * A products carousel: a Product Collection that is the carousel.
 *
 * @param {string} style Carousel style (block style name), if any.
 * @return {Array} Block template.
 */
export const productsTemplate = (style) => [
	PRODUCTS,
	productsAttributes(style),
	[['woocommerce/product-template', {}, ITEMS.carousel]],
];

/**
 * The attributes that mark a displayed query as Matter's, for queries made
 * before (or by hand). Empty when it already is.
 *
 * @param {string} name       Query block name.
 * @param {Object} attributes Its attributes.
 * @return {Object} Attributes to set.
 */
export function displayQueryAttributes(name, attributes) {
	const display = displayOf(name, attributes);
	const changes = {};

	if (!display) {
		return changes;
	}

	if (name === POSTS && attributes.namespace !== NAMESPACES[display.type]) {
		changes.namespace = NAMESPACES[display.type];
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
