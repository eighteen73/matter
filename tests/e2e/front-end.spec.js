/**
 * Front end, as a visitor: accessibility and the behaviour fixed before 1.0.
 */
const { test, expect } = require('@wordpress/e2e-test-utils-playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const {
	collections,
	createArchiveEntry,
	createCategories,
	createDuplicatesPage,
	createLargeSlotPage,
	deleteArchiveEntries,
	createMenu,
	createPage,
	createPosts,
	termsCarousel,
} = require('./fixtures');

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 390, height: 800 };

/**
 * The page's axe violations (WCAG 2.2 AA), with the elements involved.
 *
 * @param {Object} page Page.
 * @return {Promise<string[]>} Violations.
 */
const violations = async (page) =>
	(
		await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
			.analyze()
	).violations.map(
		({ id, nodes }) => `${id}: ${nodes.map((n) => n.target).join(' | ')}`
	);

let kitchenSink;
let ageGate;
let triggersPage;
let deepTabsPage;

test.beforeAll(async ({ requestUtils }) => {
	await requestUtils.deleteAllPages();
	await createMenu(requestUtils);

	kitchenSink = await createPage(
		requestUtils,
		'Kitchen sink',
		'kitchen-sink.html'
	);
	deepTabsPage = await createPage(
		requestUtils,
		'Deep tabs',
		'<!-- wp:matter/tabs {"anchor":"deep-tabs","label":"Deep"} --><!-- wp:matter/tab {"label":"One"} --><!-- wp:paragraph --><p>First</p><!-- /wp:paragraph --><!-- /wp:matter/tab -->' +
			'<!-- wp:matter/tab {"label":"Two"} -->' +
			'<!-- wp:spacer {"height":"1500px"} --><div style="height:1500px" aria-hidden="true" class="wp-block-spacer"></div><!-- /wp:spacer -->' +
			'<!-- wp:heading {"anchor":"heading-in-tab-2"} --><h2 class="wp-block-heading" id="heading-in-tab-2">Heading in tab two</h2><!-- /wp:heading -->' +
			'<!-- /wp:matter/tab --><!-- /wp:matter/tabs -->' +
			'<!-- wp:spacer {"height":"2000px"} --><div style="height:2000px" aria-hidden="true" class="wp-block-spacer"></div><!-- /wp:spacer -->'
	);
	triggersPage = await createPage(
		requestUtils,
		'Overlay triggers',
		'<!-- wp:paragraph --><p><a href="#offer">Same page</a> <a href="https://example.com/#offer">External</a> <a href="?other=1#offer">Other query</a> <a href="#offer" target="_blank">New tab</a> <a href="#offer" download>Download</a></p><!-- /wp:paragraph -->' +
			'<!-- wp:matter/modal {"overlayId":"offer","label":"Offer"} --><!-- wp:matter/slot {"name":"trigger"} /--><!-- wp:matter/slot {"name":"content"} --><!-- wp:paragraph --><p>The offer</p><!-- /wp:paragraph --><!-- /wp:matter/slot --><!-- /wp:matter/modal -->'
	);
	ageGate = await createPage(
		requestUtils,
		'Age gate',
		'<!-- wp:matter/modal {"overlayId":"age","label":"Age check","dismissible":false,"openOnLoad":true,"dismissDays":30} --><!-- wp:matter/slot {"name":"trigger"} /--><!-- wp:matter/slot {"name":"content"} --><!-- wp:paragraph --><p>Are you over 18? <a href="#age">Yes</a></p><!-- /wp:paragraph --><!-- /wp:matter/slot --><!-- /wp:matter/modal -->'
	);
});

// As a visitor.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('accessibility', () => {
	test.use({ viewport: DESKTOP });

	test('the kitchen sink has no axe violations', async ({ page }) => {
		await page.goto(kitchenSink.link);
		await page
			.locator('.wp-block-matter-carousel.is-initialised')
			.waitFor();

		expect(await violations(page)).toEqual([]);
	});

	test('opening a dialog keeps axe happy', async ({ page }) => {
		await page.goto(kitchenSink.link);
		await page
			.getByRole('link', { name: 'Open the modal in tab two' })
			.click();
		await expect(
			page.getByRole('dialog', { name: 'Modal in a tab' })
		).toBeVisible();

		expect(await violations(page)).toEqual([]);
	});
});

test.describe('overlays', { tag: '@cross-browser' }, () => {
	test.use({ viewport: DESKTOP });

	test("a dialog that can't be closed stays open on Escape", async ({
		page,
	}) => {
		await page.goto(ageGate.link);

		const dialog = page.getByRole('dialog', { name: 'Age check' });

		await expect(dialog).toBeVisible();
		await page.keyboard.press('Escape');
		await page.keyboard.press('Escape');
		await page.keyboard.press('Escape');
		await expect(dialog).toBeVisible();
		expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(
			[]
		);

		// Its own link closes it, and that counts as dismissing it.
		await dialog.getByRole('link', { name: 'Yes' }).click();
		await expect(dialog).toBeHidden();
		// Recorded in the dialog's close event, just after it closes.
		await expect
			.poll(() => page.evaluate(() => Object.keys(localStorage)))
			.toEqual(['matter_overlay_dismissed_age']);
	});

	test('a modal in an inactive tab opens its tab first', async ({ page }) => {
		await page.goto(kitchenSink.link);
		await page
			.getByRole('link', { name: 'Open the modal in tab two' })
			.click();

		await expect(
			page.getByRole('dialog', { name: 'Modal in a tab' })
		).toBeVisible();
		await expect(page.getByRole('tab', { name: 'Colour' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
	});

	test('a modal in a closed collapsible opens it first', async ({ page }) => {
		await page.goto(kitchenSink.link);
		await page
			.getByRole('link', { name: 'Open the modal in the collapsible' })
			.click();

		await expect(
			page.getByRole('dialog', { name: 'Modal in a collapsible' })
		).toBeVisible();
	});

	test('a modal in a closed accordion item opens it first', async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);
		await page
			.getByRole('link', { name: 'Open the modal in the accordion' })
			.click();

		await expect(
			page.getByRole('dialog', { name: 'Modal in an accordion' })
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Second question' })
		).toHaveAttribute('aria-expanded', 'true');
	});

	test("a modal that still can't be shown warns instead of opening", async ({
		page,
	}) => {
		const warnings = [];

		page.on('console', (message) => {
			if (message.type() === 'warning') {
				warnings.push(message.text());
			}
		});
		await page.goto(kitchenSink.link);
		// Hidden by the theme, which Matter can't reveal.
		await page.evaluate(() => {
			document.getElementById('specs').style.display = 'none';
		});
		await page
			.getByRole('link', { name: 'Open the modal in tab two' })
			.click();

		await expect.poll(() => warnings.length).toBeGreaterThan(0);
		await expect(page.locator('#in-tab')).not.toHaveAttribute('open', '');
	});

	test('a modal opened from the keyboard takes focus, and gives it back on Escape', async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);
		// Until the script has started a link just goes to its hash.
		await expect(page.locator('html')).toHaveClass(/matter-ready-overlay/);

		const link = page.getByRole('link', {
			name: 'Open the modal in the collapsible',
		});
		const dialog = page.getByRole('dialog', {
			name: 'Modal in a collapsible',
		});

		await link.focus();
		await page.keyboard.press('Enter');
		await expect(dialog).toBeVisible();
		expect(
			await dialog.evaluate((element) =>
				element.contains(element.ownerDocument.activeElement)
			)
		).toBe(true);

		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden();
		await expect(link).toBeFocused();
	});

	test('a drag ending on the backdrop leaves a modal open', async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);
		await page
			.getByRole('link', { name: 'Open the modal in tab two' })
			.click();

		const dialog = page.getByRole('dialog', { name: 'Modal in a tab' });
		const text = dialog.getByText(/Inside the tab/);
		const box = await text.boundingBox();

		await page.mouse.move(box.x + 2, box.y + 2);
		await page.mouse.down();
		await page.mouse.move(5, 5);
		await page.mouse.up();
		await expect(dialog).toBeVisible();

		// A real backdrop click closes it.
		await page.mouse.click(5, 5);
		await expect(dialog).toBeHidden();
	});
});

