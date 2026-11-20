/**
 * The fixtures and helpers later specs build on: each one loads, and the
 * conditions it sets up are in force. Behaviour is tested in the specs that
 * use them.
 */
const { test, expect } = require('@wordpress/e2e-test-utils-playwright');
const {
	EDITOR,
	NO_JAVASCRIPT,
	VIEWPORTS,
	arabicInstalled,
	createArchiveEntries,
	createDuplicatesPage,
	createLargeSlotPage,
	createPage,
	createRtlPage,
	deleteArchiveEntries,
	emulate,
	fixture,
	resizeThrough,
	setSiteLanguage,
} = require('./fixtures');

let kitchenSink;

test.beforeAll(async ({ requestUtils }) => {
	await requestUtils.deleteAllPages();
	kitchenSink = await createPage(
		requestUtils,
		'Kitchen sink',
		'kitchen-sink.html'
	);
});

test.describe('no JavaScript', () => {
	test.use({ ...NO_JAVASCRIPT, storageState: { cookies: [], origins: [] } });

	test('a page loads without scripts running', async ({ page }) => {
		await page.goto(kitchenSink.link);

		await expect(
			page.getByRole('heading', { name: 'Kitchen sink' })
		).toBeVisible();
		expect(await page.evaluate(() => typeof window.matter)).toBe(
			'undefined'
		);
	});
});

test.describe('media and viewports', () => {
	test.use({ storageState: { cookies: [], origins: [] } });

	test('media features are emulated on a loaded page', async ({ page }) => {
		await page.goto(kitchenSink.link);

		const matches = (query) =>
			page.evaluate((q) => window.matchMedia(q).matches, query);

		await emulate(page, { reducedMotion: 'no-preference' });
		expect(await matches('(prefers-reduced-motion: reduce)')).toBe(false);
		await emulate(page, { reducedMotion: 'reduce' });
		expect(await matches('(prefers-reduced-motion: reduce)')).toBe(true);
		await emulate(page, { forcedColors: 'active' });
		expect(await matches('(forced-colors: active)')).toBe(true);
	});

	test('resizing steps through the viewports', async ({ page }) => {
		await page.goto(kitchenSink.link);

		const seen = [];

		await resizeThrough(
			page,
			[VIEWPORTS.mobile, VIEWPORTS.belowLg, VIEWPORTS.atLg],
			async () => seen.push(await page.evaluate(() => window.innerWidth))
		);
		expect(seen).toEqual([390, 1023, 1024]);
	});
});

test.describe('fixture pages', () => {
	test.use({ storageState: { cookies: [], origins: [] } });

	test('the right-to-left page has a right-to-left group', async ({
		page,
		requestUtils,
	}) => {
		const rtlPage = await createRtlPage(requestUtils);

		await page.goto(rtlPage.link);
		await expect(page.locator('.is-rtl-fixture')).toHaveAttribute(
			'dir',
			'rtl'
		);
		expect(
			await page.evaluate(
				() =>
					window.getComputedStyle(document.getElementById('specs'))
						.direction
			)
		).toBe('rtl');
	});

	test('the duplicates page renders its widgets twice', async ({
		page,
		requestUtils,
	}) => {
		const duplicates = await createDuplicatesPage(requestUtils);

		await page.goto(duplicates.link);
		await expect(
			page.getByRole('tablist', { name: 'Duplicated tabs' })
		).toHaveCount(2);
		await expect(page.locator('a[href="#dup-modal"]')).toHaveCount(2);
	});

	test('the large-slot page holds over 1 MB of slot content', async ({
		requestUtils,
	}) => {
		const large = await createLargeSlotPage(requestUtils);
		const saved = await requestUtils.rest({
			path: `/wp/v2/pages/${large.id}`,
			params: { context: 'edit' },
		});

		expect(saved.content.raw.length).toBeGreaterThan(1024 * 1024);
	});

	test('an archive entry exists for each target type', async ({
		requestUtils,
	}) => {
		const entries = await createArchiveEntries(requestUtils);

		expect(Object.keys(entries)).toEqual(
			expect.arrayContaining([
				'post_type:post',
				'taxonomy:category',
				'search',
				'404',
			])
		);

		const saved = await requestUtils.rest({
			path: `/wp/v2/matter_archive/${entries.search.id}`,
			params: { context: 'edit' },
		});

		expect(saved.meta._matter_archive_target).toBe('search');
		await deleteArchiveEntries(requestUtils);
	});

	test('a fixture file can be read', () => {
		expect(fixture('kitchen-sink.html')).toContain('wp:matter/tabs');
	});
});

test.describe('users and languages', () => {
	test('the Editor-role user exists and can log in', async ({
		browser,
		baseURL,
	}) => {
		const context = await browser.newContext({
			baseURL,
			storageState: { cookies: [], origins: [] },
		});
		const page = await context.newPage();

		await page.goto('/wp-login.php');
		await page.fill('#user_login', EDITOR.username);
		await page.fill('#user_pass', EDITOR.password);
		await page.click('#wp-submit');
		await expect(page).toHaveURL(/wp-admin/);
		await context.close();
	});

	test('the site can be switched to Arabic and back', async ({
		page,
		requestUtils,
	}) => {
		test.skip(!arabicInstalled(), 'The Arabic language pack is missing.');

		const restore = await setSiteLanguage(requestUtils, 'ar');

		try {
			await page.goto(kitchenSink.link);
			await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
			await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
		} finally {
			await restore();
		}
	});
});
