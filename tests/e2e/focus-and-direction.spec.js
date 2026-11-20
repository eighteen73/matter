/**
 * Dialog semantics, drill-down levels, focus return and right-to-left keys
 * (plan items 26 to 29): what the keyboard and assistive technology reach,
 * and where focus goes.
 */
const { test, expect } = require('@wordpress/e2e-test-utils-playwright');
const {
	VIEWPORTS,
	arabicInstalled,
	createMenu,
	createPage,
	rtl,
	resetSiteLanguage,
	resizeThrough,
	setSiteLanguage,
} = require('./fixtures');

let kitchenSink;
let rtlPage;

const tab = (label) =>
	`<!-- wp:matter/tab {"label":"${label}"} --><!-- wp:paragraph --><p>${label}</p><!-- /wp:paragraph --><!-- /wp:matter/tab -->`;

test.beforeAll(async ({ requestUtils }) => {
	await requestUtils.deleteAllPages();
	await createMenu(requestUtils);
	kitchenSink = await createPage(
		requestUtils,
		'Kitchen sink',
		'kitchen-sink.html'
	);
	// Three tabs, so the wrong direction can't land on the right tab by
	// wrapping round.
	rtlPage = await createPage(
		requestUtils,
		'RTL tabs',
		rtl(
			`<!-- wp:matter/tabs {"anchor":"rtl-tabs","label":"RTL tabs"} -->${tab('One')}${tab('Two')}${tab('Three')}<!-- /wp:matter/tabs -->`
		)
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

	test('Escape in a modal opened from a button in the panel closes the modal, and focus goes back to the button', async ({
		page,
	}) => {
		await openPanel(page);
		await expect(page.locator('html')).toHaveClass(/matter-ready-overlay/);

		const panel = page.locator('#test-nav');

		await page.evaluate(() => {
			const content = document.querySelector(
				'#test-nav .matter-panel__content'
			);
			const button = document.createElement('button');

			button.type = 'button';
			button.id = 'open-modal-from-panel';
			button.textContent = 'Open the modal';
			button.setAttribute('aria-controls', 'in-tab');
			content.append(button, document.querySelector('dialog#in-tab'));
		});

		const button = page.locator('#open-modal-from-panel');
		const modal = page.getByRole('dialog', { name: 'Modal in a tab' });

		await button.click();
		await expect(modal).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(modal).toBeHidden();
		await expect(panel).toHaveClass(/\bis-open\b/);
		await expect(button).toBeFocused();
	});
});

test.describe('drill-down', { tag: '@cross-browser' }, () => {
	test.use({ viewport: VIEWPORTS.mobile });

	const open = async (page) => {
		await openPanel(page);
		await expect.poll(() => isLive(page, 'h1')).toBe(false);
	};

	test('while a submenu is open the level it covers is inert; Back and Escape restore it', async ({
		page,
	}) => {
		await open(page);

		const panel = page.locator('#test-nav');
		const parent = panel.locator('.matter-menu__item.has-submenu').first();
		const before = await inertElements(page);

		await parent.locator(':scope > .matter-menu__toggle').click();
		await expect(parent).toHaveClass(/\bis-open\b/);

		// Only the open level is exposed: its own controls, not the other
		// items or the parent's toggle.
		expect(
			await isLive(page, '.matter-menu__submenu .matter-menu__back')
		).toBe(true);
		expect(
			await isLive(
				page,
				'.matter-menu__item.has-submenu > .matter-menu__toggle'
			)
		).toBe(false);
		expect(
			await isLive(
				page,
				'.matter-menu__items > .matter-menu__item:last-child'
			)
		).toBe(false);

		// Focus is in the open level, on Back (its name says which level).
		await expect(
			panel.getByRole('button', { name: /^Back/ }).first()
		).toBeFocused();

		// Back restores it, and focus goes to the toggle it came from.
		await panel.getByRole('button', { name: /^Back/ }).first().click();
		await expect(parent).not.toHaveClass(/\bis-open\b/);
		await expect.poll(() => inertElements(page)).toEqual(before);
		await expect(
			parent.locator(':scope > .matter-menu__toggle')
		).toBeFocused();

		// And Escape does the same.
		await parent.locator(':scope > .matter-menu__toggle').click();
		await expect(parent).toHaveClass(/\bis-open\b/);
		await page.keyboard.press('Escape');
		await expect(parent).not.toHaveClass(/\bis-open\b/);
		await expect(
			parent.locator(':scope > .matter-menu__toggle')
		).toBeFocused();
		await expect(panel).toHaveClass(/\bis-open\b/);
		expect(
			await isLive(
				page,
				'.matter-menu__item.has-submenu > .matter-menu__toggle'
			)
		).toBe(true);
	});

	test('a breakpoint change with a submenu open leaves nothing inert but the closed submenus', async ({
		page,
	}) => {
		await open(page);

		const panel = page.locator('#test-nav');
		const parent = panel.locator('.matter-menu__item.has-submenu').first();
		const closedSubmenus = () =>
			page.evaluate(
				() =>
					[...document.querySelectorAll('[inert]')].filter(
						(element) =>
							!element.classList.contains('matter-menu__submenu')
					).length
			);

		await parent.locator(':scope > .matter-menu__toggle').click();
		await expect(parent).toHaveClass(/\bis-open\b/);
		expect(await closedSubmenus()).toBeGreaterThan(0);

		await resizeThrough(page, [VIEWPORTS.atLg]);
		await expect(panel).not.toHaveClass(/\bis-open\b/);
		await expect(parent).not.toHaveClass(/\bis-open\b/);
		expect(await closedSubmenus()).toBe(0);
		await expect(page.locator('html')).not.toHaveClass(/has-panel-open/);
	});
});

test.describe('focus return after a click', { tag: '@cross-browser' }, () => {
	test.use({ viewport: VIEWPORTS.desktop });

	test('a modal opened with the mouse gives focus back to its trigger on Escape', async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);
		await expect(page.locator('html')).toHaveClass(/matter-ready-overlay/);

		const link = page.getByRole('link', {
			name: 'Open the modal in the collapsible',
		});
		const dialog = page.getByRole('dialog', {
			name: 'Modal in a collapsible',
		});

		// A click doesn't focus a link in Safari.
		await link.click();
		await expect(dialog).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden();
		await expect(link).toBeFocused();
	});
});