test.describe('overlays, with motion', () => {
	test.use({
		viewport: DESKTOP,
		contextOptions: {
			reducedMotion: 'no-preference',
			strictSelectors: true,
		},
	});

	test('closing animates out, then closes', async ({ page }) => {
		await page.goto(kitchenSink.link);

		const drawer = page.locator('#filters');

		await page.getByRole('link', { name: 'Filters' }).click();
		await expect(drawer).toHaveAttribute('open', '');
		await drawer.locator('.wp-block-matter-drawer__close').click();

		// Still open while it slides out (in every browser), then closed.
		await expect(drawer).toHaveClass(/\bis-closing\b/);
		await expect(drawer).not.toHaveAttribute('open', '');
		await expect(drawer).not.toHaveClass(/\bis-closing\b/);
	});
});

test.describe('carousel', () => {
	test.use({
		viewport: DESKTOP,
		contextOptions: {
			reducedMotion: 'no-preference',
			strictSelectors: true,
		},
	});

	test('pausing holds through hover and focus', async ({ page }) => {
		await page.goto(kitchenSink.link);

		const carousel = page.locator('#highlights');

		await expect(page.locator('#highlights.is-initialised')).toBeVisible();
		await page.getByRole('button', { name: 'Pause slideshow' }).click();

		const index = () =>
			page.evaluate(() => window.matter.carousel('highlights').index);
		const before = await index();

		// The things that used to restart it.
		await carousel.hover();
		await page.mouse.move(0, 0);
		await carousel.getByRole('link', { name: 'a link' }).focus();
		await page.keyboard.press('Tab');
		await page.waitForTimeout(6000);

		expect(await index()).toBe(before);
		await expect(carousel).not.toHaveClass(/\bis-playing\b/);
	});

	test('the current dot is aria-current="true"', async ({ page }) => {
		await page.goto(kitchenSink.link);
		await expect(
			page.locator(
				'#highlights .wp-block-matter-carousel__dot[aria-current]'
			)
		).toHaveAttribute('aria-current', 'true');
	});
});

test.describe('terms carousel', () => {
	test.use({ viewport: DESKTOP });

	test('a Terms Query shown as a carousel starts, its terms the slides', async ({
		page,
		requestUtils,
	}) => {
		const names = ['Matter Boots', 'Matter Hats', 'Matter Scarves'];
		const ids = await createCategories(requestUtils, names);
		const terms = await createPage(
			requestUtils,
			'Terms carousel',
			termsCarousel(ids, 'categories')
		);

		await page.goto(terms.link);

		const carousel = page.locator('#categories');

		await expect(carousel).toHaveClass(/\bis-initialised\b/);
		await expect(carousel).toHaveClass(/\bis-query\b/);

		const slides = await page.evaluate(() =>
			window.matter
				.carousel('categories')
				.slides.map((slide) => [
					slide.tagName,
					slide.classList.contains('wp-block-term'),
					slide.textContent.trim(),
				])
		);

		// The theme's term loop item (the fixture's links the term's name).
		expect(slides).toEqual(names.map((name) => ['LI', true, name]));
		await expect(
			carousel.getByRole('link', { name: 'Matter Hats' })
		).toBeVisible();

		// Its slides are groups, so their list is presentational (axe: list).
		await expect(carousel.locator('ul').first()).toHaveAttribute(
			'role',
			'none'
		);
		await expect(carousel.getByRole('group').first()).toHaveAttribute(
			'aria-roledescription',
			'slide'
		);
	});
});

test.describe('carousel, reduced motion', () => {
	test.use({ viewport: DESKTOP });

	test('nothing moves by itself, so there is no play button', async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);
		await expect(page.locator('#highlights.is-initialised')).toBeVisible();
		await expect(
			page.locator('#highlights .wp-block-matter-carousel__play')
		).toBeHidden();
	});

	test('the next slide is there at once, without scrolling to it', async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);
		await expect(page.locator('#highlights.is-initialised')).toBeVisible();
		await page.getByRole('button', { name: 'Next slide' }).first().click();

		// Read straight away: a smooth scroll would still be on its way.
		const [slide, viewport] = await page.evaluate(() => {
			const carousel = document.getElementById('highlights');
			const box = (element) => element.getBoundingClientRect().toJSON();

			return [
				box(
					[...carousel.querySelectorAll('p')].find(
						(p) => p.textContent === 'Slide two'
					)
				),
				box(
					carousel.querySelector(
						'.wp-block-matter-carousel__viewport'
					)
				),
			];
		});

		expect(Math.abs(slide.left - viewport.left)).toBeLessThan(2);
	});
});

