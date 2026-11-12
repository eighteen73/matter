/**
 * Front end, as a visitor: accessibility and the behaviour fixed before 1.0.
 */
const { test, expect } = require('@wordpress/e2e-test-utils-playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const { createMenu, createPage } = require('./fixtures');

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 390, height: 800 };

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

		const results = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
			.analyze();

		expect(
			results.violations.map(
				({ id, nodes }) =>
					`${id}: ${nodes.map((n) => n.target).join(' | ')}`
			)
		).toEqual([]);
	});

	test('opening a dialog keeps axe happy', async ({ page }) => {
		await page.goto(kitchenSink.link);
		await page
			.getByRole('link', { name: 'Open the modal in tab two' })
			.click();
		await expect(
			page.getByRole('dialog', { name: 'Modal in a tab' })
		).toBeVisible();

		const results = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
			.analyze();

		expect(results.violations.map(({ id }) => id)).toEqual([]);
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
