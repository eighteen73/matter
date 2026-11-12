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

module.exports = { createMenu, createPage };
