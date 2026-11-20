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

	test('opening an inline panel from a script does nothing, so narrowing leaves it closed', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1400, height: 900 });
		await page.goto(kitchenSink.link);
		await expect(page.locator('#test-nav')).toHaveClass(/is-enhanced/);
		await expect(page.locator('html')).toHaveClass(/matter-ready-panel/);

		await page.evaluate(() => window.matter.panel('test-nav').open());
		await page.setViewportSize({ width: 760, height: 900 });
		await expect(page.locator('#test-nav')).not.toHaveClass(/\bis-open\b/);
		expect(
			await page.evaluate(() => window.matter.panel('test-nav').isOpen)
		).toBe(false);
		await expect(page.locator('html')).not.toHaveClass(/has-panel-open/);
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

		// Still where it was: the menu is inline now, not the toggle. Let
		// the browser finish the layout change (two frames) and any focus
		// work the panel queued, then wait on where focus is, not on time.
		await page.evaluate(
			() =>
				new Promise((resolve) =>
					window.requestAnimationFrame(() =>
						window.requestAnimationFrame(() =>
							window.setTimeout(resolve, 0)
						)
					)
				)
		);
		await expect(
			page.locator('#test-nav .matter-menu__toggle').first()
		).toBeFocused();
		await expect(
			page.locator('[aria-controls="test-nav"]')
		).not.toBeFocused();
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