test.describe('keyboard', { tag: '@cross-browser' }, () => {
	test.use({ viewport: DESKTOP });

	test('tabs: the arrow keys, Home and End move between tabs and select them', async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);
		// Keys go nowhere until the script has started.
		await expect(page.locator('#specs')).toHaveClass(/is-enhanced/);

		const size = page.getByRole('tab', { name: 'Size' });
		const colour = page.getByRole('tab', { name: 'Colour' });

		await size.focus();
		await page.keyboard.press('ArrowRight');
		await expect(colour).toBeFocused();
		await expect(colour).toHaveAttribute('aria-selected', 'true');
		await page.keyboard.press('Home');
		await expect(size).toBeFocused();
		await expect(size).toHaveAttribute('aria-selected', 'true');
		await page.keyboard.press('End');
		await expect(colour).toBeFocused();
	});

	test('accordion: the arrow keys, Home and End move between headings', async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);
		await expect(page.locator('#faq')).toHaveClass(/is-enhanced/);

		const first = page.getByRole('button', { name: 'First question' });
		const second = page.getByRole('button', { name: 'Second question' });

		await first.focus();
		await page.keyboard.press('ArrowDown');
		await expect(second).toBeFocused();
		await page.keyboard.press('Home');
		await expect(first).toBeFocused();
		await page.keyboard.press('End');
		await expect(second).toBeFocused();
		await page.keyboard.press('ArrowDown');
		await expect(first).toBeFocused();
	});

	test('dropdown menu: the arrow keys move along the menu, and within an open submenu', async ({
		page,
		browserName,
	}) => {
		await page.goto(kitchenSink.link);

		const menu = page.locator('nav.matter-menu--primary.opens-on-click');
		const toggle = menu.getByRole('button', { name: /Services/ });

		await expect(menu).toHaveClass(/is-enhanced/);
		await toggle.focus();
		await page.keyboard.press('ArrowRight');
		await expect(menu.getByRole('link', { name: 'Contact' })).toBeFocused();
		await page.keyboard.press('Home');
		await expect(toggle).toBeFocused();

		await page.keyboard.press('Enter');
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		// Safari doesn't Tab to links unless "Press Tab to highlight each
		// item" is on (Option+Tab always does), and the WebKit the tests run
		// has the default. Not Matter's: with Tab the focus goes to the next
		// control that isn't a link, out of the menu, which closes it.
		await page.keyboard.press('webkit' === browserName ? 'Alt+Tab' : 'Tab');
		await expect(
			menu.getByRole('link', { name: 'View all Services' })
		).toBeFocused();
		await page.keyboard.press('ArrowDown');
		await expect(menu.getByRole('link', { name: 'Design' })).toBeFocused();
		await page.keyboard.press('Escape');
		await expect(toggle).toBeFocused();
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');
	});

	test('carousel: its buttons move it from the keyboard', async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);
		await expect(page.locator('#highlights.is-initialised')).toBeVisible();

		const index = () =>
			page.evaluate(() => window.matter.carousel('highlights').index);

		await page
			.locator('#highlights')
			.getByRole('button', { name: 'Next slide' })
			.focus();
		await page.keyboard.press('Enter');
		await expect.poll(index).toBe(1);
		await page.keyboard.press('Space');
		await expect.poll(index).toBe(2);
	});
});

test.describe('menus', { tag: '@cross-browser' }, () => {
	test.use({ viewport: DESKTOP });

	test('click-to-open submenus link to their parent page', async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);

		const menu = page.locator('nav.matter-menu--primary.opens-on-click');

		await menu.getByRole('button', { name: /Services/ }).click();
		await expect(
			menu.getByRole('link', { name: 'View all Services' })
		).toBeVisible();
		await expect(
			menu.getByRole('link', { name: 'View all Services' })
		).toHaveAttribute('href', 'http://localhost:8889/services/');
	});

	test('a hover submenu stays open when its toggle is clicked', async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);

		const item = page.locator('#hover-menu .has-submenu').first();

		await item.hover();
		await expect(item).toHaveClass(/\bis-open\b/);
		await item.locator(':scope > .matter-menu__toggle').click();
		await page.mouse.move(0, 0);
		await page.waitForTimeout(500);
		await expect(item).toHaveClass(/\bis-open\b/);
	});

	test('Escape closes a hover submenu while another item has focus', async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);

		const item = page.locator('#hover-menu .has-submenu').first();

		await item.hover();
		await expect(item).toHaveClass(/\bis-open\b/);

		// Another top-level link, the pointer still over the submenu's item.
		await page.evaluate(() => {
			const open = document.querySelector('#hover-menu .has-submenu');

			[...document.querySelectorAll('#hover-menu .matter-menu__link')]
				.find((link) => !open.contains(link))
				.focus();
		});
		await page.keyboard.press('Escape');
		await expect(item).not.toHaveClass(/\bis-open\b/);
	});
});

test.describe('menus, a type set from a breakpoint up', () => {
	// `[ 'lg' => 'dropdown' ]`, and with a second entry from xl on.
	for (const [name, shortcode] of [
		['one entry', '[matter_menu_lg_only]'],
		['two entries', '[matter_menu_lg_only then="accordion"]'],
	]) {
		test(`a map with no base entry is a usable menu on a small screen (${name})`, async ({
			page,
			requestUtils,
		}) => {
			const { link } = await createPage(
				requestUtils,
				`Menu from lg ${name}`,
				`<!-- wp:shortcode -->${shortcode}<!-- /wp:shortcode -->`
			);

			await page.setViewportSize({ width: 375, height: 800 });
			await page.goto(link);

			const menu = page.locator('#lg-only-menu');
			const submenu = menu.getByRole('link', { name: 'Design' });

			// The first entry's type is the base: a dropdown, with its
			// submenu closed until opened.
			await expect(
				menu.getByRole('link', { name: 'Contact' })
			).toBeVisible();
			await expect(submenu).toBeHidden();

			await menu.getByRole('button', { name: /Services/ }).click();
			await expect(submenu).toBeVisible();
		});
	}
});

