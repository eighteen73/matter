/**
 * Block editor: content integrity fixed before 1.0.
 */
const { test, expect } = require('@wordpress/e2e-test-utils-playwright');
const { createCategories, createPage, termsCarousel } = require('./fixtures');

const blocks = (page) =>
	page.evaluate(() =>
		window.wp.data
			.select('core/block-editor')
			.getBlocks()
			.map(({ name, attributes, innerBlocks }) => ({
				name,
				id: attributes.overlayId ?? attributes.anchor,
				slots: innerBlocks.map(
					(slot) =>
						`${slot.attributes.name}:${slot.innerBlocks.length}`
				),
			}))
	);

const editorState = (page) =>
	page.evaluate(() => ({
		dirty: window.wp.data.select('core/editor').isEditedPostDirty(),
		undo: window.wp.data.select('core/editor').hasEditorUndo(),
	}));

test.beforeAll(async ({ requestUtils }) => {
	await requestUtils.deleteAllPages();
});

test.describe('sections', () => {
	test('slots are matched by name: reordered, renamed and removed slots keep their content', async ({
		admin,
		page,
		requestUtils,
	}) => {
		// Saved with the slots out of order, `media` under its old name
		// (`image`, see the fixture's `previously`), and a slot that's no
		// longer declared.
		const saved = await createPage(
			requestUtils,
			'Slots',
			'<!-- wp:matter-test/section -->' +
				'<!-- wp:matter/slot {"name":"image"} --><!-- wp:image --><figure class="wp-block-image"><img src="https://example.com/a.jpg" alt=""/></figure><!-- /wp:image --><!-- /wp:matter/slot -->' +
				'<!-- wp:matter/slot {"name":"content"} --><!-- wp:paragraph --><p>Kept</p><!-- /wp:paragraph --><!-- /wp:matter/slot -->' +
				'<!-- wp:matter/slot {"name":"footer"} --><!-- wp:paragraph --><p>Orphaned</p><!-- /wp:paragraph --><!-- /wp:matter/slot -->' +
				'<!-- /wp:matter-test/section -->'
		);

		await admin.editPost(saved.id);
		await expect
			.poll(async () => (await blocks(page))[0]?.slots)
			.toEqual(['content:1', 'media:1', 'footer:1']);

		// The fix isn't an undo step; the orphaned slot says what happened.
		expect((await editorState(page)).undo).toBe(false);
		await expect(
			admin.page
				.frameLocator('iframe[name="editor-canvas"]')
				.getByText('This content is no longer shown on the site')
		).toBeVisible();
	});

	test('slots that already match leave the page unchanged', async ({
		admin,
		page,
		requestUtils,
	}) => {
		const saved = await createPage(
			requestUtils,
			'Matching',
			'<!-- wp:matter-test/section --><!-- wp:matter/slot {"name":"content"} --><!-- wp:paragraph --><p>A</p><!-- /wp:paragraph --><!-- /wp:matter/slot --><!-- wp:matter/slot {"name":"media"} --><!-- wp:image --><figure class="wp-block-image"><img src="https://example.com/a.jpg" alt=""/></figure><!-- /wp:image --><!-- /wp:matter/slot --><!-- /wp:matter-test/section -->'
		);

		await admin.editPost(saved.id);
		await expect
			.poll(async () => (await blocks(page))[0]?.slots)
			.toEqual(['content:1', 'media:1']);
		expect(await editorState(page)).toEqual({ dirty: false, undo: false });
	});

	test('a new section is filled from its templates, and one undo removes it', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await editor.insertBlock({ name: 'matter-test/section' });

		await expect
			.poll(async () => (await blocks(page))[0]?.slots)
			.toEqual(['content:2', 'media:1']);

		await page.evaluate(() =>
			window.wp.data.dispatch('core/editor').undo()
		);
		await expect.poll(async () => (await blocks(page)).length).toBe(0);
	});
});

test.describe('terms carousel', () => {
	test("previews each term's loop item, and opening it isn't an edit", async ({
		admin,
		page,
		requestUtils,
	}) => {
		const names = ['Matter Editor Boots', 'Matter Editor Hats'];
		const ids = await createCategories(requestUtils, names);
		const saved = await createPage(
			requestUtils,
			'Terms carousel preview',
			termsCarousel(ids, 'categories')
		);

		await admin.editPost(saved.id);

		const canvas = page.frameLocator('iframe[name="editor-canvas"]');
		const carousel = canvas.locator('.wp-block-matter-carousel.is-query');

		// One each: core keeps a hidden preview of the term being edited.
		for (const name of names) {
			await expect(
				carousel
					.locator('.wp-block-matter-loop-item')
					.filter({ hasText: name, visible: true })
			).toHaveCount(1);
		}

		expect(await editorState(page)).toEqual({ dirty: false, undo: false });

		// It's the "Terms carousel", which stands in for the plain Terms Query
		// in the post editor's inserter.
		expect(
			await page.evaluate(() => {
				const [query] = window.wp.data
					.select('core/block-editor')
					.getBlocks();
				const items = window.wp.data
					.select('core/block-editor')
					.getInserterItems()
					.filter(({ name }) => name === 'core/terms-query')
					.map(({ id }) => id);

				return {
					active: window.wp.data
						.select('core/blocks')
						.getActiveBlockVariation(query.name, query.attributes)
						?.name,
					items,
				};
			})
		).toEqual({
			active: 'matter/carousel-terms',
			items: ['core/terms-query/matter/carousel-terms'],
		});
	});
});

test.describe('overlay IDs', () => {
	test("setting one modal's ID never renames another", async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await editor.insertBlock({ name: 'matter/modal' });
		await editor.insertBlock({ name: 'matter/modal' });

		await page.evaluate(() => {
			const { getBlocks } = window.wp.data.select('core/block-editor');
			const { updateBlockAttributes } =
				window.wp.data.dispatch('core/block-editor');
			const [first, second] = getBlocks();

			updateBlockAttributes(second.clientId, { overlayId: 'offer' });
			// On the way to typing "offer-spring".
			updateBlockAttributes(first.clientId, { overlayId: 'offer' });
			updateBlockAttributes(first.clientId, {
				overlayId: 'offer-spring',
			});
		});

		await expect
			.poll(async () => (await blocks(page)).map(({ id }) => id))
			.toEqual(['offer-spring', 'offer']);
	});

	test('the ID field refuses an ID another block has', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await editor.insertBlock({
			name: 'matter/modal',
			attributes: { overlayId: 'taken' },
		});
		await editor.insertBlock({
			name: 'matter/modal',
			attributes: { overlayId: 'mine' },
		});
		await editor.openDocumentSettingsSidebar();

		const field = page.getByRole('textbox', { name: 'ID', exact: true });

		await field.fill('taken');
		await field.blur();

		await expect(
			page.getByText('Another block on this page uses this ID.')
		).toBeVisible();
		expect((await blocks(page)).map(({ id }) => id)).toEqual([
			'taken',
			'mine',
		]);
	});

	test('a new modal gets an ID without an undo step', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await editor.insertBlock({ name: 'matter/modal' });

		await expect
			.poll(async () => (await blocks(page))[0]?.id)
			.toMatch(/^modal-/);

		await page.evaluate(() =>
			window.wp.data.dispatch('core/editor').undo()
		);
		await expect.poll(async () => (await blocks(page)).length).toBe(0);
	});
});
