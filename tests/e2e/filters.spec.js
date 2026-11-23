/**
 * Filters, as a visitor: a Query Loop of posts with category filters.
 */
const { test, expect } = require('@wordpress/e2e-test-utils-playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const { createPage } = require('./fixtures');

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 390, height: 800 };

let listing;
let shifting;

// What the tests made, removed afterwards: other tests list the site's newest
// posts.
const made = { posts: [], terms: [] };

/**
 * A term, made afresh.
 *
 * @param {Object} requestUtils WordPress request utils.
 * @param {string} type         `categories` or `tags`.
 * @param {string} name         Name.
 * @return {Promise<number>} Its ID.
 */
async function term(requestUtils, type, name) {
	const existing = await requestUtils.rest({
		path: `/wp/v2/${type}`,
		params: { search: name, hide_empty: false },
	});

	await Promise.all(
		existing
			.filter((item) => item.name === name)
			.map(({ id }) =>
				requestUtils.rest({
					path: `/wp/v2/${type}/${id}`,
					method: 'DELETE',
					params: { force: true },
				})
			)
	);

	const { id } = await requestUtils.rest({
		path: `/wp/v2/${type}`,
		method: 'POST',
		data: { name },
	});

	made.terms.push([type, id]);

	return id;
}

test.beforeAll(async ({ requestUtils }) => {
	const news = await term(requestUtils, 'categories', 'Filter news');
	const events = await term(requestUtils, 'categories', 'Filter events');
	const listed = await term(requestUtils, 'tags', 'Filter listed');
	const featured = await term(requestUtils, 'tags', 'Filter featured');

	for (const [title, categories, tags] of [
		['First story', [news], [listed]],
		['Second story', [news], [listed]],
		['Open day', [events], [listed]],
		// For the listing whose filters come and go (found by "Zebrafilter").
		['Zebrafilter news one', [news], []],
		['Zebrafilter news two', [news], []],
		['Zebrafilter event', [events], [featured]],
	]) {
		const { id } = await requestUtils.createPost({
			title,
			status: 'publish',
			categories,
			tags,
		});

		made.posts.push(id);
	}

	listing = await createPage(
		requestUtils,
		'Filtered posts',
		`<!-- wp:query {"queryId":5,"query":{"perPage":10,"postType":"post","order":"asc","orderBy":"title","taxQuery":{"post_tag":[${listed}]},"inherit":false}} --><div class="wp-block-query"><!-- wp:matter/filters-toggle /--><!-- wp:matter/filters --><!-- wp:matter/filter {"source":"taxonomy:category"} /--><!-- /wp:matter/filters --><!-- wp:matter/active-filters /--><!-- wp:matter/results-count /--><!-- wp:post-template --><!-- wp:post-title /--><!-- /wp:post-template --></div><!-- /wp:query -->`
	);

	// The tag filter, first, has nothing to choose among the news, so it
	// isn't shown there: the category dropdown takes its place in the form,
	// as a product archive's price range took a colour filter's.
	shifting = await createPage(
		requestUtils,
		'Filters that come and go',
		`<!-- wp:query {"queryId":6,"query":{"perPage":10,"postType":"post","order":"asc","orderBy":"title","search":"Zebrafilter","inherit":false}} --><div class="wp-block-query"><!-- wp:matter/filters --><!-- wp:matter/filter {"source":"taxonomy:post_tag","label":"Tags"} /--><!-- wp:matter/filter {"source":"taxonomy:category","display":"dropdown"} /--><!-- /wp:matter/filters --><!-- wp:matter/results-count /--><!-- wp:post-template --><!-- wp:post-title /--><!-- /wp:post-template --></div><!-- /wp:query -->`
	);
});

test.afterAll(async ({ requestUtils }) => {
	await Promise.all([
		...made.posts.map((id) =>
			requestUtils.rest({
				path: `/wp/v2/posts/${id}`,
				method: 'DELETE',
				params: { force: true },
			})
		),
		...made.terms.map(([type, id]) =>
			requestUtils.rest({
				path: `/wp/v2/${type}/${id}`,
				method: 'DELETE',
				params: { force: true },
			})
		),
		...[listing, shifting].map(({ id }) =>
			requestUtils.rest({
				path: `/wp/v2/pages/${id}`,
				method: 'DELETE',
				params: { force: true },
			})
		),
	]);
});

