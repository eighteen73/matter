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

module.exports = { createCategories, createMenu, createPage, termsCarousel };
