/**
 * Dialog semantics, drill-down levels, focus return and right-to-left keys
 * (plan items 26 to 29): what the keyboard and assistive technology reach,
 * and where focus goes.
 */
const { test, expect } = require('@wordpress/e2e-test-utils-playwright');
const { VIEWPORTS, createMenu, createPage } = require('./fixtures');

let kitchenSink;

test.beforeAll(async ({ requestUtils }) => {
	await requestUtils.deleteAllPages();
	await createMenu(requestUtils);
	kitchenSink = await createPage(
		requestUtils,
		'Kitchen sink',
		'kitchen-sink.html'
	);
});

// As a visitor.
test.use({ storageState: { cookies: [], origins: [] } });

/**
 * The IDs, or tags, of the elements that are inert.
 *
 * @param {Object} page Page.
 * @return {Promise<string[]>} Inert elements, as selectors.
 */
const inertElements = (page) =>
	page.evaluate(() =>
		[...document.querySelectorAll('[inert]')].map(
			(element) =>
				element.tagName.toLowerCase() +
				(element.id ? `#${element.id}` : '')
		)
	);

/**
 * Whether the element with the given selector is exposed: not in, or under,
 * anything inert.
 *
 * @param {Object} page     Page.
 * @param {string} selector Selector.
 * @return {Promise<boolean>} Whether it is.
 */
const isLive = (page, selector) =>
	page.evaluate(
		(query) => !document.querySelector(query).closest('[inert]'),
		selector
	);

/**
 * Open the panel with the mouse and wait until it has taken focus (it moves
 * it in a frame after opening, once it is in place).
 *
 * @param {Object} page Page.
 * @return {Promise<void>}
 */
const openPanel = async (page) => {
	await page.goto(kitchenSink.link);
	await expect(page.locator('#test-nav')).toHaveClass(/is-enhanced/);
	await page.locator('[aria-controls="test-nav"]').click();
	await expect(page.locator('#test-nav')).toHaveClass(/\bis-open\b/);
	await expect(
		page.locator('#test-nav .matter-menu__toggle').first()
	).toBeFocused();
};

test.describe('panel dialog', { tag: '@cross-browser' }, () => {
	test.use({ viewport: VIEWPORTS.mobile });

	test('only the dialog is exposed while the panel is open, and all is back when it closes', async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);
		await expect(page.locator('#test-nav')).toHaveClass(/is-enhanced/);

		const before = await inertElements(page);

		await page.locator('[aria-controls="test-nav"]').click();
		await expect(page.locator('#test-nav')).toHaveClass(/\bis-open\b/);
		await expect.poll(() => isLive(page, 'h1')).toBe(false);

		// The page, the header's toggle included, is out; the dialog's own
		// close control and menu are in.
		expect(await isLive(page, 'h1')).toBe(false);
		expect(await isLive(page, '[aria-controls="test-nav"]')).toBe(false);
		expect(await isLive(page, '.matter-panel__close')).toBe(true);
		expect(await isLive(page, '#test-nav .matter-menu__toggle')).toBe(true);
		// The backdrop still takes the click that closes the panel.
		expect(await isLive(page, '#test-nav .matter-panel__backdrop')).toBe(
			true
		);

		await page.locator('.matter-panel__close').click();
		await expect(page.locator('#test-nav')).not.toHaveClass(/\bis-open\b/);
		await expect.poll(() => inertElements(page)).toEqual(before);
	});

	test('Tab stays inside the dialog', async ({ page, browserName }) => {
		await openPanel(page);

		for (let i = 0; i < 8; i++) {
			// Safari's Tab skips links unless that is turned on (see the
			// dropdown test); Option+Tab reaches them.
			await page.keyboard.press(
				'webkit' === browserName ? 'Alt+Tab' : 'Tab'
			);
			expect(
				await page.evaluate(() =>
					window.document.activeElement.closest(
						'.matter-panel__content'
					)
						? 'in'
						: window.document.activeElement.tagName
				),
				`Tab ${i + 1}`
			).toBe('in');
		}
	});

	test('closing with the mouse gives focus back to the toggle', async ({
		page,
	}) => {
		const toggle = page.locator('[aria-controls="test-nav"]');

		await openPanel(page);
		await page.locator('.matter-panel__close').click();
		await expect(toggle).toBeFocused();
	});

	test('resizing to the inline layout with the panel open lets go without moving focus', async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);
		await expect(page.locator('#test-nav')).toHaveClass(/is-enhanced/);

		const before = await inertElements(page);

		await page.locator('[aria-controls="test-nav"]').click();
		await expect(page.locator('#test-nav')).toHaveClass(/\bis-open\b/);
		await expect(
			page.locator('#test-nav .matter-menu__toggle').first()
		).toBeFocused();

		await page.setViewportSize(VIEWPORTS.atLg);
		await expect(page.locator('#test-nav')).not.toHaveClass(/\bis-open\b/);
		await expect(page.locator('html')).not.toHaveClass(/has-panel-open/);
		await expect.poll(() => inertElements(page)).toEqual(before);

		// Still where it was: the menu is inline now, not the toggle.
		expect(
			await page.evaluate(() =>
				window.document.activeElement.closest('#test-nav')
					? 'menu'
					: window.document.activeElement.tagName
			)
		).toBe('menu');
	});
});
