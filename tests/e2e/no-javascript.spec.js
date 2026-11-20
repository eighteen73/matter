/**
 * Without JavaScript, and when a block's script doesn't start: content is
 * there and nothing is hidden or inert waiting for a script. Each block's
 * enhanced behaviour has its own checks in front-end.spec.js; here, the same
 * pages are loaded with scripts off (NO_JAVASCRIPT) and, for the regression
 * checks, with scripts on.
 */
const { test, expect } = require('@wordpress/e2e-test-utils-playwright');
const {
	NO_JAVASCRIPT,
	emulate,
	VIEWPORTS,
	createMenu,
	createPage,
} = require('./fixtures');

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

test.describe('the page is marked', () => {
	test.describe('without JavaScript', () => {
		test.use({ ...NO_JAVASCRIPT, viewport: VIEWPORTS.desktop });

		test('nothing says JavaScript is on, and no block is enhanced', async ({
			page,
		}) => {
			await page.goto(kitchenSink.link);

			await expect(page.locator('html')).not.toHaveClass(/matter-js/);
			await expect(page.locator('.is-enhanced')).toHaveCount(0);
		});
	});

	test.describe('with JavaScript', () => {
		test.use({ viewport: VIEWPORTS.desktop });

		test('the page says so, and every interactive block starts', async ({
			page,
		}) => {
			await page.goto(kitchenSink.link);

			await expect(page.locator('html')).toHaveClass(/matter-js/);
			// Not late: that's only for a block whose script didn't start.
			await expect(page.locator('html')).not.toHaveClass(/matter-late/);

			for (const selector of [
				'#faq', // Accordion.
				'#specs', // Tabs.
				'#highlights', // Carousel.
				'dialog#filters', // Drawer.
				'dialog#in-tab', // Modal.
				'#more', // Collapsible content.
				'#test-nav', // Panel.
				'.matter-panel-toggle', // Its toggle.
				'#hover-menu', // Menu.
			]) {
				await expect(page.locator(selector).first()).toHaveClass(
					/is-enhanced/
				);
			}
		});

		test('the page says a block was late when the allowance has run out', async ({
			page,
		}) => {
			await page.clock.install();
			await page.goto(kitchenSink.link);
			await page.clock.fastForward(5000);

			await expect(page.locator('html')).toHaveClass(/matter-late/);
		});
	});
});

// Module scripts of Matter's blocks: blocked, they leave the page as the
// server rendered it with JavaScript still running (matter-js, no is-enhanced).
const BLOCK_SCRIPTS = /\/matter\/build\/.*\.js(\?|$)/;

/**
 * Nothing in these is hidden or inert by the server.
 *
 * @param {Object} page      Page.
 * @param {string} selectors Where to look.
 */
const expectNothingHidden = async (page, selectors) => {
	await expect(
		page.locator(`:is(${selectors}) :is([inert], [hidden])`)
	).toHaveCount(0);
	await expect(page.locator(`:is(${selectors})[inert]`)).toHaveCount(0);
};

