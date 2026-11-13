/**
 * Shared set-up for the browser tests: a primary menu and fixture pages.
 */
const fs = require('fs');
const path = require('path');

const read = (file) =>
	fs.readFileSync(path.join(__dirname, 'fixtures', file), 'utf8');

/**
 * Give the fixture theme a primary menu: a parent page with a child (for
 * submenus and "View all") and a same-page link.
 *
 * @param {Object} requestUtils WordPress request utils.
 * @return {Promise<void>}
 */
async function createMenu(requestUtils) {
	await requestUtils.deleteAllMenus?.();

	const menu = await requestUtils.rest({
		path: '/wp/v2/menus',
		method: 'POST',
		data: { name: `Primary ${Date.now()}`, locations: ['primary'] },
	});
	const item = (data) =>
		requestUtils.rest({
			path: '/wp/v2/menu-items',
			method: 'POST',
			data: { status: 'publish', menus: menu.id, ...data },
		});

	const parent = await item({
		title: 'Services',
		url: 'http://localhost:8889/services/',
	});

	await item({
		title: 'Design',
		url: 'http://localhost:8889/services/design/',
		parent: parent.id,
	});
	await item({ title: 'Contact', url: '#contact' });
}

/**
 * Create a published page from a fixture file (or block markup).
 *
 * @param {Object} requestUtils WordPress request utils.
 * @param {string} title        Page title.
 * @param {string} content      Fixture file name, or block markup.
 * @return {Promise<Object>} The page.
 */
const createPage = (requestUtils, title, content) =>
	requestUtils.createPage({
		title,
		status: 'publish',
		content: content.endsWith('.html') ? read(content) : content,
	});

/**
 * Categories for a terms carousel, made afresh (any with these names are
 * deleted first).
 *
 * @param {Object}   requestUtils WordPress request utils.
 * @param {string[]} names        Category names.
 * @return {Promise<number[]>} Their IDs.
 */
async function createCategories(requestUtils, names) {
	const existing = await requestUtils.rest({
		path: '/wp/v2/categories',
		params: { per_page: 100, hide_empty: false },
	});

	await Promise.all(
		existing
			.filter(({ name }) => names.includes(name))
			.map(({ id }) =>
				requestUtils.rest({
					path: `/wp/v2/categories/${id}`,
					method: 'DELETE',
					params: { force: true },
				})
			)
	);

	const ids = [];

	for (const name of names) {
		const { id } = await requestUtils.rest({
			path: '/wp/v2/categories',
			method: 'POST',
			data: { name },
		});

		ids.push(id);
	}

	return ids;
}

/**
 * A Terms Query of categories shown as a carousel ("Terms carousel"), as the
 * editor saves it.
 *
 * @param {number[]} ids    Category IDs.
 * @param {string}   anchor The carousel's ID.
 * @return {string} Block markup.
 */
const termsCarousel = (ids, anchor) =>
	`<!-- wp:terms-query ${JSON.stringify({
		termQuery: {
			perPage: 10,
			taxonomy: 'category',
			order: 'asc',
			orderBy: 'name',
			include: ids,
			hideEmpty: false,
			showNested: false,
			inherit: false,
		},
		anchor,
		matterDisplay: { type: 'carousel', label: 'Categories' },
	})} --><div id="${anchor}" class="wp-block-terms-query"><!-- wp:term-template --><!-- wp:matter/loop-item /--><!-- /wp:term-template --></div><!-- /wp:terms-query -->`;

/**
 * Posts for the collections page, made afresh (any with these titles are
 * deleted first).
 *
 * @param {Object}   requestUtils WordPress request utils.
 * @param {string[]} titles       Post titles.
 * @return {Promise<number[]>} Their IDs, newest first.
 */
