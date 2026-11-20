/**
 * Accessibility details (plan items 30 to 32): link names, keys with
 * modifiers, accordion regions, the lightbox announcement, dialog names, and
 * forced colours.
 */
const { test, expect } = require('@wordpress/e2e-test-utils-playwright');
const { createPage } = require('./fixtures');

let cards;
let details;

const IMAGE = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
const image = (alt) =>
	`<!-- wp:image --><figure class="wp-block-image"><img src="${IMAGE}" alt="${alt}"/></figure><!-- /wp:image -->`;
const tabMarkup = (label) =>
	`<!-- wp:matter/tab {"label":"${label}"} --><!-- wp:paragraph --><p>${label} text</p><!-- /wp:paragraph --><!-- /wp:matter/tab -->`;
const item = (title) =>
	`<!-- wp:matter/accordion-item {"title":"${title}"} --><!-- wp:paragraph --><p>${title} answer</p><!-- /wp:paragraph --><!-- /wp:matter/accordion-item -->`;
const items = (prefix, count) =>
	Array.from({ length: count }, (_, i) => item(`${prefix} ${i + 1}`)).join(
		''
	);

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
	details = await createPage(
		requestUtils,
		'Accessibility details',
		`<!-- wp:matter/tabs {"anchor":"keys-tabs","label":"Keys"} -->${tabMarkup('One')}${tabMarkup('Two')}${tabMarkup('Three')}<!-- /wp:matter/tabs -->` +
			`<!-- wp:matter/accordion {"anchor":"short-faq"} -->${items('Short', 6)}<!-- /wp:matter/accordion -->` +
			`<!-- wp:matter/accordion {"anchor":"long-faq"} -->${items('Long', 7)}<!-- /wp:matter/accordion -->` +
			`<!-- wp:matter/gallery {"lightbox":true,"label":"Photos","anchor":"photos"} -->${image('Photo one')}${image('Photo two')}${image('Photo three')}<!-- /wp:matter/gallery -->` +
			'<!-- wp:matter/modal {"overlayId":"welcome"} --><!-- wp:matter/slot {"name":"trigger"} --><!-- wp:paragraph --><p><a href="#welcome">Open welcome</a></p><!-- /wp:paragraph --><!-- /wp:matter/slot --><!-- wp:matter/slot {"name":"content"} --><!-- wp:heading --><h2 class="wp-block-heading">Welcome aboard</h2><!-- /wp:heading --><!-- wp:paragraph --><p>Hello</p><!-- /wp:paragraph --><!-- /wp:matter/slot --><!-- /wp:matter/modal -->' +
			'<!-- wp:matter/drawer {"overlayId":"menu-drawer","position":"start"} --><!-- wp:matter/slot {"name":"trigger"} --><!-- wp:paragraph --><p><a href="#menu-drawer">Open drawer</a></p><!-- /wp:paragraph --><!-- /wp:matter/slot --><!-- wp:matter/slot {"name":"content"} --><!-- wp:heading --><h2 class="wp-block-heading">Browse the shop</h2><!-- /wp:heading --><!-- /wp:matter/slot --><!-- /wp:matter/drawer -->'
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

test.describe('keys with modifiers', () => {
	/**
	 * Record whether each keydown was cancelled by the time it reached the
	 * document: a key the page handled is, one it left to the browser isn't.
	 *
	 * @param {Object} page Page.
	 * @return {Promise<void>}
	 */
	const watchKeys = (page) =>
		page.evaluate(() => {
			window.cancelled = [];
			document.addEventListener('keydown', (event) =>
				window.cancelled.push(event.defaultPrevented)
			);
		});
	const lastCancelled = (page) =>
		page.evaluate(() => window.cancelled[window.cancelled.length - 1]);

	test('tabs leave Alt+Arrow and Ctrl+End to the browser', async ({
		page,
	}) => {
		await page.goto(details.link);
		await expect(page.locator('#keys-tabs')).toHaveClass(/is-enhanced/);
		await watchKeys(page);

		const one = page.getByRole('tab', { name: 'One' });
		const two = page.getByRole('tab', { name: 'Two' });

		await one.focus();

		for (const key of [
			'Alt+ArrowRight',
			'Control+End',
			'Meta+ArrowRight',
		]) {
			await page.keyboard.press(key);
			expect(await lastCancelled(page), key).toBe(false);
			await expect(one).toBeFocused();
			await expect(one).toHaveAttribute('aria-selected', 'true');
		}

		await page.keyboard.press('ArrowRight');
		expect(await lastCancelled(page)).toBe(true);
		await expect(two).toBeFocused();
		await expect(two).toHaveAttribute('aria-selected', 'true');
	});

	test('an accordion leaves Alt+Arrow and Ctrl+Home to the browser', async ({
		page,
	}) => {
		await page.goto(details.link);
		await expect(page.locator('#short-faq')).toHaveClass(/is-enhanced/);
		await watchKeys(page);

		const first = page.locator('#short-faq button').first();
		const second = page.locator('#short-faq button').nth(1);

		await first.focus();

		for (const key of ['Alt+ArrowDown', 'Control+End', 'Meta+ArrowDown']) {
			await page.keyboard.press(key);
			expect(await lastCancelled(page), key).toBe(false);
			await expect(first).toBeFocused();
		}

		await page.keyboard.press('ArrowDown');
		expect(await lastCancelled(page)).toBe(true);
		await expect(second).toBeFocused();
	});
});

test.describe('accordion regions', () => {
	test('panels are regions in an accordion of six or fewer items, and not in a longer one', async ({
		page,
	}) => {
		await page.goto(details.link);

		await expect(
			page.locator('#short-faq').getByRole('region')
		).toHaveCount(6);
		await expect(
			page.locator('#short-faq').getByRole('region', { name: 'Short 1' })
		).toHaveCount(1);
		await expect(page.locator('#long-faq').getByRole('region')).toHaveCount(
			0
		);
		await expect(page.locator('#long-faq button')).toHaveCount(7);
	});
});

test.describe('lightbox announcement', () => {
	test('one polite live region says the image number and its description as the image changes', async ({
		page,
	}) => {
		await page.goto(details.link);
		await expect(page.locator('#photos')).toHaveClass(/is-enhanced/);

		const lightbox = page.locator('#photos dialog');
		const live = lightbox.locator('[aria-live]');

		await page
			.locator('#photos')
			.getByRole('button', { name: 'Enlarge image 1 of 3' })
			.click();
		await expect(lightbox).toHaveAttribute('open', '');

		await expect(live).toHaveCount(1);
		await expect(live).toHaveAttribute('aria-live', 'polite');
		await expect(live).toHaveText('Image 1 of 3: Photo one');

		await page.keyboard.press('ArrowRight');
		await expect(live).toHaveText('Image 2 of 3: Photo two');
		await page.keyboard.press('End');
		await expect(live).toHaveText('Image 3 of 3: Photo three');
	});
});

test.describe('dialog names', () => {
	test('a modal and a drawer without a label are named by their first heading', async ({
		page,
	}) => {
		await page.goto(details.link);

		await page.getByRole('link', { name: 'Open welcome' }).click();
		await expect(
			page.getByRole('dialog', { name: 'Welcome aboard' })
		).toBeVisible();
		await page.keyboard.press('Escape');

		await page.getByRole('link', { name: 'Open drawer' }).click();
		await expect(
			page.getByRole('dialog', { name: 'Browse the shop' })
		).toBeVisible();
	});
});