test.describe('panel', { tag: '@cross-browser' }, () => {
	test.use({ viewport: MOBILE });

	test('following a same-page link closes the panel', async ({ page }) => {
		await page.goto(kitchenSink.link);
		await page.locator('[aria-controls="test-nav"]').click();

		const panel = page.locator('#test-nav');

		await expect(panel).toHaveClass(/\bis-open\b/);
		await panel.getByRole('link', { name: 'Contact' }).click();
		await expect(panel).not.toHaveClass(/\bis-open\b/);
		await expect(page.locator('html')).not.toHaveClass(
			/\bhas-panel-open\b/
		);
	});

	test('a drill-down submenu keeps focus while it is open', async ({
		page,
		browserName,
	}) => {
		await page.goto(kitchenSink.link);
		await page.locator('[aria-controls="test-nav"]').click();

		const panel = page.locator('#test-nav');

		// The panel moves focus in, to its first control, as it opens.
		await expect(
			panel.locator('.matter-menu__toggle').first()
		).toBeFocused();
		await page.keyboard.press('Enter');

		const submenu = panel.locator(
			'.has-submenu.is-open .matter-menu__submenu'
		);

		await expect(submenu).toBeVisible();
		// Focus moves in once it has slid open.
		const focusIn = () =>
			submenu.evaluate((element) => {
				const active = element.ownerDocument.activeElement;

				return element.contains(active)
					? 'in'
					: `${active.tagName}.${active.className}`;
			});

		await expect.poll(focusIn).toBe('in');

		for (let i = 0; i < 6; i++) {
			// Safari's Tab skips links (see the dropdown test): with it, focus
			// leaves the page, which is the browser's, not the trap's.
			await page.keyboard.press(
				'webkit' === browserName ? 'Alt+Tab' : 'Tab'
			);
			expect(await focusIn(), `Tab ${i + 1}`).toBe('in');
		}
	});

	test('a live region outside the panel keeps announcing while it is open', async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);

		// Present before it opens, as a cart's or a router's are: one beside the
		// page's content, one inside it.
		await page.evaluate(() => {
			document.body.insertAdjacentHTML(
				'beforeend',
				'<div id="live-outside" aria-live="polite"></div>'
			);
			document
				.querySelector('main')
				.insertAdjacentHTML(
					'beforeend',
					'<p id="live-in-main" role="status"></p>'
				);
		});
		await page.locator('[aria-controls="test-nav"]').click();
		await expect(page.locator('#test-nav')).toHaveClass(/\bis-open\b/);

		const inertIds = await page.evaluate(() =>
			['live-outside', 'live-in-main'].map(
				(id) => !!document.getElementById(id).closest('[inert]')
			)
		);

		expect(inertIds).toEqual([false, false]);
		// The rest of the page is still inert.
		await expect(
			page.locator('main > :not(#live-in-main)').first()
		).toHaveJSProperty('inert', true);
	});

	test('a change of hash closes the panel', async ({ page }) => {
		await page.goto(kitchenSink.link);
		await page.locator('[aria-controls="test-nav"]').click();

		const panel = page.locator('#test-nav');

		await expect(panel).toHaveClass(/\bis-open\b/);
		// As a link elsewhere on the page, or a script, does.
		await page.evaluate(() => (window.location.hash = 'contact'));
		await expect(panel).not.toHaveClass(/\bis-open\b/);
	});

	test('closing with a submenu open returns focus to the toggle', async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);

		const toggle = page.locator('[aria-controls="test-nav"]');
		const panel = page.locator('#test-nav');

		await toggle.click();
		await panel.locator('.matter-menu__toggle').first().click();
		await expect(panel.locator('.has-submenu.is-open')).toHaveCount(1);
		await panel.locator('.matter-panel__close').click();

		await expect(toggle).toBeFocused();
	});

	test('Escape closes the submenu, then the panel', async ({ page }) => {
		await page.goto(kitchenSink.link);

		const toggle = page.locator('[aria-controls="test-nav"]');
		const panel = page.locator('#test-nav');

		await toggle.click();
		await panel.locator('.matter-menu__toggle').first().click();
		await page.keyboard.press('Escape');
		await expect(panel.locator('.has-submenu.is-open')).toHaveCount(0);
		await expect(panel).toHaveClass(/\bis-open\b/);
		await page.keyboard.press('Escape');
		await expect(panel).not.toHaveClass(/\bis-open\b/);
		await expect(toggle).toBeFocused();
	});
});

