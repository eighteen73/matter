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
