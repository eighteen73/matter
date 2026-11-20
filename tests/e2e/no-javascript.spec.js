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

test.describe('the gate follows the scripts, not the clock', () => {
	test.use({ viewport: VIEWPORTS.desktop });

	// A block the server rendered, as a client-side navigation or Live
	// results would put it in the page after the allowance has run out.
	const serverRendered = (page, selector) =>
		page.evaluate(
			async ([url, css]) => {
				const response = await fetch(url);
				const doc = new window.DOMParser().parseFromString(
					await response.text(),
					'text/html'
				);

				return doc
					.querySelector(css)
					.outerHTML.replace(/id="/g, 'id="late-');
			},
			[page.url(), selector]
		);

	test('a block inserted after the allowance does not show open before it starts', async ({
		page,
	}) => {
		await page.goto(kitchenSink.link);
		await expect(page.locator('html')).toHaveClass(
			/matter-ready-accordion/
		);
		// The allowance runs out (real time: a faked clock stalls hydration).
		await expect(page.locator('html')).toHaveClass(/matter-late/, {
			timeout: 8000,
		});

		const html = await serverRendered(page, '#faq');
		const visibility = await page.evaluate((markup) => {
			const holder = document.createElement('div');

			holder.innerHTML = markup;
			document.body.append(holder);

			// Before any script has had a chance to start the block.
			return window
				.getComputedStyle(
					holder.querySelector(
						'.wp-block-matter-accordion-item:not(.is-open) .wp-block-matter-accordion-item__panel'
					)
				)
				.getPropertyValue('visibility');
		}, html);

		expect(visibility).toBe('hidden');
	});

	test('a type whose script did not start shows its content after the allowance, whatever else runs', async ({
		page,
	}) => {
		await page.route(/\/build\/blocks\/accordion\/view\.js/, (route) =>
			route.abort()
		);
		await page.goto(kitchenSink.link);

		await expect(page.locator('html')).toHaveClass(/matter-ready-tabs/);
		await expect(page.getByText('Second answer')).toBeHidden();
		await expect(page.locator('html')).toHaveClass(/matter-late/, {
			timeout: 8000,
		});
		await expect(page.getByText('Second answer')).toBeVisible();
		// Tabs started: still tabs.
		await expect(page.getByText('Blue')).toBeHidden();
	});

	test('the allowance runs from a script that starts after the page is parsed', async ({
		page,
	}) => {
		await page.route(BLOCK_SCRIPTS, (route) => route.abort());
		// The inline script doesn't run with the page: it's run by hand after
		// the page has been parsed and has loaded (as a tag manager that adds
		// it late would).
		await page.route(kitchenSink.link, async (route) => {
			const response = await route.fetch();
			const body = (await response.text()).replace(
				/<script([^>]*id=["']matter-api["'])/,
				'<script type="text/plain"$1'
			);

			await route.fulfill({ response, body });
		});
		await page.clock.install();
		await page.goto(kitchenSink.link, { waitUntil: 'load' });
		await expect(page.locator('html')).not.toHaveClass(/matter-js/);
		await page.evaluate(() => {
			new Function(document.getElementById('matter-api').textContent)();
		});
		await expect(page.locator('html')).toHaveClass(/matter-js/);
		await expect(page.locator('html')).not.toHaveClass(/matter-late/);
		await page.clock.fastForward(5000);
		await expect(page.locator('html')).toHaveClass(/matter-late/);
		await expect(page.getByText('Second answer')).toBeVisible();
	});
});

// Blocks inside blocks: a block is hidden by its own state, not by an
// enhanced one around it.
const NESTED = `<!-- wp:matter/tabs {"anchor":"outer-tabs","label":"Outer"} -->
<!-- wp:matter/tab {"label":"Outer one"} -->
<!-- wp:matter/accordion {"anchor":"inner-faq"} -->
<!-- wp:matter/accordion-item {"title":"Inner question one","open":true} --><!-- wp:paragraph --><p>Inner answer one</p><!-- /wp:paragraph --><!-- /wp:matter/accordion-item -->
<!-- wp:matter/accordion-item {"title":"Inner question two"} --><!-- wp:paragraph --><p>Inner answer two</p><!-- /wp:paragraph --><!-- /wp:matter/accordion-item -->
<!-- /wp:matter/accordion -->
<!-- /wp:matter/tab -->
<!-- wp:matter/tab {"label":"Outer two"} --><!-- wp:paragraph --><p>Outer panel two</p><!-- /wp:paragraph --><!-- /wp:matter/tab -->
<!-- /wp:matter/tabs -->
<!-- wp:matter/accordion {"anchor":"outer-faq"} -->
<!-- wp:matter/accordion-item {"title":"Outer question","open":true} -->
<!-- wp:matter/tabs {"anchor":"inner-tabs","label":"Inner"} -->
<!-- wp:matter/tab {"label":"Inner one"} --><!-- wp:paragraph --><p>Inner panel one</p><!-- /wp:paragraph --><!-- /wp:matter/tab -->
<!-- wp:matter/tab {"label":"Inner two"} --><!-- wp:paragraph --><p>Inner panel two</p><!-- /wp:paragraph --><!-- /wp:matter/tab -->
<!-- /wp:matter/tabs -->
<!-- /wp:matter/accordion-item -->
<!-- /wp:matter/accordion -->`;

test.describe('nested blocks', () => {
	test.use({ viewport: VIEWPORTS.desktop });

	let nested;

	test.beforeAll(async ({ requestUtils }) => {
		nested = await createPage(requestUtils, 'Nested blocks', NESTED);
	});

	test('an accordion whose script did not start, in running tabs, stays readable', async ({
		page,
	}) => {
		await page.route(/\/build\/blocks\/accordion\/view\.js/, (route) =>
			route.abort()
		);
		await page.goto(nested.link);
		await expect(page.locator('#outer-tabs')).toHaveClass(/is-enhanced/);
		await expect(page.locator('html')).toHaveClass(/matter-late/, {
			timeout: 8000,
		});

		await expect(page.getByText('Inner answer one')).toBeVisible();
		await expect(page.getByText('Inner answer two')).toBeVisible();
	});

	test('tabs whose script did not start, in a running accordion, stay readable', async ({
		page,
	}) => {
		await page.route(/\/build\/blocks\/tabs\/view\.js/, (route) =>
			route.abort()
		);
		await page.goto(nested.link);
		await expect(page.locator('#outer-faq')).toHaveClass(/is-enhanced/);
		await expect(page.locator('html')).toHaveClass(/matter-late/, {
			timeout: 8000,
		});

		await expect(page.getByText('Inner panel one')).toBeVisible();
		await expect(page.getByText('Inner panel two')).toBeVisible();
		await expect(
			page.locator('#inner-tabs .wp-block-matter-tab__label').nth(1)
		).toBeVisible();
	});

	test('with the scripts running, each block works by itself', async ({
		page,
	}) => {
		await page.goto(nested.link);
		await expect(page.locator('#inner-faq')).toHaveClass(/is-enhanced/);

		// Inner accordion in a tab: its closed item is closed.
		await expect(page.getByText('Inner answer one')).toBeVisible();
		await expect(page.getByText('Inner answer two')).toBeHidden();
		// Inner tabs in an accordion item: only the active panel.
		await expect(page.getByText('Inner panel one')).toBeVisible();
		await expect(page.getByText('Inner panel two')).toBeHidden();
		// Only the outer tabs' panel is inactive.
		await expect(page.getByText('Outer panel two')).toBeHidden();
		await page.getByRole('tab', { name: 'Outer two' }).click();
		await expect(page.getByText('Outer panel two')).toBeVisible();
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

const BUTTON_TRIGGER =
	'<!-- wp:buttons --><div class="wp-block-buttons"><!-- wp:button --><div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Get the offer</a></div><!-- /wp:button --></div><!-- /wp:buttons -->';

let overlays;

test.describe('overlays', () => {
	test.beforeAll(async ({ requestUtils }) => {
		overlays = await createPage(
			requestUtils,
			'Overlays',
			`<!-- wp:matter/modal {"overlayId":"offer","label":"The offer"} --><!-- wp:matter/slot {"name":"trigger"} -->${BUTTON_TRIGGER}<!-- /wp:matter/slot --><!-- wp:matter/slot {"name":"content"} --><!-- wp:paragraph --><p>Offer details</p><!-- /wp:paragraph --><!-- /wp:matter/slot --><!-- /wp:matter/modal -->` +
				'<!-- wp:paragraph --><p>Page text after the offer</p><!-- /wp:paragraph -->'
		);
	});

	test.describe('without JavaScript', () => {
		test.use({ ...NO_JAVASCRIPT, viewport: VIEWPORTS.desktop });

		test('a trigger with no URL is a real link to the dialog', async ({
			page,
		}) => {
			await page.goto(overlays.link);

			const link = page.getByRole('link', { name: 'Get the offer' });

			await expect(link).toHaveAttribute('href', '#offer');
			await link.focus();
			await expect(link).toBeFocused();
			await expect(page.getByText('Offer details')).toBeHidden();
		});

		test('following it shows the dialog in the page, as content', async ({
			page,
		}) => {
			await page.goto(overlays.link);
			await page.getByRole('link', { name: 'Get the offer' }).click();

			await expect(page).toHaveURL(/#offer$/);
			await expect(page.getByText('Offer details')).toBeVisible();
			await expect(page.locator('#offer')).toBeInViewport();
			// In the flow of the page (not over it), with nothing that needs a script.
			expect(
				await page
					.locator('#offer')
					.evaluate(
						(dialog) => window.getComputedStyle(dialog).position
					)
			).toBe('static');
			await expect(
				page.locator('#offer .wp-block-matter-modal__close')
			).toBeHidden();
			await expect(
				page.getByText('Page text after the offer')
			).toBeVisible();
			await expectNothingHidden(page, '.wp-block-matter-modal-host');
		});

		test('a link to a dialog in a tab, an accordion and a collapsible shows it', async ({
			page,
		}) => {
			await page.goto(kitchenSink.link);

			for (const [link, text] of [
				['Open the modal in tab two', /Inside the tab.s modal/],
				[
					'Open the modal in the accordion',
					/Inside the accordion.s modal/,
				],
				[
					'Open the modal in the collapsible',
					/Inside the collapsible.s modal/,
				],
			]) {
				await expect(page.getByText(text)).toBeHidden();
				await page.getByRole('link', { name: link }).click();
				await expect(page.getByText(text)).toBeVisible();
			}
		});

		test('a drawer shows the same way', async ({ page }) => {
			await page.goto(kitchenSink.link);
			await expect(page.getByText('Drawer content')).toBeHidden();
			await page.getByRole('link', { name: 'Filters' }).click();

			await expect(page.getByText('Drawer content')).toBeVisible();
			expect(
				await page
					.locator('#filters')
					.evaluate(
						(dialog) => window.getComputedStyle(dialog).position
					)
			).toBe('static');
		});
	});

	test.describe('when the scripts do not start', () => {
		test.use({ viewport: VIEWPORTS.desktop });

		test('the link shows the dialog in the page', async ({ page }) => {
			await page.route(BLOCK_SCRIPTS, (route) => route.abort());
			await page.clock.install();
			await page.goto(overlays.link);
			await page.getByRole('link', { name: 'Get the offer' }).click();

			// About to start: the dialog stays closed rather than show in
			// the page and then move.
			await expect(page.getByText('Offer details')).toBeHidden();
			await page.clock.fastForward(5000);

			await expect(page.getByText('Offer details')).toBeVisible();
			await expect(page.locator('#offer')).not.toHaveAttribute(
				'open',
				''
			);
		});
	});

	test.describe('with JavaScript', () => {
		test.use({ viewport: VIEWPORTS.desktop });

		test('a link to the dialog opens it over the page, with no frame of it in the page first', async ({
			page,
		}) => {
			// Every frame, until the dialog is open: is it showing?
			await page.addInitScript(() => {
				window.frames = [];
				const watch = () => {
					const dialog = document.getElementById('offer');

					if (dialog && !dialog.open) {
						const style = window.getComputedStyle(dialog);

						window.frames.push(
							`${style.display} ${style.position}`
						);
					}

					if (!dialog?.open) {
						window.requestAnimationFrame(watch);
					}
				};

				window.requestAnimationFrame(watch);
			});
			// Slow, so hydration is a long way off.
			const client = await page.context().newCDPSession(page);

			await client.send('Emulation.setCPUThrottlingRate', { rate: 6 });
			await page.goto(`${overlays.link}#offer`);

			await expect(page.locator('#offer')).toHaveAttribute('open', '');
			expect(
				await page.evaluate(() => window.frames.length)
			).toBeGreaterThan(0);
			expect(
				(await page.evaluate(() => window.frames)).filter(
					(frame) => !frame.startsWith('none')
				)
			).toEqual([]);
			expect(
				await page
					.locator('#offer')
					.evaluate(
						(element) => window.getComputedStyle(element).position
					)
			).not.toBe('static');
		});

		test('the trigger opens the dialog over the page, and the address stays', async ({
			page,
		}) => {
			await page.goto(overlays.link);
			await page.getByRole('link', { name: 'Get the offer' }).click();

			const dialog = page.getByRole('dialog', { name: 'The offer' });

			await expect(dialog).toBeVisible();
			await expect(page.locator('#offer')).toHaveAttribute('open', '');
			expect(
				await page
					.locator('#offer')
					.evaluate(
						(element) => window.getComputedStyle(element).position
					)
			).not.toBe('static');
			expect(new URL(page.url()).hash).toBe('');

			await page.keyboard.press('Escape');
			await expect(dialog).toBeHidden();
		});
	});
});

/**
 * The names of the links reached by pressing Tab, from the top of the page,
 * and which of them were on screen when they had focus.
 *
 * @param {Object} page  Page.
 * @param {number} limit Tab presses.
 * @return {Promise<Object[]>} `{ name, visible }` for each stop that is a link.
 */
async function tabThroughLinks(page, limit = 30) {
	const stops = [];

	await page.locator('body').click({ position: { x: 1, y: 1 } });

	for (let i = 0; i < limit; i++) {
		await page.keyboard.press('Tab');
		stops.push(
			await page.evaluate(() => {
				// eslint-disable-next-line @wordpress/no-global-active-element -- The page's own focus, whatever has it.
				const el = document.activeElement;
				const box = el.getBoundingClientRect();

				return {
					tag: el.tagName,
					name: el.textContent.trim(),
					visible:
						box.width > 0 &&
						box.height > 0 &&
						window.getComputedStyle(el).visibility === 'visible',
					insideMenu: !!el.closest('.matter-menu'),
				};
			})
		);
	}

	return stops.filter((stop) => stop.tag === 'A' && stop.insideMenu);
}

test.describe('menus and the panel', () => {
	const MENU_LINKS = ['Services', 'Design', 'Contact'];

	for (const [name, viewport] of [
		['375 px', { width: 375, height: 800 }],
		['1280 px', VIEWPORTS.desktop],
	]) {
		test.describe(`without JavaScript at ${name}`, () => {
			test.use({ ...NO_JAVASCRIPT, viewport });

			test('every menu link is on screen, and nothing is inert', async ({
				page,
			}) => {
				await page.goto(kitchenSink.link);

				// The panel's menu is nested lists below `lg` (a drill-down),
				// and a dropdown at it, which opens on hover and focus.
				const panelLinks = page.locator(
					'#test-nav .matter-menu__link:visible'
				);

				await expect(panelLinks).toHaveText(
					viewport.width < 1024 ? MENU_LINKS : ['Services', 'Contact']
				);
				await expect(page.locator('#test-nav')).toBeVisible();
				await expect(
					page.locator('.matter-menu :is([inert], [hidden])')
				).toHaveCount(0);

				// Nothing that needs the script is offered.
				await expect(
					page.locator(
						'.matter-menu__toggle:visible, .matter-panel-toggle:visible'
					)
				).toHaveCount(0);
				await expect(
					page.locator(
						'.matter-panel__close:visible, .matter-panel__backdrop:visible'
					)
				).toHaveCount(0);
			});

			test('the panel is inline: nothing off screen, no scroll lock', async ({
				page,
			}) => {
				await page.goto(kitchenSink.link);

				const box = await page
					.locator('#test-nav .matter-panel__content')
					.evaluate((el) => {
						const style = window.getComputedStyle(el);
						const rect = el.getBoundingClientRect();

						return {
							position: style.position,
							translate: style.translate,
							visibility: style.visibility,
							left: rect.left,
							right: rect.right,
							width: window.innerWidth,
						};
					});

				expect(box.position).not.toBe('fixed');
				expect(box.translate).toBe('none');
				expect(box.visibility).toBe('visible');
				expect(box.left).toBeGreaterThanOrEqual(0);
				expect(box.right).toBeLessThanOrEqual(box.width);
			});

			test('the keyboard reaches every link, on screen', async ({
				page,
			}) => {
				await page.goto(kitchenSink.link);

				const stops = await tabThroughLinks(page);
				const names = new Set(stops.map((stop) => stop.name));

				for (const link of MENU_LINKS) {
					expect(names, `${link} was reached`).toContain(link);
				}

				// The submenu link in the hover menu is reached too, and
				// everything that has focus can be seen.
				expect(stops.filter((stop) => !stop.visible)).toEqual([]);
			});
		});
	}

	test.describe('without JavaScript, dropdowns', () => {
		test.use({ ...NO_JAVASCRIPT, viewport: VIEWPORTS.desktop });

		test('open on hover and when focus is inside, and never hide what has focus', async ({
			page,
		}) => {
			await page.goto(kitchenSink.link);

			const hover = page.locator('#hover-menu');
			const design = hover.getByRole('link', {
				name: 'Design',
				exact: true,
			});

			await expect(design).toBeHidden();
			await hover
				.getByRole('link', { name: 'Services', exact: true })
				.hover();
			await expect(design).toBeVisible();

			await page.mouse.move(0, 0);
			await expect(design).toBeHidden();

			// Focus on the parent opens it; Tab goes on into it, and the
			// submenu stays open while focus is in it.
			await hover
				.getByRole('link', { name: 'Services', exact: true })
				.focus();
			await expect(design).toBeVisible();
			await page.keyboard.press('Tab');
			await expect(design).toBeFocused();
			await expect(design).toBeVisible();

			// Tabbing on leaves it, and it closes.
			await page.keyboard.press('Tab');
			await expect(design).toBeHidden();
		});
	});

	test.describe('when the scripts do not start', () => {
		test.use({ viewport: { width: 375, height: 800 } });

		test('the panel stays off canvas until the allowance has run out, then is inline', async ({
			page,
		}) => {
			await page.route(BLOCK_SCRIPTS, (route) => route.abort());
			await page.clock.install();
			await page.goto(kitchenSink.link);

			// About to start: as an enhanced page first paints it, so
			// nothing flashes.
			await expect(page.locator('html')).toHaveClass(/matter-js/);
			await expect(page.locator('.matter-panel-toggle')).toBeVisible();
			await expect(
				page.locator('#test-nav .matter-panel__content')
			).toBeHidden();

			await page.clock.fastForward(5000);
			await expect(
				page.locator('#test-nav .matter-panel__content')
			).toBeVisible();
			await expect(page.locator('.matter-panel-toggle')).toBeHidden();
			await expect(
				page.locator('#test-nav .matter-menu__link:visible')
			).toHaveText(MENU_LINKS);
		});
	});

	test.describe('with JavaScript', () => {
		test.describe('at 375 px', () => {
			test.use({ viewport: { width: 375, height: 800 } });

			test('the panel is off canvas, and opens with its toggle', async ({
				page,
			}) => {
				await page.goto(kitchenSink.link);

				await expect(page.locator('#test-nav')).toHaveClass(
					/is-enhanced/
				);
				await expect(
					page.locator('#test-nav .matter-panel__content')
				).toBeHidden();

				const toggle = page.getByRole('button', {
					name: 'Menu',
					exact: true,
				});

				await toggle.click();
				await expect(
					page.getByRole('dialog', { name: 'Menu' })
				).toBeVisible();
				await expect(
					page.locator('#test-nav .matter-menu__toggle').first()
				).toBeVisible();
				// Parent links are replaced by their toggles.
				await expect(
					page.locator('#test-nav .has-submenu > .matter-menu__link')
				).toBeHidden();
			});
		});

		test.describe('at 1280 px', () => {
			test.use({ viewport: VIEWPORTS.desktop });

			test('closed submenus are inert, and open ones are not', async ({
				page,
			}) => {
				await page.goto(kitchenSink.link);

				const submenu = page.locator(
					'#hover-menu .matter-menu__submenu'
				);
				const toggle = page.locator('#hover-menu .matter-menu__toggle');

				await expect(submenu).toHaveAttribute('inert', '');
				await toggle.click();
				await expect(submenu).not.toHaveAttribute('inert', '');
				await expect(
					submenu.getByRole('link', { name: 'Design' })
				).toBeVisible();
			});

			test('a submenu does not open on focus alone', async ({ page }) => {
				await page.goto(kitchenSink.link);
				await page
					.locator('#hover-menu')
					.getByRole('link', { name: 'Services', exact: true })
					.focus();

				// The script opens it with the toggle, not by CSS.
				await expect(
					page
						.locator('#hover-menu')
						.getByRole('link', { name: 'Design' })
				).toBeHidden();
			});
		});
	});
});