async function createPosts(requestUtils, titles) {
	const existing = await requestUtils.rest({
		path: '/wp/v2/posts',
		params: { per_page: 100, status: 'publish' },
	});

	await Promise.all(
		existing
			.filter(({ title }) => titles.includes(title.rendered))
			.map(({ id }) =>
				requestUtils.rest({
					path: `/wp/v2/posts/${id}`,
					method: 'DELETE',
					params: { force: true },
				})
			)
	);

	const ids = [];

	for (const [index, title] of titles.entries()) {
		const { id } = await requestUtils.createPost({
			title,
			content: `<!-- wp:paragraph --><p>${title} content.</p><!-- /wp:paragraph -->`,
			status: 'publish',
			date: `2026-01-0${index + 1}T00:00:00`,
		});

		ids.unshift(id);
	}

	return ids;
}

const IMAGE = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

/**
 * Images for a gallery.
 *
 * @param {string[]} alts Their alternative text.
 * @return {string} Block markup.
 */
const images = (alts) =>
	alts
		.map(
			(alt) =>
				`<!-- wp:image --><figure class="wp-block-image"><img src="${IMAGE}" alt="${alt}"/></figure><!-- /wp:image -->`
		)
		.join('');

/**
 * Posts shown as a display type (a query as the editor saves it).
 *
 * @param {number[]} ids    Post IDs.
 * @param {string}   type   carousel, accordion or tabs.
 * @param {string}   anchor The display's ID.
 * @param {string}   item   The post template's content.
 * @return {string} Block markup.
 */
const postsDisplay = (ids, type, anchor, item) =>
	`<!-- wp:query ${JSON.stringify({
		queryId: ids.length + anchor.length,
		anchor,
		query: {
			perPage: ids.length,
			postType: 'post',
			include: ids,
			order: 'desc',
			orderBy: 'date',
			inherit: false,
		},
		matterDisplay: { type, label: anchor },
	})} --><div class="wp-block-query"><!-- wp:post-template -->${item}<!-- /wp:post-template --></div><!-- /wp:query -->`;

/**
 * The blocks and displays the kitchen sink doesn't hold: galleries, vertical
 * tabs, and posts shown as a carousel, an accordion and tabs.
 *
 * @param {number[]} postIds Posts to show.
 * @return {string} Block markup.
 */
const collections = (postIds) =>
	[
		`<!-- wp:matter/gallery {"lightbox":true,"limit":2,"label":"Photos","anchor":"photos"} -->${images(['Photo one', 'Photo two', 'Photo three'])}<!-- /wp:matter/gallery -->`,
		`<!-- wp:matter/gallery {"lightbox":false,"limit":1,"label":"More photos","anchor":"more-photos"} -->${images(['Shown photo', 'Hidden photo'])}<!-- /wp:matter/gallery -->`,
		`<!-- wp:matter/gallery {"layout":"carousel","label":"Gallery carousel","anchor":"gallery-carousel"} -->${images(['Slide photo one', 'Slide photo two', 'Slide photo three'])}<!-- /wp:matter/gallery -->`,
		'<!-- wp:matter/tabs {"anchor":"steps","label":"Steps","orientation":"vertical"} --><!-- wp:matter/tab {"label":"Plan"} --><!-- wp:paragraph --><p>Plan it</p><!-- /wp:paragraph --><!-- /wp:matter/tab --><!-- wp:matter/tab {"label":"Build"} --><!-- wp:paragraph --><p>Build it</p><!-- /wp:paragraph --><!-- /wp:matter/tab --><!-- /wp:matter/tabs -->',
		postsDisplay(
			postIds,
			'carousel',
			'posts-carousel',
			'<!-- wp:matter/loop-item /-->'
		),
		postsDisplay(
			postIds,
			'accordion',
			'posts-accordion',
			'<!-- wp:matter/accordion-item --><!-- wp:matter/loop-item /--><!-- /wp:matter/accordion-item -->'
		),
		postsDisplay(
			postIds,
			'tabs',
			'posts-tabs',
			'<!-- wp:matter/tab --><!-- wp:matter/loop-item /--><!-- /wp:matter/tab -->'
		),
	].join('\n\n');

module.exports = {
	collections,
	createCategories,
	createMenu,
	createPage,
	createPosts,
	termsCarousel,
};