test.describe('modals over a panel', { tag: '@cross-browser' }, () => {
	test.use({ viewport: VIEWPORTS.mobile });

	test('Escape in a modal placed outside the panel closes the modal first, then the panel', async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);
		await expect(page.locator('#test-nav')).toHaveClass(/is-enhanced/);
		await expect(page.locator('html')).toHaveClass(/matter-ready-overlay/);

		// A modal elsewhere in the page, opened from a button in the panel.
		await page.evaluate(() => {
			const holder = document.createElement('div');
			holder.append(document.querySelector('dialog#in-tab'));
			document.body.prepend(holder);

			const button = document.createElement('button');

			button.type = 'button';
			button.id = 'open-modal-from-panel';
			button.textContent = 'Open the modal';
			button.setAttribute('aria-controls', 'in-tab');
			document
				.querySelector('#test-nav .matter-panel__content')
				.append(button);
		});

		const panel = page.locator('#test-nav');
		const modal = page.getByRole('dialog', { name: 'Modal in a tab' });

		await page.locator('[aria-controls="test-nav"]').click();
		await expect(panel).toHaveClass(/\bis-open\b/);
		// The panel moves focus in a frame after opening: wait for that, or it
		// takes focus back from the button.
		await expect(
			page.locator('#test-nav .matter-menu__toggle').first()
		).toBeFocused();
		await page.locator('#open-modal-from-panel').focus();
		await page.keyboard.press('Enter');
		await expect(modal).toBeVisible();

		await page.keyboard.press('Escape');
		await expect(modal).toBeHidden();
		await expect(panel).toHaveClass(/\bis-open\b/);
		await expect(page.locator('#open-modal-from-panel')).toBeFocused();

		await page.keyboard.press('Escape');
		await expect(panel).not.toHaveClass(/\bis-open\b/);
	});

	test('a modal taken out of the page while open puts the panel back as it was', async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);
		await expect(page.locator('#test-nav')).toHaveClass(/is-enhanced/);
		await expect(page.locator('html')).toHaveClass(/matter-ready-overlay/);

		await page.evaluate(() => {
			const holder = document.createElement('div');
			holder.id = 'modal-holder';
			holder.append(document.querySelector('dialog#in-tab'));
			document.body.prepend(holder);

			const button = document.createElement('button');

			button.type = 'button';
			button.id = 'open-modal-from-panel';
			button.textContent = 'Open the modal';
			button.setAttribute('aria-controls', 'in-tab');
			document
				.querySelector('#test-nav .matter-panel__content')
				.append(button);
		});

		const panel = page.locator('#test-nav');
		const modal = page.getByRole('dialog', { name: 'Modal in a tab' });

		await page.locator('[aria-controls="test-nav"]').click();
		await expect(panel).toHaveClass(/\bis-open\b/);
		await expect.poll(() => isLive(page, 'h1')).toBe(false);
		// The panel moves focus in a frame after opening: wait for that, or it
		// takes focus back from the button.
		await expect(
			page.locator('#test-nav .matter-menu__toggle').first()
		).toBeFocused();
		await page.locator('#open-modal-from-panel').focus();
		await page.keyboard.press('Enter');
		await expect(modal).toBeVisible();

		// A script removes it while it is open.
		await page.evaluate(() =>
			document.querySelector('#modal-holder').remove()
		);

		// The page behind the panel is held again, and Tab stays in the panel.
		await expect.poll(() => isLive(page, 'h1')).toBe(false);
		await expect(panel).toHaveClass(/\bis-open\b/);

		for (let i = 0; i < 6; i++) {
			await page.keyboard.press('Tab');
			expect(
				await page.evaluate(() =>
					Boolean(
						window.document.activeElement.closest(
							'#test-nav .matter-panel__content'
						)
					)
				)
			).toBe(true);
		}

		// And it closes as usual.
		await page.keyboard.press('Escape');
		await expect(panel).not.toHaveClass(/\bis-open\b/);
	});

	test('a modal opened from a modal over the panel leaves the first usable when it closes', async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);
		await expect(page.locator('#test-nav')).toHaveClass(/is-enhanced/);
		await expect(page.locator('html')).toHaveClass(/matter-ready-overlay/);

		// Two modals in the page, which the open panel holds inert, and a
		// button in each panel and modal to open the next.
		await page.evaluate(() => {
			const holder = document.createElement('div');
			holder.id = 'modal-holder';
			document.body.prepend(holder);
			holder.append(
				document.querySelector('dialog#in-tab'),
				document.querySelector('dialog#in-accordion')
			);

			const add = (parent, id, controls) => {
				const button = document.createElement('button');

				button.type = 'button';
				button.id = id;
				button.textContent = id;
				button.setAttribute('aria-controls', controls);
				parent.append(button);
			};

			add(
				document.querySelector('#test-nav .matter-panel__content'),
				'open-a',
				'in-tab'
			);
			add(
				document.querySelector('dialog#in-tab'),
				'open-b',
				'in-accordion'
			);
		});

		const before = await inertElements(page);

		await page.locator('[aria-controls="test-nav"]').click();
		await expect(page.locator('#test-nav')).toHaveClass(/\bis-open\b/);
		await expect.poll(() => isLive(page, 'h1')).toBe(false);

		const a = page.getByRole('dialog', { name: 'Modal in a tab' });
		const b = page.getByRole('dialog', { name: 'Modal in an accordion' });

		await page.locator('#open-a').click();
		await expect(a).toBeVisible();
		await page.locator('#open-b').click();
		await expect(b).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(b).toBeHidden();

		// The first is still open, usable, and keeps focus: the panel's trap is
		// still resting and nothing around the first is inert again.
		await expect(a).toBeVisible();
		// (WebKit doesn't focus a button on click, so only where focus isn't.)
		const focusInPanel = () =>
			page.evaluate(() =>
				Boolean(
					window.document.activeElement.closest(
						'#test-nav .matter-panel__content'
					)
				)
			);

		expect(await focusInPanel()).toBe(false);
		expect(await isLive(page, 'dialog#in-tab')).toBe(true);
		await page.waitForTimeout(250);
		expect(await focusInPanel()).toBe(false);

		// Closing it puts the panel back, and closing that leaves nothing inert.
		await page.keyboard.press('Escape');
		await expect(a).toBeHidden();
		await expect(page.locator('#test-nav')).toHaveClass(/\bis-open\b/);
		expect(await isLive(page, '.matter-panel__close')).toBe(true);
		expect(await isLive(page, 'h1')).toBe(false);

		await page.locator('.matter-panel__close').click();
		await expect(page.locator('#test-nav')).not.toHaveClass(/\bis-open\b/);
		await expect.poll(() => inertElements(page)).toEqual(before);
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

	test('a modal opened from a button in an open submenu keeps focus', async ({
		page,
		browserName,
	}) => {
		await page.goto(kitchenSink.link);
		await expect(page.locator('#test-nav')).toHaveClass(/is-enhanced/);
		await expect(page.locator('html')).toHaveClass(/matter-ready-overlay/);

		// The modal is in the page, which the open menu holds inert; the button
		// that opens it is in the submenu.
		await page.evaluate(() => {
			const holder = document.createElement('div');
			holder.append(document.querySelector('dialog#in-tab'));
			document.body.prepend(holder);

			const second = document.createElement('button');

			second.type = 'button';
			second.id = 'second-in-modal';
			second.textContent = 'Second';
			document.querySelector('dialog#in-tab').append(second);

			const button = document.createElement('button');

			button.type = 'button';
			button.id = 'open-from-submenu';
			button.textContent = 'Open the modal';
			button.setAttribute('aria-controls', 'in-tab');
			document
				.querySelector('#test-nav .matter-menu__submenu')
				.append(button);
		});

		await page.locator('[aria-controls="test-nav"]').click();
		await expect(page.locator('#test-nav')).toHaveClass(/\bis-open\b/);

		const panel = page.locator('#test-nav');
		const parent = panel.locator('.matter-menu__item.has-submenu').first();

		await parent.locator(':scope > .matter-menu__toggle').click();
		await expect(parent).toHaveClass(/\bis-open\b/);
		await expect(
			panel.getByRole('button', { name: /^Back/ }).first()
		).toBeFocused();

		const modal = page.getByRole('dialog', { name: 'Modal in a tab' });

		await page.locator('#open-from-submenu').click();
		await expect(modal).toBeVisible();

		// The submenu's trap rests: focus stays in the modal, even a moment on.
		const inModal = () =>
			page.evaluate(() =>
				Boolean(window.document.activeElement.closest('dialog#in-tab'))
			);

		await page.waitForTimeout(250);
		expect(await inModal()).toBe(true);

		// Tab moves through the modal: the trap isn't taking the key. (WebKit's
		// Tab skips buttons; Option+Tab reaches them.)
		await modal.getByRole('button', { name: 'Close' }).focus();
		await page.keyboard.press('webkit' === browserName ? 'Alt+Tab' : 'Tab');
		await expect(page.locator('#second-in-modal')).toBeFocused();

		// And is back when the modal closes.
		await modal.getByRole('button', { name: 'Close' }).click();
		await expect(modal).toBeHidden();
		await expect(parent).toHaveClass(/\bis-open\b/);
		expect(
			await isLive(page, '.matter-menu__submenu .matter-menu__back')
		).toBe(true);
		expect(
			await isLive(
				page,
				'.matter-menu__item.has-submenu > .matter-menu__toggle'
			)
		).toBe(false);
	});

	test("the panel's close button stays in the Tab cycle while a submenu is open", async ({
		page,
		browserName,
	}) => {
		await open(page);

		const panel = page.locator('#test-nav');

		await panel
			.locator('.matter-menu__item.has-submenu > .matter-menu__toggle')
			.first()
			.click();
		await expect(
			panel.getByRole('button', { name: /^Back/ }).first()
		).toBeFocused();

		// Round the cycle: the close control is in it (WebKit's Tab skips
		// buttons; Option+Tab reaches them).
		const visited = new Set();

		for (let i = 0; i < 12; i++) {
			await page.keyboard.press(
				'webkit' === browserName ? 'Alt+Tab' : 'Tab'
			);
			visited.add(
				await page.evaluate(
					() => window.document.activeElement.className
				)
			);
		}

		expect([...visited].join(' ')).toContain('matter-panel__close');
		// And it never leaves the dialog.
		expect(
			await page.evaluate(() =>
				window.document.activeElement.closest('#test-nav')
					? 'in'
					: 'out'
			)
		).toBe('in');

		// Activating it closes the whole menu.
		await panel.locator('.matter-panel__close').click();
		await expect(panel).not.toHaveClass(/\bis-open\b/);
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