test.describe('accordion, collapsible and tabs', () => {
	test.describe('without JavaScript', () => {
		test.use({ ...NO_JAVASCRIPT, viewport: VIEWPORTS.desktop });

		test('every answer can be read', async ({ page }) => {
			await page.goto(kitchenSink.link);

			await expect(page.getByText('First answer')).toBeVisible();
			await expect(page.getByText('Second answer')).toBeVisible();
			await expectNothingHidden(page, '#faq');
		});

		test('the headings are there, with no state to misreport', async ({
			page,
		}) => {
			await page.goto(kitchenSink.link);

			const toggles = page.locator(
				'#faq .wp-block-matter-accordion-item__toggle'
			);

			await expect(toggles).toHaveText([
				'First question',
				'Second question',
			]);
			// An answer that shows isn't "collapsed".
			await expect(toggles.first()).not.toHaveAttribute(
				'aria-expanded',
				/.*/
			);
		});

		test('the collapsible content can be read', async ({ page }) => {
			await page.goto(kitchenSink.link);

			await expect(page.getByText('The rest of it')).toBeVisible();
			await expectNothingHidden(page, '.wp-block-matter-collapsible');
		});

		test('every tab panel can be read, each under its name', async ({
			page,
		}) => {
			await page.goto(kitchenSink.link);

			await expect(page.getByText('Large')).toBeVisible();
			await expect(
				page.locator('#specs .wp-block-matter-tab__label')
			).toHaveText(['Size', 'Colour']);
			await expect(
				page.locator('#specs .wp-block-matter-tab__label').nth(1)
			).toBeVisible();
			// The tab list can't switch anything, so it isn't offered.
			await expect(page.getByRole('tablist')).toHaveCount(0);
			await expectNothingHidden(
				page,
				'#specs .wp-block-matter-tabs__panels'
			);
		});
	});

	test.describe('when the scripts do not start', () => {
		test.use({ viewport: VIEWPORTS.desktop });

		test('closed panels stay out of the way until the allowance has run out', async ({
			page,
		}) => {
			await page.route(BLOCK_SCRIPTS, (route) => route.abort());
			await page.clock.install();
			await page.goto(kitchenSink.link);

			// About to start: hidden, so nothing flashes open.
			await expect(page.locator('html')).toHaveClass(/matter-js/);
			await expect(page.getByText('Second answer')).toBeHidden();
			await expect(page.getByText('The rest of it')).toBeHidden();
			await expect(page.getByText('Large')).toBeVisible();
			await expect(page.getByText('Blue')).toBeHidden();

			// It never did: everything shows.
			await page.clock.fastForward(5000);
			await expect(page.getByText('Second answer')).toBeVisible();
			await expect(page.getByText('The rest of it')).toBeVisible();
			await expect(page.getByText('Large')).toBeVisible();
			await expect(
				page.locator('#specs .wp-block-matter-tab__label').nth(1)
			).toBeVisible();
		});
	});

	test.describe('with JavaScript', () => {
		test.use({ viewport: VIEWPORTS.desktop });

		test('a closed answer is hidden until found, and its button opens it', async ({
			page,
		}) => {
			await page.goto(kitchenSink.link);

			const panel = page
				.locator('#faq-2-panel, #faq [id$="-panel"]')
				.last();
			const button = page.getByRole('button', {
				name: 'Second question',
			});

			await expect(panel).toHaveAttribute('hidden', /until-found|^$/);
			await expect(page.getByText('Second answer')).toBeHidden();
			await expect(button).toHaveAttribute('aria-expanded', 'false');

			await button.click();
			await expect(page.getByText('Second answer')).toBeVisible();
			await expect(panel).not.toHaveAttribute('hidden', /.*/);
			await expect(button).toHaveAttribute('aria-expanded', 'true');

			await button.click();
			await expect(page.getByText('Second answer')).toBeHidden();
			await expect(button).toHaveAttribute('aria-expanded', 'false');
			await expect(panel).toHaveAttribute('hidden', /until-found|^$/);
		});

		test('in a browser that has no until-found, a plain hidden panel is still closed', async ({
			page,
		}) => {
			// Such a browser turns `hidden = 'until-found'` into a plain
			// `hidden` (every installed one knows it, so make it so).
			await page.goto(kitchenSink.link);

			const panel = page.locator('#faq [id$="-panel"]').last();
			const button = page.getByRole('button', {
				name: 'Second question',
			});

			await panel.evaluate((element) =>
				element.setAttribute('hidden', '')
			);
			await expect(page.getByText('Second answer')).toBeHidden();
			expect(
				await panel.evaluate(
					(element) => window.getComputedStyle(element).visibility
				)
			).toBe('hidden');

			await button.click();
			await expect(page.getByText('Second answer')).toBeVisible();
			await expect(panel).not.toHaveAttribute('hidden', /.*/);
		});

		test('a match found in a closed answer opens its item', async ({
			page,
		}) => {
			await page.goto(kitchenSink.link);

			// What a browser sends before it shows text it found in an
			// `until-found` panel (find in page, a text fragment).
			await page
				.locator('#faq [id$="-panel"]')
				.first()
				.evaluate((panel) =>
					panel.dispatchEvent(
						new Event('beforematch', { bubbles: true })
					)
				);

			await expect(
				page.getByRole('button', { name: 'First question' })
			).toHaveAttribute('aria-expanded', 'true');
			await expect(page.getByText('First answer')).toBeVisible();
		});

		test('a closed collapsible opens from its link, and from a match', async ({
			page,
		}) => {
			await page.goto(kitchenSink.link);

			const content = page.locator('#more');

			await expect(page.getByText('The rest of it')).toBeHidden();
			await expect(content).toHaveAttribute('hidden', /until-found|^$/);

			await page.getByRole('link', { name: 'Show more' }).click();
			await expect(page.getByText('The rest of it')).toBeVisible();
			await expect(content).not.toHaveAttribute('hidden', /.*/);

			await page.getByRole('link', { name: 'Show more' }).click();
			await expect(page.getByText('The rest of it')).toBeHidden();

			await content.evaluate((element) =>
				element.dispatchEvent(
					new Event('beforematch', { bubbles: true })
				)
			);
			await expect(page.getByText('The rest of it')).toBeVisible();
		});

		test('only the active tab shows, and tabs switch', async ({ page }) => {
			await page.goto(kitchenSink.link);

			await expect(page.getByText('Large')).toBeVisible();
			await expect(page.getByText('Blue')).toBeHidden();
			await expect(
				page.locator('#specs .wp-block-matter-tab__label').first()
			).toBeHidden();
			await expect(
				page.getByRole('tab', { name: 'Colour' })
			).toBeVisible();

			await page.getByRole('tab', { name: 'Colour' }).click();
			await expect(page.getByText('Blue')).toBeVisible();
			await expect(page.getByText('Large')).toBeHidden();
		});

		test('opening and closing an answer is animated', async ({ page }) => {
			// The test config prefers reduced motion; this checks the motion.
			await emulate(page, { reducedMotion: 'no-preference' });
			await page.goto(kitchenSink.link);

			const button = page.getByRole('button', { name: 'First question' });
			const panel = page.locator('#faq [id$="-panel"]').first();
			const height = () =>
				panel.evaluate((el) => el.getBoundingClientRect().height);

			await button.click();

			// Part way through: neither closed nor fully open.
			await page.waitForTimeout(120);
			const partway = await height();

			await expect.poll(height).toBeGreaterThan(partway - 1);
			const open = await height();

			expect(partway).toBeGreaterThan(0);
			expect(partway).toBeLessThanOrEqual(open);

			await button.click();
			await page.waitForTimeout(120);

			const closing = await height();

			// It's still taking up room part way through closing (the
			// `until-found` panel keeps its content until the rows collapse).
			expect(closing).toBeGreaterThan(0);
			expect(closing).toBeLessThan(open);
			await expect.poll(height).toBe(0);
		});
	});
});

