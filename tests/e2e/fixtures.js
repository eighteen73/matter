/**
 * Shared set-up for the browser tests: a primary menu, fixture pages, and
 * helpers for the conditions a visitor can be in (no JavaScript, reduced
 * motion, forced colours, a narrow screen, another language).
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

/**
 * Visitor conditions
 *
 * `test.use( NO_JAVASCRIPT )` in a describe block loads its pages without
 * scripts, to check what a visitor gets when JavaScript is off or fails.
 */
const NO_JAVASCRIPT = { javaScriptEnabled: false };

/**
 * Viewports either side of the breakpoints the fixture theme uses (`lg` is
 * 1024 px), so a test can start in one and resize into another.
 */
const VIEWPORTS = {
	mobile: { width: 390, height: 800 },
	belowLg: { width: 1023, height: 800 },
	atLg: { width: 1024, height: 800 },
	desktop: { width: 1280, height: 900 },
};

/**
 * Media features to emulate, e.g. `{ reducedMotion: 'reduce' }`,
 * `{ forcedColors: 'active' }`, `{ colorScheme: 'dark' }`. Takes effect at
 * once, including on a page that's already loaded.
 *
 * @param {Object} page    Page.
 * @param {Object} options Playwright `emulateMedia()` options.
 * @return {Promise<void>}
 */
const emulate = (page, options) => page.emulateMedia(options);

/**
 * Resize the viewport through a sequence of sizes, with the page left as it
 * is each time (so something open stays open while a breakpoint is crossed).
 *
 * @param {Object}   page  Page.
 * @param {Object[]} sizes `{ width, height }` for each step.
 * @param {Function} after Called after each step with the size and index.
 * @return {Promise<void>}
 */
async function resizeThrough(page, sizes, after = async () => {}) {
	for (const [index, size] of sizes.entries()) {
		await page.setViewportSize(size);
		await after(size, index);
	}
}

/**
 * Pages
 */

/**
 * A fixture file's markup.
 *
 * @param {string} file File name in `fixtures/`.
 * @return {string} Block markup.
 */
const fixture = (file) => read(file);

/**
 * Wrap block markup in a right-to-left group. The `dir` is in the saved
 * markup, as an author's HTML would have it, so `:dir( rtl )` rules and
 * direction-aware code run in a left-to-right site.
 *
 * @param {string} content Block markup.
 * @return {string} Block markup.
 */
const rtl = (content) =>
	`<!-- wp:group {"className":"is-rtl-fixture"} --><div class="wp-block-group is-rtl-fixture" dir="rtl">${content}</div><!-- /wp:group -->`;

/**
 * The kitchen sink in a right-to-left group.
 *
 * @param {Object} requestUtils WordPress request utils.
 * @return {Promise<Object>} The page.
 */
const createRtlPage = (requestUtils) =>
	createPage(
		requestUtils,
		'Kitchen sink RTL',
		rtl(fixture('kitchen-sink.html'))
	);

/**
 * A page that renders the same widgets twice: a synced pattern holding tabs
 * and a modal, used two times. (The fixture theme's header already renders
 * its primary menu twice, in the panel and as the hover menu.)
 *
 * @param {Object} requestUtils WordPress request utils.
 * @return {Promise<Object>} The page.
 */
async function createDuplicatesPage(requestUtils) {
	const pattern = await requestUtils.rest({
		path: '/wp/v2/blocks',
		method: 'POST',
		data: {
			title: `Duplicated widgets ${Date.now()}`,
			status: 'publish',
			content: fixture('duplicates.html'),
		},
	});
	const use = `<!-- wp:block {"ref":${pattern.id}} /-->`;

	return createPage(
		requestUtils,
		'Duplicates',
		`<!-- wp:heading {"level":1} --><h1 class="wp-block-heading">Duplicates</h1><!-- /wp:heading -->${use}${use}`
	);
}

/**
 * A page whose section holds over 1 MB of slot HTML, ending in a paragraph
 * that only shows if every block before it was kept.
 *
 * @param {Object} requestUtils WordPress request utils.
 * @param {number} bytes        Minimum size of the slot's content.
 * @return {Promise<Object>} The page.
 */
function createLargeSlotPage(requestUtils, bytes = 1.2 * 1024 * 1024) {
	const filler = (i) =>
		`<!-- wp:paragraph --><p>Filler paragraph ${i} to make the slot large.</p><!-- /wp:paragraph -->`;
	const count = Math.ceil(bytes / filler(0).length);
	const body = Array.from({ length: count }, (_, i) => filler(i)).join('');

	return createPage(
		requestUtils,
		'Large slot',
		'<!-- wp:matter-test/section -->' +
			`<!-- wp:matter/slot {"name":"content"} -->${body}<!-- wp:paragraph --><p>End of the large slot</p><!-- /wp:paragraph --><!-- /wp:matter/slot -->` +
			'<!-- wp:matter/slot {"name":"media"} --><!-- wp:paragraph --><p>Media slot after the large one</p><!-- /wp:paragraph --><!-- /wp:matter/slot -->' +
			'<!-- /wp:matter-test/section -->'
	);
}