test.describe('overlay triggers and teardown', () => {
	test.use({ viewport: DESKTOP });

	test('a link to another page with the same hash navigates away', async ({
		page,
	}) => {
		await page.route('https://example.com/**', (route) =>
			route.fulfill({ contentType: 'text/html', body: 'External' })
		);
		await page.goto(triggersPage.link);
		await page.getByRole('link', { name: 'External' }).click();
		await expect(page).toHaveURL(/^https:\/\/example\.com\//);

		// The same path with another query is another page too.
		await page.goto(triggersPage.link);
		await page.getByRole('link', { name: 'Other query' }).click();
		await expect(page).toHaveURL(/other=1/);
		await expect(page.getByRole('dialog', { name: 'Offer' })).toBeHidden();
	});

	test('a link to this page opens the modal', async ({ page }) => {
		await page.goto(triggersPage.link);
		await page.getByRole('link', { name: 'Same page' }).click();
		await expect(page.getByRole('dialog', { name: 'Offer' })).toBeVisible();
	});

	test('a link that opens elsewhere or downloads is left to the browser', async ({
		page,
	}) => {
		await page.goto(triggersPage.link);
		await expect(page.locator('html')).toHaveClass(/matter-ready-overlay/);

		// Registered after Matter's listener, so it sees whether Matter took
		// the click; it also stops the browser opening a tab or downloading.
		await page.evaluate(() => {
			window.matterTaken = [];
			document.addEventListener('click', (event) => {
				window.matterTaken.push(event.defaultPrevented);
				event.preventDefault();
			});
		});
		await page.getByRole('link', { name: 'New tab' }).click();
		await page.getByRole('link', { name: 'Download' }).click();
		expect(await page.evaluate(() => window.matterTaken)).toEqual([
			false,
			false,
		]);
		await expect(page.getByRole('dialog', { name: 'Offer' })).toBeHidden();
	});

	test('a Ctrl or Cmd click is left to the browser', async ({
		page,
		context,
	}) => {
		await page.goto(triggersPage.link);

		const opened = context.waitForEvent('page');

		await page
			.getByRole('link', { name: 'Same page' })
			.click({ modifiers: ['ControlOrMeta'] });
		await opened;
		await expect(page.getByRole('dialog', { name: 'Offer' })).toBeHidden();
	});

	test('a trigger added after load works, and is kept in step', async ({
		page,
	}) => {
		await page.goto(triggersPage.link);
		await expect(page.locator('html')).toHaveClass(/matter-ready-overlay/);
		await page.evaluate(() => {
			const link = document.createElement('a');

			link.href = '#offer';
			link.id = 'late';
			link.textContent = 'Late trigger';
			document.body.prepend(link);
		});
		await page.locator('#late').click();
		await expect(page.getByRole('dialog', { name: 'Offer' })).toBeVisible();
		await expect(page.locator('#late')).toHaveAttribute(
			'aria-expanded',
			'true'
		);
		await expect(page.locator('#late')).toHaveAttribute(
			'aria-controls',
			'offer'
		);
	});

	test('a modal taken out of the page while open releases the scroll lock', async ({
		page,
	}) => {
		await page.goto(triggersPage.link);
		await page.getByRole('link', { name: 'Same page' }).click();
		await expect(page.locator('html')).toHaveClass(/has-overlay-open/);

		await page.evaluate(() =>
			document.querySelector('dialog#offer').remove()
		);
		await expect(page.locator('html')).not.toHaveClass(/has-overlay-open/);
		expect(
			await page.evaluate(
				() => window.getComputedStyle(document.documentElement).overflow
			)
		).not.toBe('hidden');
	});

	test('a panel taken out of the page while open releases the scroll lock', async ({
		page,
	}) => {
		await page.setViewportSize(MOBILE);
		await page.goto(kitchenSink.link);
		await page.locator('[aria-controls="test-nav"]').click();
		await expect(page.locator('html')).toHaveClass(/has-panel-open/);

		await page.evaluate(() => document.querySelector('#test-nav').remove());
		await expect(page.locator('html')).not.toHaveClass(/has-panel-open/);
	});

	test('Escape in a modal inside the panel closes only the modal', async ({
		page,
	}) => {
		await page.setViewportSize(MOBILE);
		await page.goto(kitchenSink.link);
		await page.locator('[aria-controls="test-nav"]').click();

		const panel = page.locator('#test-nav');

		await expect(panel).toHaveClass(/\bis-open\b/);
		await page.evaluate(() => {
			document
				.querySelector('#test-nav .matter-panel__content')
				.append(document.querySelector('dialog#in-tab'));
			window.matter.overlay('in-tab').open();
		});

		const modal = page.getByRole('dialog', { name: 'Modal in a tab' });

		await expect(modal).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(modal).toBeHidden();
		await expect(panel).toHaveClass(/\bis-open\b/);
	});
});

test.describe('slots', () => {
	test.use({ viewport: DESKTOP });

	test('a slot of over 1 MB renders, with the slots after it', async ({
		page,
		requestUtils,
	}) => {
		const large = await createLargeSlotPage(requestUtils);

		await page.goto(large.link);
		await expect(page.getByText('End of the large slot')).toBeVisible();
		await expect(
			page.getByText('Media slot after the large one')
		).toBeVisible();
	});
});

test.describe('deep links', () => {
	test.use({ viewport: DESKTOP });

	test('a link to a tab or accordion item opens it, also after load', async ({
		page,
	}) => {
		await page.goto(`${kitchenSink.link}#specs-2`);
		await expect(page.getByRole('tab', { name: 'Colour' })).toHaveAttribute(
			'aria-selected',
			'true'
		);

		await page.evaluate(() => (window.location.hash = '#faq-2'));
		await expect(page.locator('#faq-2')).toHaveClass(/\bis-open\b/);
	});
	test('an invalid #hash does not throw, in tabs or an accordion', async ({
		page,
	}) => {
		const errors = [];

		page.on('pageerror', (error) => errors.push(error.message));
		await page.goto(`${kitchenSink.link}#%E0%A4%A`);
		await expect(page.locator('html')).toHaveClass(/matter-ready-tabs/);
		await expect(page.locator('html')).toHaveClass(
			/matter-ready-accordion/
		);

		await page.evaluate(() => (window.location.hash = '#%E0%A4%A'));
		await page.evaluate(() => window.matter.tabs('specs').select(1));
		await expect(page.getByRole('tab', { name: 'Colour' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		expect(errors).toEqual([]);
	});

	test('a link to a heading in a hidden tab opens the tab and scrolls to it', async ({
		page,
	}) => {
		await page.goto(`${deepTabsPage.link}#heading-in-tab-2`);
		await expect(page.getByRole('tab', { name: 'Two' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		await expect(page.locator('#heading-in-tab-2')).toBeInViewport();
	});

	test('a link to something in a hidden tab, followed on the page, selects the tab and scrolls to it once it shows', async ({
		page,
	}) => {
		await page.goto(deepTabsPage.link);
		await expect(page.getByRole('tab', { name: 'One' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		await expect(page.locator('#heading-in-tab-2')).toBeHidden();

		await page.evaluate(() => {
			window.location.hash = 'heading-in-tab-2';
		});
		await expect(page.getByRole('tab', { name: 'Two' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		await expect(page.locator('#heading-in-tab-2')).toBeInViewport();
	});
});

test.describe('theme styles', () => {
	test.use({ viewport: DESKTOP });

	test("one class beats Matter's default skin, wherever it loads", async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);
		await page.locator('#highlights.is-initialised').waitFor();

		// A theme's rules, loaded before Matter's: only specificity can win.
		await page.evaluate(() => {
			const style = document.createElement('style');

			style.textContent = `
				.wp-block-matter-accordion-item__toggle { padding: 3px; }
				.wp-block-matter-accordion-item__toggle::after { rotate: 90deg; }
				.wp-block-matter-tabs__tab { padding: 3px; }
				.wp-block-matter-carousel__dot { width: 30px; }
				.wp-block-matter-modal { width: 300px; }
				.matter-menu__submenu { padding: 3px; }
				h2, h3, h4 { margin-block: 2em; }
			`;
			document.head.prepend(style);
		});
		await page.evaluate(() => (window.location.hash = '#faq-2'));
		await expect(page.locator('#faq-2')).toHaveClass(/\bis-open\b/);

		const computed = (selector, property, pseudo = null) =>
			page.evaluate(
				([s, p, e]) =>
					window
						.getComputedStyle(document.querySelector(s), e)
						.getPropertyValue(p),
				[selector, property, pseudo]
			);

		expect(
			await computed('.wp-block-matter-accordion-item__toggle', 'padding')
		).toBe('3px');
		// Open, too: the open state's turn is skin as well.
		expect(
			await computed(
				'#faq-2 .wp-block-matter-accordion-item__toggle',
				'rotate',
				'::after'
			)
		).toBe('90deg');
		expect(await computed('.wp-block-matter-tabs__tab', 'padding')).toBe(
			'3px'
		);
		expect(await computed('.wp-block-matter-carousel__dot', 'width')).toBe(
			'30px'
		);
		expect(await computed('#in-tab', 'width')).toBe('300px');
		expect(await computed('.matter-menu__submenu', 'padding')).toBe('3px');
		// Matter's resets still beat a theme's element styles.
		expect(
			await computed('.wp-block-matter-accordion-item__heading', 'margin')
		).toBe('0px');
	});
});

test.describe('right to left', () => {
	test.use({ viewport: DESKTOP });

	test('a drawer at the start opens on the right, in right-to-left content', async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);
		await page.evaluate(() => (document.documentElement.dir = 'rtl'));
		await page.getByRole('link', { name: 'Filters' }).click();

		const drawer = page.locator('#filters');

		await expect(drawer).toHaveAttribute('open', '');

		const box = await drawer.boundingBox();

		expect(Math.round(box.x + box.width)).toBe(DESKTOP.width);
	});

	test('a carousel in a right-to-left section of a left-to-right site scrolls its way', async ({
		page,
	}) => {
		// The carousel's section is right to left before its script starts.
		await page.addInitScript(() => {
			new window.MutationObserver((records, observer) => {
				const carousel = document.getElementById('highlights');

				if (carousel) {
					carousel.parentElement.dir = 'rtl';
					observer.disconnect();
				}
			}).observe(document, { childList: true, subtree: true });
		});
		await page.goto(kitchenSink.link);

		const carousel = page.locator('#highlights');

		await expect(carousel).toHaveClass(/\bis-initialised\b/);
		await page.evaluate(() => {
			const instance = window.matter.carousel('highlights');

			instance.pause();
			instance.goTo(1, true);
		});

		const viewport = await carousel
			.locator('.wp-block-matter-carousel__viewport')
			.boundingBox();
		const slide = await carousel.getByText('Slide two').boundingBox();

		expect(slide.x).toBeGreaterThanOrEqual(viewport.x - 1);
		expect(slide.x + slide.width).toBeLessThanOrEqual(
			viewport.x + viewport.width + 1
		);
	});
});

test.describe('reduced motion', () => {
	test.use({ viewport: DESKTOP });

	test('grouped modals switch without a transition', async ({ page }) => {
		await page.goto(kitchenSink.link);

		const duration = await page.evaluate(() => {
			const modal = document.getElementById('in-tab');

			modal.classList.add('is-switching-in');

			return window.getComputedStyle(modal).transitionDuration;
		});

		expect(duration.split(', ').every((value) => value === '0s')).toBe(
			true
		);
	});
});

test.describe('collections: galleries, vertical tabs and posts displays', () => {
	test.use({ viewport: DESKTOP });

	let collectionsPage;

	test.beforeAll(async ({ requestUtils }) => {
		// Posts left by an earlier run would push these out of the accordion.
		await requestUtils.deleteAllPosts();

		const ids = await createPosts(requestUtils, [
			'Matter post one',
			'Matter post two',
			'Matter post three',
		]);

		collectionsPage = await createPage(
			requestUtils,
			'Collections',
			collections(ids)
		);
	});

	test('they have no axe violations', async ({ page }) => {
		await page.goto(collectionsPage.link);
		await expect(
			page.locator('.wp-block-matter-carousel:not(.is-initialised)')
		).toHaveCount(0);
		await expect(page.locator('#posts-accordion')).toContainText(
			'Matter post one'
		);

		expect(await violations(page)).toEqual([]);
	});

	test('the lightbox opens from an image, moves with the arrow keys, and gives focus back', async ({
		page,
	}) => {
		await page.goto(collectionsPage.link);
		await expect(page.locator('#photos')).toHaveClass(/is-enhanced/);

		const opener = page
			.locator('#photos')
			.getByRole('button', { name: 'Enlarge image 1 of 3' });
		const lightbox = page.locator('#photos + dialog, #photos dialog');
		const image = lightbox.locator('.wp-block-matter-gallery__figure img');

		await opener.focus();
		await page.keyboard.press('Enter');
		await expect(lightbox).toHaveAttribute('open', '');
		await expect(image).toHaveAttribute('alt', 'Photo one');
		expect(await violations(page)).toEqual([]);

		await page.keyboard.press('ArrowRight');
		await expect(image).toHaveAttribute('alt', 'Photo two');
		await page.keyboard.press('ArrowLeft');
		await expect(image).toHaveAttribute('alt', 'Photo one');

		await page.keyboard.press('Escape');
		await expect(lightbox).not.toHaveAttribute('open', '');
		await expect(opener).toBeFocused();
	});

	test('Home and End in the lightbox go to the first and last image of the gallery', async ({
		page,
	}) => {
		await page.goto(collectionsPage.link);
		await expect(page.locator('#photos')).toHaveClass(/is-enhanced/);

		const lightbox = page.locator('#photos + dialog, #photos dialog');
		const image = lightbox.locator('.wp-block-matter-gallery__figure img');

		await page
			.locator('#photos')
			.getByRole('button', { name: 'Enlarge image 1 of 3' })
			.click();
		await expect(image).toHaveAttribute('alt', 'Photo one');

		// Three images, two of them in the page: End is the one that isn't.
		await page.keyboard.press('End');
		await expect(image).toHaveAttribute('alt', 'Photo three');
		await page.keyboard.press('ArrowLeft');
		await expect(image).toHaveAttribute('alt', 'Photo two');
		await page.keyboard.press('Home');
		await expect(image).toHaveAttribute('alt', 'Photo one');
		await page.keyboard.press('End');
		await expect(image).toHaveAttribute('alt', 'Photo three');
	});

	test('"View all" without a lightbox shows the rest and moves focus to them', async ({
		page,
	}) => {
		await page.goto(collectionsPage.link);

		const gallery = page.locator('#more-photos');

		await expect(gallery.getByAltText('Hidden photo')).toBeHidden();
		await gallery.getByRole('button', { name: /View all/ }).focus();
		await page.keyboard.press('Enter');
		await expect(gallery.getByAltText('Hidden photo')).toBeVisible();
		expect(
			await gallery.evaluate((element) => {
				const figure = element
					.querySelector('img[alt="Hidden photo"]')
					.closest('figure');

				return figure.contains(element.ownerDocument.activeElement);
			})
		).toBe(true);
	});

	test('vertical tabs move with the up and down arrows; posts tabs with left and right', async ({
		page,
	}) => {
		await page.goto(collectionsPage.link);
		await expect(page.locator('#steps')).toHaveClass(/is-enhanced/);
		await expect(page.locator('#posts-tabs')).toHaveClass(/is-enhanced/);

		await page.getByRole('tab', { name: 'Plan' }).focus();
		await page.keyboard.press('ArrowDown');
		await expect(page.getByRole('tab', { name: 'Build' })).toBeFocused();

		const posts = page.locator('#posts-tabs').getByRole('tab');

		await expect(posts).toHaveCount(3);
		await posts.first().focus();
		await page.keyboard.press('ArrowRight');
		await expect(posts.nth(1)).toBeFocused();
		await expect(posts.nth(1)).toHaveAttribute('aria-selected', 'true');
	});
});

test.describe('blocks rendered twice', () => {
	test.use({ viewport: DESKTOP });

	let duplicates;

	test.beforeAll(async ({ requestUtils }) => {
		duplicates = await createDuplicatesPage(requestUtils);
	});

	test('every ID on the page is unique, and axe finds no duplicates', async ({
		page,
	}) => {
		await page.goto(duplicates.link);
		await page.locator('.wp-block-matter-tabs').first().waitFor();

		const repeated = await page.evaluate(() => {
			const seen = new Set();

			return [...document.querySelectorAll('[id]')]
				.map((element) => element.id)
				.filter((id) => seen.size === seen.add(id).size);
		});

		expect(repeated).toEqual([]);
		expect(
			(await violations(page)).filter((line) =>
				/^duplicate-id/.test(line)
			)
		).toEqual([]);
	});

	test('each copy of the tabs works on its own', async ({ page }) => {
		await page.goto(duplicates.link);

		const tabs = page.locator('.wp-block-matter-tabs');

		await expect(tabs).toHaveCount(2);
		await expect(tabs.nth(0)).toHaveAttribute('id', 'dup-tabs');
		// The first copy's second panel is `dup-tabs-2`, so the copy is `-3`.
		await expect(tabs.nth(1)).toHaveAttribute('id', 'dup-tabs-3');

		await tabs.nth(1).getByRole('tab', { name: 'Second' }).click();

		await expect(
			tabs.nth(1).getByRole('tabpanel', { name: 'Second' })
		).toBeVisible();
		await expect(
			tabs.nth(0).getByRole('tabpanel', { name: 'First' })
		).toBeVisible();
		await expect(
			tabs.nth(0).getByRole('tab', { name: 'First' })
		).toHaveAttribute('aria-selected', 'true');

		// Each tab controls the panel in its own copy.
		await tabs.nth(0).getByRole('tab', { name: 'Second' }).click();
		await expect(
			tabs.nth(0).getByRole('tabpanel', { name: 'Second' })
		).toBeVisible();
		await expect(
			tabs.nth(1).getByRole('tab', { name: 'Second' })
		).toHaveAttribute('aria-selected', 'true');
	});

	test('opening the second modal opens only it', async ({ page }) => {
		await page.goto(duplicates.link);

		const first = page.locator('dialog#dup-modal');
		const second = page.locator('dialog#dup-modal-2');

		await page.locator('a[href="#dup-modal"]').nth(1).click();
		await expect(second).toHaveJSProperty('open', true);
		await expect(first).toHaveJSProperty('open', false);
		await expect(
			page.locator('dialog:modal'),
			'only one dialog is in the top layer'
		).toHaveCount(1);

		await page.keyboard.press('Escape');
		await expect(second).toHaveJSProperty('open', false);

		await page.locator('a[href="#dup-modal"]').nth(0).click();
		await expect(first).toHaveJSProperty('open', true);
		await expect(second).toHaveJSProperty('open', false);
	});
});

test.describe('links inside a trigger area', () => {
	test.use({ viewport: DESKTOP });

	const modal = (id, trigger) =>
		`<!-- wp:matter/modal {"overlayId":"${id}","label":"${id}"} -->` +
		`<!-- wp:matter/slot {"name":"trigger"} --><!-- wp:paragraph -->${trigger}<!-- /wp:paragraph --><!-- /wp:matter/slot -->` +
		`<!-- wp:matter/slot {"name":"content"} --><!-- wp:paragraph --><p>Inside ${id}</p><!-- /wp:paragraph --><!-- /wp:matter/slot -->` +
		'<!-- /wp:matter/modal -->';

	test("a link to another modal in one modal's trigger opens that modal", async ({
		page,
		requestUtils,
	}) => {
		const created = await createPage(
			requestUtils,
			'Trigger slot links',
			modal(
				'slot-host',
				'<p><a href="#slot-host">Open host</a> <button type="button" aria-controls="slot-other">Open other</button></p>'
			) +
				modal(
					'slot-other',
					'<p><a href="#slot-other">Open other too</a></p>'
				)
		);

		await page.goto(created.link);
		await page
			.getByRole('button', { name: 'Open other', exact: true })
			.click();

		await expect(page.locator('dialog#slot-other')).toHaveJSProperty(
			'open',
			true
		);
		await expect(page.locator('dialog#slot-host')).toHaveJSProperty(
			'open',
			false
		);
		await expect(page.locator('dialog:modal')).toHaveCount(1);
	});

	test("the saved link in a copy's trigger opens only the copy", async ({
		page,
		requestUtils,
	}) => {
		const pattern = await requestUtils.rest({
			path: '/wp/v2/blocks',
			method: 'POST',
			data: {
				title: `Trigger copies ${Date.now()}`,
				status: 'publish',
				content: modal(
					'copy-modal',
					'<p><a href="#copy-modal">Open copy</a></p>'
				),
			},
		});
		const use = `<!-- wp:block {"ref":${pattern.id}} /-->`;
		const created = await createPage(
			requestUtils,
			'Trigger copies',
			use + use
		);

		await page.goto(created.link);
		await page.getByRole('link', { name: 'Open copy' }).nth(1).click();

		await expect(page.locator('dialog#copy-modal-2')).toHaveJSProperty(
			'open',
			true
		);
		await expect(page.locator('dialog#copy-modal')).toHaveJSProperty(
			'open',
			false
		);
	});
});

test.describe('author and date archives', () => {
	test.use({ viewport: DESKTOP });

	let author;

	test.beforeAll(async ({ requestUtils }) => {
		await createPosts(requestUtils, [
			'Archive post one',
			'Archive post two',
		]);
		author = (await requestUtils.rest({ path: '/wp/v2/users/me' })).id;
		await deleteArchiveEntries(requestUtils);
	});

	test.afterAll(async ({ requestUtils }) => {
		await deleteArchiveEntries(requestUtils);
	});

	test('without entries they show the default, titled for the archive', async ({
		page,
	}) => {
		await page.goto(`/?author=${author}`);
		await expect(page.locator('h1')).toContainText('Author:');

		await page.goto('/?year=2026');
		await expect(page.locator('h1')).toContainText('2026');
	});

	test('each has its own entry, and the blog’s shows only when it cascades', async ({
		page,
		requestUtils,
	}) => {
		await createArchiveEntry(requestUtils, 'post_type:post', {
			content:
				'<!-- wp:paragraph --><p>Blog intro</p><!-- /wp:paragraph --><!-- wp:matter/archive-loop /-->',
		});

		await page.goto(`/?author=${author}`);
		await expect(page.getByText('Blog intro')).toHaveCount(0);
		await expect(page.getByText('Archive post one')).toBeVisible();

		await createArchiveEntry(requestUtils, 'author', {
			content:
				'<!-- wp:paragraph --><p>Authors intro</p><!-- /wp:paragraph --><!-- wp:matter/archive-loop /-->',
		});
		await createArchiveEntry(requestUtils, 'date', {
			content:
				'<!-- wp:paragraph --><p>Dates intro</p><!-- /wp:paragraph --><!-- wp:matter/archive-loop /-->',
		});

		await page.goto(`/?author=${author}`);
		await expect(page.getByText('Authors intro')).toBeVisible();
		await expect(page.getByText('Dates intro')).toHaveCount(0);
		await expect(page.getByText('Blog intro')).toHaveCount(0);

		await page.goto('/?year=2026');
		await expect(page.getByText('Dates intro')).toBeVisible();
		await expect(page.getByText('Authors intro')).toHaveCount(0);

		// The blog itself is untouched.
		await page.goto('/');
		await expect(page.getByText('Blog intro')).toBeVisible();
		await expect(page.getByText('Authors intro')).toHaveCount(0);
	});

	test('the blog’s entry shows on them when it is set to cascade', async ({
		page,
		requestUtils,
	}) => {
		await deleteArchiveEntries(requestUtils);
		await createArchiveEntry(requestUtils, 'post_type:post', {
			cascade: true,
			content:
				'<!-- wp:paragraph --><p>Shared blog intro</p><!-- /wp:paragraph --><!-- wp:matter/archive-loop /-->',
		});

		await page.goto(`/?author=${author}`);
		await expect(page.getByText('Shared blog intro')).toBeVisible();

		await page.goto('/?year=2026');
		await expect(page.getByText('Shared blog intro')).toBeVisible();
	});
});

test.describe('the JavaScript API', () => {
	test.use({ viewport: DESKTOP });

	let overlays;

	const modal = (id, group) =>
		`<!-- wp:matter/modal {"overlayId":"${id}","group":"${group}"} --><!-- wp:matter/slot {"name":"content"} --><!-- wp:paragraph --><p>Content of ${id}</p><!-- /wp:paragraph --><!-- /wp:matter/slot --><!-- /wp:matter/modal -->`;

	test.beforeAll(async ({ requestUtils }) => {
		overlays = await createPage(
			requestUtils,
			'API overlays',
			modal('api-one', 'api') + modal('api-two', 'api')
		);
	});

	test('has no underscore members, and overlays have prev() but not previous()', async ({
		page,
	}) => {
		await page.goto(overlays.link);

		const api = await page.evaluate(async () => {
			const one = await window.matter.ready('api-one');

			return {
				keys: Object.keys(window.matter),
				methods: Object.keys(one),
				prev: typeof one.prev,
				previous: typeof one.previous,
				closeAll: typeof one.closeAll,
			};
		});

		expect(api.keys.filter((key) => key.startsWith('_'))).toEqual([]);
		expect(api.prev).toBe('function');
		expect(api.closeAll).toBe('function');
		expect(api.previous).toBe('undefined');

		// prev() moves to the other modal in the group.
		await page.evaluate(() => window.matter.overlay('api-two').open());
		await expect(page.locator('dialog#api-two')).toHaveJSProperty(
			'open',
			true
		);
		await page.evaluate(() => window.matter.overlay('api-two').prev());
		await expect(page.locator('dialog#api-one')).toHaveJSProperty(
			'open',
			true
		);
	});

	test('ready() settles for a present, a hashed and an unknown target', async ({
		page,
	}) => {
		await page.goto(overlays.link);

		const settled = await page.evaluate(async () => {
			const forms = [
				'api-one',
				'#api-one',
				document.getElementById('api-one'),
			];
			const found = await Promise.all(
				forms.map((form) => window.matter.ready(form))
			);

			return {
				found: found.map((instance) => instance?.id),
				missing: await window.matter.ready('#missing'),
			};
		});

		expect(settled.found).toEqual(['api-one', 'api-one', 'api-one']);
		expect(settled.missing).toBeNull();
	});

	test('a hash-open on load fires matter-overlay-open once, and closing fires -close', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			window.matterSeen = [];

			for (const name of ['open', 'close']) {
				document.addEventListener(`matter-overlay-${name}`, (event) =>
					window.matterSeen.push([
						name,
						event.detail.id,
						event.detail.instance?.id,
					])
				);
			}
		});

		await page.goto(`${overlays.link}#api-two`);
		await expect(page.locator('dialog#api-two')).toHaveJSProperty(
			'open',
			true
		);
		expect(await page.evaluate(() => window.matterSeen)).toEqual([
			['open', 'api-two', 'api-two'],
		]);

		await page.keyboard.press('Escape');
		await expect(page.locator('dialog#api-two')).toHaveJSProperty(
			'open',
			false
		);
		await expect
			.poll(() => page.evaluate(() => window.matterSeen))
			.toEqual([
				['open', 'api-two', 'api-two'],
				['close', 'api-two', 'api-two'],
			]);
	});
});

test.describe('archive entries are not pages, logged out', () => {
	test.use({ storageState: { cookies: [], origins: [] } });

	let published;
	let draft;

	test.beforeAll(async ({ requestUtils }) => {
		await deleteArchiveEntries(requestUtils);
		published = await createArchiveEntry(requestUtils, 'search', {
			title: 'Entry title that must not leak',
		});
		draft = await createArchiveEntry(requestUtils, 'date', {
			status: 'draft',
		});
	});

	test.afterAll(async ({ requestUtils }) => {
		await deleteArchiveEntries(requestUtils);
	});

	test('no address lists them or shows one, and the REST API does not list them', async ({
		page,
		request,
	}) => {
		for (const path of [
			'/?post_type=matter_archive',
			'/?post_type=matter_archive&paged=2',
			'/?post_type=matter_archive&feed=rss2',
			`/?p=${draft.id}&post_type=matter_archive`,
		]) {
			const response = await page.goto(path);

			expect(response.status(), path).toBe(404);
			await expect(page.locator('body'), path).not.toHaveClass(
				/\bblog\b/
			);
		}

		// A feed is a 404 with no entry in it: nothing in the body to read.
		for (const path of [
			'/?post_type=matter_archive&feed=rss2',
			'/?post_type=matter_archive&feed=atom',
			'/feed/?post_type=matter_archive',
			'/?post_type[]=matter_archive&post_type[]=post&feed=rss2',
			'/?post_type=matter_archive&feed=rss2&s=entry',
		]) {
			const feed = await request.get(path);
			const body = await feed.text();

			expect(feed.status(), path).toBe(404);
			// (A feed that also asks for posts lists those, but never an entry.)
			if (!path.includes('post_type[]=post')) {
				expect(body, path).not.toContain('<item>');
			}

			expect(body, path).not.toContain('<entry>');
			expect(body, path).not.toContain('Entry title that must not leak');
		}

		// A published entry's own address as a feed goes to its archive: no
		// feed, and nothing of the entry in it.
		const own = await request.get(`/?p=${published.id}&feed=rss2`);
		const ownBody = await own.text();

		expect(ownBody).not.toContain('Entry title that must not leak');

		// A published entry's own address goes to its archive.
		await page.goto(`/?p=${published.id}&post_type=matter_archive`);
		expect(new URL(page.url()).searchParams.get('s')).not.toBeNull();

		// Nor is it in the sitemap or the REST API.
		const sitemap = await request.get('/wp-sitemap.xml');

		expect(await sitemap.text()).not.toContain('matter_archive');

		for (const route of [
			'/?rest_route=/wp/v2/matter_archive',
			`/?rest_route=/wp/v2/matter_archive/${published.id}`,
		]) {
			expect((await request.get(route)).status(), route).toBe(401);
		}
	});
});

test.describe('accordion, as it starts, with motion', () => {
	test.use({
		viewport: DESKTOP,
		contextOptions: { reducedMotion: 'no-preference' },
	});

	let accordionPage;

	test.beforeAll(async ({ requestUtils }) => {
		accordionPage = await createPage(
			requestUtils,
			'Accordion start',
			'<!-- wp:matter/accordion {"anchor":"start-faq"} --><!-- wp:matter/accordion-item {"title":"Open one","open":true} --><!-- wp:paragraph --><p>Open answer</p><!-- /wp:paragraph --><!-- /wp:matter/accordion-item --><!-- wp:matter/accordion-item {"title":"Closed one"} --><!-- wp:paragraph --><p><a id="closed-link" href="https://example.com/">A link in a closed answer</a></p><!-- /wp:paragraph --><!-- /wp:matter/accordion-item --><!-- /wp:matter/accordion -->'
		);
	});

	test('a closed answer is never exposed while the script starts, even with motion', async ({
		page,
	}) => {
		// Every frame from the start of the page, until well after the
		// accordion has started: is the link in the closed answer reachable
		// (rendered, not `visibility: hidden` or `content-visibility: hidden`)?
		await page.addInitScript(() => {
			window.matterExposed = [];
			window.matterStarted = 0;

			const sample = () => {
				const link = document.getElementById('closed-link');

				if (link) {
					if (
						document.querySelector(
							'.wp-block-matter-accordion.is-enhanced'
						) &&
						!window.matterStarted
					) {
						window.matterStarted = performance.now();
					}

					if (
						link.checkVisibility({
							visibilityProperty: true,
							contentVisibilityAuto: true,
						})
					) {
						window.matterExposed.push(
							Math.round(performance.now())
						);
					}
				}

				if (
					!window.matterStarted ||
					performance.now() - window.matterStarted < 800
				) {
					window.requestAnimationFrame(sample);
				} else {
					window.matterSampled = true;
				}
			};

			window.requestAnimationFrame(sample);
		});

		await page.goto(accordionPage.link);
		await page.waitForFunction(() => window.matterSampled === true);

		expect(await page.evaluate(() => window.matterExposed)).toEqual([]);
		await expect(page.locator('#closed-link')).toBeHidden();
	});
});