test.describe('closed panels degrade @cross-browser', () => {
	test.use({ viewport: VIEWPORTS.desktop });

	// Firefox and Safari may not know `hidden="until-found"` yet: the panel
	// is then plain hidden, and still opens with its button.
	test('an answer is closed, and opens and closes with its button', async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);

		const button = page.getByRole('button', { name: 'Second question' });

		await expect(page.getByText('Second answer')).toBeHidden();
		await expect(button).toHaveAttribute('aria-expanded', 'false');
		// Not reachable by Tab while closed.
		await page.getByRole('button', { name: 'First question' }).focus();
		await page.keyboard.press('Tab');
		await expect(button).toBeFocused();
		await page.keyboard.press('Tab');
		await expect(button).not.toBeFocused();

		await button.click();
		await expect(page.getByText('Second answer')).toBeVisible();
		await button.click();
		await expect(page.getByText('Second answer')).toBeHidden();
	});

	test('a collapsible opens and closes with its link', async ({ page }) => {
		await page.goto(kitchenSink.link);

		await expect(page.getByText('The rest of it')).toBeHidden();
		await page.getByRole('link', { name: 'Show more' }).click();
		await expect(page.getByText('The rest of it')).toBeVisible();
		await page.getByRole('link', { name: 'Show more' }).click();
		await expect(page.getByText('The rest of it')).toBeHidden();
	});
});