test.describe('right to left', { tag: '@cross-browser' }, () => {
	test.use({ viewport: VIEWPORTS.desktop });

	test('tabs: Left moves to the next tab and Right to the previous in a right-to-left tablist', async ({
		page,
	}) => {
		await page.goto(rtlPage.link);
		await expect(page.locator('#rtl-tabs')).toHaveClass(/is-enhanced/);

		const tabNamed = (name) => page.getByRole('tab', { name });

		await tabNamed('One').focus();
		await page.keyboard.press('ArrowLeft');
		await expect(tabNamed('Two')).toBeFocused();
		await expect(tabNamed('Two')).toHaveAttribute('aria-selected', 'true');
		await page.keyboard.press('ArrowLeft');
		await expect(tabNamed('Three')).toBeFocused();
		await page.keyboard.press('ArrowRight');
		await expect(tabNamed('Two')).toBeFocused();
	});

	test('tabs in a left-to-right page keep Right as next', async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);
		await expect(page.locator('#specs')).toHaveClass(/is-enhanced/);

		await page.getByRole('tab', { name: 'Size' }).focus();
		await page.keyboard.press('ArrowRight');
		await expect(page.getByRole('tab', { name: 'Colour' })).toBeFocused();
	});
});

test.describe('Arabic site', () => {
	test.use({ viewport: VIEWPORTS.desktop });

	let restore;

	test.beforeAll(async ({ requestUtils }) => {
		if (arabicInstalled()) {
			restore = await setSiteLanguage(requestUtils, 'ar');
		}
	});

	test.afterAll(async ({ requestUtils }) => {
		if (restore) {
			await restore();
		} else {
			await resetSiteLanguage(requestUtils);
		}
	});

	test('the menu: Left moves to the next item, and a submenu opens inside the screen', async ({
		page,
	}) => {
		test.skip(!arabicInstalled(), 'The Arabic language pack is missing.');

		await page.goto(kitchenSink.link);
		await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

		const menu = page.locator('nav.matter-menu--primary.opens-on-click');
		const toggle = menu.getByRole('button', { name: /Services/ });

		await expect(menu).toHaveClass(/is-enhanced/);
		await toggle.focus();
		await page.keyboard.press('ArrowLeft');
		await expect(menu.getByRole('link', { name: 'Contact' })).toBeFocused();
		await page.keyboard.press('ArrowRight');
		await expect(toggle).toBeFocused();

		await page.keyboard.press('Enter');
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');

		const box = await menu
			.locator('.matter-menu__submenu')
			.first()
			.boundingBox();

		expect(box.x).toBeGreaterThanOrEqual(0);
		expect(box.x + box.width).toBeLessThanOrEqual(1280);
	});
});
