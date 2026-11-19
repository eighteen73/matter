/**
 * Queries shown as a carousel, accordion or tabs (see Blocks\QueryDisplay for
 * the front end and editor/extensions/query-display for the editor).
 *
 * The query block itself is the carousel, accordion or tabs: a
 * `matterDisplay` attribute holds the type, the block's style and colour
 * scheme and its own settings. It's marked as Matter's (`namespace` on a
 * Query Loop; a Terms Query by its `matterDisplay` alone; an integration's
 * query block as it chooses, e.g. `collection` on a Product Collection) for
 * its title and the native controls it offers. Its items are fixed: the theme's loop item for
 * a carousel's slides, or an accordion item or tab holding one. A loop item
 * picks the theme's pattern for the block it's in (Blocks\LoopItem), e.g.
 * `loop-item-faq-accordion`.
 */

/**
 * WordPress dependencies
 */
import { applyFilters } from '@wordpress/hooks';

export const POSTS = 'core/query';
export const TERMS = 'core/terms-query';

// Core's query blocks and the displays each supports, for before the
// server's list (Blocks\QueryDisplay::blocks()) is loaded.
const CORE_DISPLAYS = {
	[POSTS]: ['carousel', 'accordion', 'tabs'],
	[TERMS]: ['carousel'],
};

/**
 * The query blocks that can be shown as a block, and the displays each
 * supports: core's, and any an integration adds on the server (e.g. the
 * WooCommerce integration's Product Collection, as a carousel).
 *
 * @return {Object<string, string[]>} Query block name => display types.
 */
export const displays = () =>
	window.matterEditor?.queryDisplays ?? CORE_DISPLAYS;

/**
 * The query blocks that can be shown as a block.
 *
 * @return {string[]} Block names.
 */
export const queryBlocks = () => Object.keys(displays());

/**
 * Loop templates (blocks that render their children once per item of a
 * query), and whether their items are posts or terms
 * (Blocks\Instances::loops()).
 *
 * @return {Object<string, string>} Block name => `post` or `term`.
 */
export const queryLoops = () =>
	window.matterEditor?.queryLoops ?? {
		'core/post-template': 'post',
		'core/term-template': 'term',
	};

// The class on every loop template's list (Blocks\Instances::LIST_CLASS).
export const LIST_CLASS = 'matter-query-list';

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

// The "Terms carousel" Terms Query variation (matched by its display).
export const TERMS_VARIATION = 'matter/carousel-terms';

// What the post template holds, per type.
export const ITEMS = {
	carousel: [['matter/loop-item']],
	accordion: [['matter/accordion-item', {}, [['matter/loop-item']]]],
	tabs: [['matter/tab', {}, [['matter/loop-item']]]],
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
		!display ||
		typeof display !== 'object' ||
		!DISPLAY_BLOCKS[display.type]
	) {
		return null;
	}

	// Terms (and an integration's queries, e.g. products) are carousels only.
	return displays()[name]?.includes(display.type) ? display : null;
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
			// Accordions and tabs list them all (FAQs, say): core's
			// most, as nothing pages through them.
			perPage: type === 'carousel' ? 9 : 100,
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
 * A Terms Query's attributes as a carousel: the whole `termQuery`, as core
 * replaces rather than merges it.
 *
 * @param {string} style    Carousel style (block style name), if any.
 * @param {string} taxonomy Taxonomy.
 * @return {Object} Block attributes.
 */
export const termsAttributes = (style, taxonomy = 'category') => ({
	[ATTRIBUTE]: { type: 'carousel', ...(style && { style }) },
	termQuery: {
		perPage: 9,
		taxonomy,
		order: 'asc',
		orderBy: 'name',
		include: [],
		hideEmpty: true,
		showNested: false,
		inherit: false,
	},
});

/**
 * A terms carousel: a Terms Query that is the carousel, its term template
 * holding the theme's loop item.
 *
 * @param {string} style Carousel style (block style name), if any.
 * @return {Array} Block template.
 */
export const termsTemplate = (style) => [
	TERMS,
	termsAttributes(style),
	[['core/term-template', {}, ITEMS.carousel]],
];

/**
 * A new carousel of a query block's items (the carousel's slide picker): a
 * posts carousel (its post type chosen next), a terms carousel, or one an
 * integration adds with the `matter.queryDisplay.carouselTemplate` filter
 * (e.g. the WooCommerce integration's products carousel).
 *
 * @param {string} name  Query block name.
 * @param {string} style Carousel style (block style name), if any.
 * @return {Array|null} Block template, or null when there's none.
 */
export const carouselTemplate = (name, style) => {
	const core = {
		[POSTS]: () => queryTemplate('', style),
		[TERMS]: () => termsTemplate(style),
	};

	return applyFilters(
		'matter.queryDisplay.carouselTemplate',
		core[name]?.() ?? null,
		name,
		style
	);
};

/**
 * The attributes that mark a displayed query as Matter's, for queries made
 * before (or by hand). Empty when it already is. An integration adds its own
 * query block's with the `matter.queryDisplay.displayAttributes` filter.
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

	return applyFilters(
		'matter.queryDisplay.displayAttributes',
		changes,
		name,
		attributes,
		display
	);
}