/**
 * Archive entries
 */

/**
 * Create a published archive entry for a target, as the editor saves one.
 * Takes the stored target string (`post_type:post`, `term:category:3`,
 * `search`, `404`, and any type added later), so a new target type needs no
 * change here.
 *
 * @param {Object} requestUtils WordPress request utils.
 * @param {string} target       Stored target.
 * @param {Object} options      Optional `title`, `content` and `cascade`.
 * @return {Promise<Object>} The entry.
 */
function createArchiveEntry(requestUtils, target, options = {}) {
	const { title = `Archive: ${target}`, content, cascade = false } = options;

	return requestUtils.rest({
		path: '/wp/v2/matter_archive',
		method: 'POST',
		data: {
			title,
			status: 'publish',
			content:
				content ??
				`<!-- wp:paragraph --><p>Intro for ${target}</p><!-- /wp:paragraph --><!-- wp:matter/archive-loop /-->`,
			meta: {
				_matter_archive_target: target,
				_matter_archive_cascade: cascade,
			},
		},
	});
}

/**
 * Delete every archive entry.
 *
 * @param {Object} requestUtils WordPress request utils.
 * @return {Promise<void>}
 */
async function deleteArchiveEntries(requestUtils) {
	const entries = await requestUtils.rest({
		path: '/wp/v2/matter_archive',
		params: { per_page: 100, status: 'any' },
	});

	await Promise.all(
		entries.map(({ id }) =>
			requestUtils.rest({
				path: `/wp/v2/matter_archive/${id}`,
				method: 'DELETE',
				params: { force: true },
			})
		)
	);
}

/**
 * One entry for each target type that exists, each saying which target it
 * is. Pass `extra` target strings for types added since (`author`, `date`).
 *
 * @param {Object}   requestUtils WordPress request utils.
 * @param {string[]} extra        More stored targets.
 * @return {Promise<Object>} Entries, keyed by target.
 */
async function createArchiveEntries(requestUtils, extra = []) {
	await deleteArchiveEntries(requestUtils);

	const [categoryId] = await createCategories(requestUtils, [
		'Archive fixture',
	]);
	const targets = [
		'post_type:post',
		'taxonomy:category',
		`term:category:${categoryId}`,
		'search',
		'404',
		...extra,
	];
	const entries = {};

	for (const target of targets) {
		entries[target] = await createArchiveEntry(requestUtils, target);
	}

	return entries;
}

/**
 * Users and languages
 */

const EDITOR = { username: 'editor-test', password: 'editor-test-password' };

/**
 * Ensure the `editor-test` user exists with the Editor role.
 *
 * @param {Object} requestUtils WordPress request utils.
 * @return {Promise<void>}
 */
async function ensureEditorUser(requestUtils) {
	const found = await requestUtils.rest({
		path: '/wp/v2/users',
		params: { search: EDITOR.username, context: 'edit', roles: 'editor' },
	});

	if (found.some(({ username }) => username === EDITOR.username)) {
		return;
	}

	await requestUtils.rest({
		path: '/wp/v2/users',
		method: 'POST',
		data: {
			username: EDITOR.username,
			email: 'editor-test@example.com',
			password: EDITOR.password,
			roles: ['editor'],
		},
	});
}

/**
 * Whether global setup installed the Arabic language pack. A test needing it
 * should `test.skip( ! arabicInstalled(), ... )`.
 */
const arabicInstalled = () => process.env.MATTER_E2E_ARABIC === '1';

/**
 * Switch the site's language, returning a function that puts it back. Call it
 * in `beforeAll`, and the function in `afterAll`, so other specs stay in
 * English.
 *
 * @param {Object} requestUtils WordPress request utils.
 * @param {string} locale       Locale, e.g. `ar`.
 * @return {Promise<Function>} Restores the previous language.
 */
async function setSiteLanguage(requestUtils, locale) {
	const { language } = await requestUtils.rest({
		path: '/wp/v2/settings',
	});

	await requestUtils.rest({
		path: '/wp/v2/settings',
		method: 'POST',
		data: { language: locale },
	});

	return () =>
		requestUtils.rest({
			path: '/wp/v2/settings',
			method: 'POST',
			data: { language },
		});
}

module.exports = {
	EDITOR,
	NO_JAVASCRIPT,
	VIEWPORTS,
	arabicInstalled,
	collections,
	createArchiveEntries,
	createArchiveEntry,
	createCategories,
	createDuplicatesPage,
	createLargeSlotPage,
	createMenu,
	createPage,
	createPosts,
	createRtlPage,
	deleteArchiveEntries,
	emulate,
	ensureEditorUser,
	fixture,
	resizeThrough,
	rtl,
	setSiteLanguage,
	termsCarousel,
};
