/**
 * Accessibility details (plan items 30 to 32): link names, keys with
 * modifiers, accordion regions, the lightbox announcement, dialog names, and
 * forced colours.
 */
const { test, expect } = require('@wordpress/e2e-test-utils-playwright');
const { createPage } = require('./fixtures');

let cards;

/**
 * A linked card: a section without a heading, linking as a whole.
 *
 * @param {string}  text Its paragraph.
 * @param {string}  url  Link address.
 * @param {boolean} tab  Opens in a new tab.
 * @return {string} Block markup.
 */
const card = (text, url, tab = false) =>
	`<!-- wp:matter-test/feature ${JSON.stringify({ matterLink: { url, opensInNewTab: tab } })} --><!-- wp:matter/slot {"name":"content"} --><!-- wp:paragraph --><p>${text}</p><!-- /wp:paragraph --><!-- /wp:matter/slot --><!-- /wp:matter-test/feature -->`;

test.beforeAll(async ({ requestUtils }) => {
	await requestUtils.deleteAllPages();

	cards = await createPage(
		requestUtils,
		'Linked cards',
		card('Spring sale', 'https://example.com/spring/') +
			card('Summer sale', 'https://example.com/summer/', true)
	);
});

// As a visitor.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('block link names', () => {
	test('each card link is named by its text, and a new tab says so', async ({
		page,
	}) => {
		await page.goto(cards.link);

		await expect(
			page.getByRole('link', { name: 'Spring sale', exact: true })
		).toHaveAttribute('href', 'https://example.com/spring/');
		await expect(
			page.getByRole('link', {
				name: 'Summer sale (opens in a new tab)',
				exact: true,
			})
		).toHaveAttribute('target', '_blank');
		await expect(page.getByRole('link', { name: 'Read more' })).toHaveCount(
			0
		);
	});
});