// As a visitor.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('filters', () => {
	test.use({ viewport: DESKTOP });

	test('a filter narrows the list without a page load, and passes axe', async ({
		page,
	}) => {
		await page.goto(listing.link);

		const results = page.locator('.wp-block-matter-results-count');
		const titles = page.locator('.wp-block-post-title');

		await expect(results).toHaveText('3 results');
		await page.evaluate(() => (window.loadedOnce = true));

		await page.getByRole('checkbox', { name: /Filter news/ }).check();

		await expect(results).toHaveText('2 results');
		await expect(titles).toHaveText(['First story', 'Second story']);
		expect(page.url()).toContain('filter_category=filter-news');
		expect(await page.evaluate(() => window.loadedOnce)).toBe(true);

		const chip = page.getByRole('button', { name: 'Remove Filter news' });

		await expect(chip).toBeVisible();

		const axe = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
			.include('.wp-block-query')
			.analyze();

		expect(
			axe.violations.map(
				({ id, nodes }) =>
					`${id}: ${nodes.map((n) => n.target).join(' | ')}`
			)
		).toEqual([]);

		await chip.click();
		await expect(results).toHaveText('3 results');
		await expect(chip).toBeHidden();
	});

	test('back and forward restore the filters', async ({ page }) => {
		await page.goto(listing.link);

		const results = page.locator('.wp-block-matter-results-count');

		await page.getByRole('checkbox', { name: /Filter events/ }).check();
		await expect(results).toHaveText('1 result');

		await page.goBack();
		await expect(results).toHaveText('3 results');
		await expect(
			page.getByRole('checkbox', { name: /Filter events/ })
		).not.toBeChecked();

		await page.goForward();
		await expect(results).toHaveText('1 result');
		await expect(
			page.getByRole('checkbox', { name: /Filter events/ })
		).toBeChecked();
	});

	test('a filter that comes back has its options', async ({ page }) => {
		const news = (
			await page.request.get(
				`${new URL(listing.link).origin}/?rest_route=/wp/v2/categories&search=Filter%20news`
			)
		).json();
		const { slug } = (await news)[0];

		// Loaded with the news chosen: the tags have nothing to choose.
		await page.goto(
			`${shifting.link}${shifting.link.includes('?') ? '&' : '?'}filter_category=${slug}`
		);
		await expect(page.getByRole('group', { name: 'Tags' })).toHaveCount(0);

		await page
			.getByRole('combobox', { name: 'Category' })
			.selectOption({ index: 0 });
		await expect(page.locator('.wp-block-matter-results-count')).toHaveText(
			'3 results'
		);

		const tags = page.getByRole('group', { name: 'Tags' });

		await expect(
			tags.getByRole('checkbox', { name: /Filter featured/ })
		).toBeVisible();
		await expect(
			tags.getByRole('checkbox', { name: /Filter featured/ })
		).toHaveAccessibleName(/1/);

		// And it works: choosing it filters.
		await tags.getByRole('checkbox', { name: /Filter featured/ }).check();
		await expect(page.locator('.wp-block-matter-results-count')).toHaveText(
			'1 result'
		);
	});
});

test.describe('filters on a phone', () => {
	test.use({ viewport: MOBILE });

	test('the Filters button opens them in a drawer, which "Show results" closes', async ({
		page,
	}) => {
		await page.goto(listing.link);

		const toggle = page.getByRole('button', { name: /^Filters/ });
		const drawer = page.getByRole('dialog', { name: 'Filters' });

		await expect(toggle).toBeVisible();
		await expect(drawer).toBeHidden();

		await toggle.click();
		await expect(drawer).toBeVisible();

		await drawer.getByRole('checkbox', { name: /Filter events/ }).check();
		await expect(
			drawer.getByRole('button', { name: 'Show 1 result' })
		).toBeVisible();
		await expect(drawer).toBeVisible();

		await drawer.getByRole('button', { name: 'Show 1 result' }).click();
		await expect(drawer).toBeHidden();
		await expect(toggle).toContainText('1');
		await expect(toggle).toBeFocused();
	});
});

test.describe('filters without JavaScript', () => {
	test.use({ viewport: DESKTOP, javaScriptEnabled: false });

	test('the form submits, and the server filters the list', async ({
		page,
	}) => {
		await page.goto(listing.link);

		await page.getByRole('checkbox', { name: /Filter news/ }).check();
		await page.getByRole('checkbox', { name: /Filter events/ }).check();
		await page.getByRole('button', { name: 'Apply filters' }).click();

		await expect(page.locator('.wp-block-matter-results-count')).toHaveText(
			'3 results'
		);
		expect(page.url()).toMatch(/filter_category/);
	});
});
