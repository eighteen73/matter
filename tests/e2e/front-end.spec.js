/**
 * Front end, as a visitor: accessibility and the behaviour fixed before 1.0.
 */
const { test, expect } = require('@wordpress/e2e-test-utils-playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const {
	collections,
	createCategories,
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

test.beforeAll(async ({ requestUtils }) => {
	await requestUtils.deleteAllPages();
	await createMenu(requestUtils);

	kitchenSink = await createPage(
		requestUtils,
		'Kitchen sink',
		'kitchen-sink.html'
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

test.describe('overlays', () => {
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

test.describe('keyboard', () => {
	test.use({ viewport: DESKTOP });

	test('tabs: the arrow keys, Home and End move between tabs and select them', async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);

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
	}) => {
		await page.goto(kitchenSink.link);

		const menu = page.locator('nav.matter-menu--primary.opens-on-click');
		const toggle = menu.getByRole('button', { name: /Services/ });

		await toggle.focus();
		await page.keyboard.press('ArrowRight');
		await expect(menu.getByRole('link', { name: 'Contact' })).toBeFocused();
		await page.keyboard.press('Home');
		await expect(toggle).toBeFocused();

		await page.keyboard.press('Enter');
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await page.keyboard.press('Tab');
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

test.describe('menus', () => {
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

test.describe('panel', () => {
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
			await page.keyboard.press('Tab');
			expect(await focusIn(), `Tab ${i + 1}`).toBe('in');
		}
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
