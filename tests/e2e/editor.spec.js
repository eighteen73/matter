/**
 * Block editor: content integrity fixed before 1.0.
 */
const { test, expect } = require('@wordpress/e2e-test-utils-playwright');
const {
	createArchiveEntry,
	createCategories,
	createPage,
	createPosts,
	deleteArchiveEntries,
	termsCarousel,
} = require('./fixtures');

const blocks = (page) =>
	page.evaluate(() =>
		window.wp.data
			.select('core/block-editor')
			.getBlocks()
			.map(({ name, attributes, innerBlocks }) => ({
				name,
				id:
					attributes.overlayId ??
					attributes.matterId ??
					attributes.anchor,
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

test.describe('section markup in the editor', () => {
	test("the inner wrapper isn't positioned, and an empty slot is marked", async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await editor.insertBlock({ name: 'matter-test/section' });

		const inner = editor.canvas.locator(
			'.wp-block-matter-test-section__inner'
		);
		const content = editor.canvas.locator(
			'.wp-block-matter-test-section__content'
		);

		await expect(inner).toHaveCSS('position', 'static');
		await expect(content).not.toHaveClass(/(^|\s)is-empty(\s|$)/);

		await page.evaluate(() => {
			const { select, dispatch } = window.wp.data;
			const [section] = select('core/block-editor').getBlocks();
			const slot = section.innerBlocks.find(
				(block) => block.attributes.name === 'content'
			);

			dispatch('core/block-editor').replaceInnerBlocks(slot.clientId, []);
		});

		await expect(content).toHaveClass(/(^|\s)is-empty(\s|$)/);
	});

	test('the list view names a section after its first heading', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await editor.insertBlock({ name: 'matter-test/section' });
		await editor.canvas
			.getByRole('document', { name: 'Block: Heading' })
			.fill('Our workshop');

		await page.getByRole('button', { name: 'Document Overview' }).click();
		const list = page.getByRole('treegrid', {
			name: 'Block navigation structure',
		});

		await expect(
			list.getByRole('link', { name: 'Test section: Our workshop' })
		).toBeVisible();

		// A name the client gives it wins.
		await page.evaluate(() => {
			const { select, dispatch } = window.wp.data;
			const [section] = select('core/block-editor').getBlocks();

			dispatch('core/block-editor').updateBlockAttributes(
				section.clientId,
				{
					metadata: { name: 'Workshop intro' },
				}
			);
		});
		await expect(
			list.getByRole('link', { name: 'Workshop intro' })
		).toBeVisible();
	});

	test('the list view names a section by its heading as plain, short text', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await editor.insertBlock({ name: 'matter-test/section' });
		await page.evaluate(() => {
			const { select, dispatch } = window.wp.data;
			const store = select('core/block-editor');
			const [section] = store.getBlocks();
			const heading = section.innerBlocks
				.find((slot) => slot.attributes.name === 'content')
				.innerBlocks.find((block) => block.name === 'core/heading');

			dispatch('core/block-editor').updateBlockAttributes(
				heading.clientId,
				{
					content:
						'Our <strong>workshop</strong> &amp; its very long story that goes on and on',
				}
			);
		});

		await page.getByRole('button', { name: 'Document Overview' }).click();

		const link = page
			.getByRole('treegrid', { name: 'Block navigation structure' })
			.getByRole('link', { name: /^Test section: / });
		const label = await link.innerText();

		expect(label).toContain('Test section: Our workshop & its very long');
		expect(label).not.toMatch(/[<>]|&amp;/);
		expect(label.length).toBeLessThan(70);
	});

	test("a locked slot's blocks can't be removed, but keep their settings", async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await editor.insertBlock({ name: 'matter-test/section' });

		const image = await page.evaluate(() => {
			const { select, dispatch } = window.wp.data;
			const store = select('core/block-editor');
			const slot = store
				.getBlocks()[0]
				.innerBlocks.find((block) => block.attributes.name === 'media');
			const { clientId } = slot.innerBlocks[0];

			dispatch('core/block-editor').selectBlock(clientId);

			return {
				mode: store.getBlockEditingMode(clientId),
				removable: store.canRemoveBlock(clientId),
			};
		});

		expect(image).toEqual({ mode: 'default', removable: false });
		await expect(
			page.getByRole('button', { name: 'Edit pattern' })
		).toHaveCount(0);
	});
});

test.describe('allowed blocks when every block is allowed', () => {
	test('a block registered only in JavaScript stays insertable, and the Archive list only in an archive entry', async ({
		admin,
		page,
		requestUtils,
	}) => {
		const probe = () =>
			page.evaluate(() => {
				const { blocks: wpBlocks, data } = window.wp;

				if (!wpBlocks.getBlockType('matter-test/js-only')) {
					wpBlocks.registerBlockType('matter-test/js-only', {
						title: 'JS only',
						category: 'text',
						edit: () => null,
						save: () => null,
					});
				}

				const { canInsertBlockType } = data.select('core/block-editor');

				return {
					settings: data.select('core/block-editor').getSettings()
						.allowedBlockTypes,
					jsOnly: canInsertBlockType('matter-test/js-only'),
					loop: canInsertBlockType('matter/archive-loop'),
				};
			});

		await admin.createNewPost();
		expect(await probe()).toEqual({
			settings: true,
			jsOnly: true,
			loop: false,
		});

		const entry = await createArchiveEntry(requestUtils, 'search', {
			content: '<!-- wp:paragraph --><p>Entry</p><!-- /wp:paragraph -->',
		});

		await page.goto(`/wp-admin/post.php?post=${entry.id}&action=edit`);
		await page.waitForFunction(() =>
			window.wp?.data?.select('core/editor')?.getCurrentPostId()
		);
		expect(await probe()).toEqual({
			settings: true,
			jsOnly: true,
			loop: true,
		});

		await deleteArchiveEntries(requestUtils);
	});
});

test.describe('a locked slot whose template changes', () => {
	test.afterEach(async ({ requestUtils }) => {
		await requestUtils.updateSiteSettings({
			matter_test_media_video: false,
			matter_test_media_gain: false,
		});
	});

	test('a block the theme adds to its template is added, and the saved ones are kept', async ({
		admin,
		page,
		requestUtils,
	}) => {
		const saved = await createPage(
			requestUtils,
			'Template gain',
			'<!-- wp:matter-test/section --><!-- wp:matter/slot {"name":"content"} --><!-- wp:paragraph --><p>A</p><!-- /wp:paragraph --><!-- /wp:matter/slot --><!-- wp:matter/slot {"name":"media"} --><!-- wp:image {"alt":"Saved"} --><figure class="wp-block-image"><img src="https://example.com/a.jpg" alt="Saved"/></figure><!-- /wp:image --><!-- /wp:matter/slot --><!-- /wp:matter-test/section -->'
		);

		await requestUtils.updateSiteSettings({ matter_test_media_gain: true });
		await admin.editPost(saved.id);
		await expect
			.poll(() =>
				page.evaluate(() =>
					window.wp.data
						.select('core/block-editor')
						.getBlocks()[0]
						.innerBlocks.find(
							(slot) => slot.attributes.name === 'media'
						)
						.innerBlocks.map(
							(block) => `${block.name}:${block.attributes.alt}`
						)
				)
			)
			.toEqual(['core/image:Saved', 'core/image:']);
		await requestUtils.updateSiteSettings({
			matter_test_media_gain: false,
		});
	});

	test('keeps the blocks saved in it, through a reload and an edit', async ({
		admin,
		page,
		requestUtils,
	}) => {
		const saved = await createPage(
			requestUtils,
			'Template switch',
			'<!-- wp:matter-test/section --><!-- wp:matter/slot {"name":"content"} --><!-- wp:paragraph --><p>A</p><!-- /wp:paragraph --><!-- /wp:matter/slot --><!-- wp:matter/slot {"name":"media"} --><!-- wp:image {"alt":"Saved"} --><figure class="wp-block-image"><img src="https://example.com/a.jpg" alt="Saved"/></figure><!-- /wp:image --><!-- /wp:matter/slot --><!-- /wp:matter-test/section -->'
		);
		const media = () =>
			page.evaluate(() =>
				window.wp.data
					.select('core/block-editor')
					.getBlocks()[0]
					.innerBlocks.find(
						(slot) => slot.attributes.name === 'media'
					)
					.innerBlocks.map((block) => block.name)
			);

		// The theme's template for the slot is now a video, not an image.
		await requestUtils.updateSiteSettings({
			matter_test_media_video: true,
		});
		await admin.editPost(saved.id);
		await expect.poll(media).toEqual(['core/image']);

		// An edit, a save and a reload.
		await page.evaluate(() => {
			const { select, dispatch } = window.wp.data;
			const image = select('core/block-editor')
				.getBlocks()[0]
				.innerBlocks.find((slot) => slot.attributes.name === 'media')
				.innerBlocks[0];

			dispatch('core/block-editor').updateBlockAttributes(
				image.clientId,
				{ alt: 'Edited' }
			);
		});
		await page.evaluate(() =>
			window.wp.data.dispatch('core/editor').savePost()
		);
		await expect
			.poll(() =>
				page.evaluate(() =>
					window.wp.data.select('core/editor').isSavingPost()
				)
			)
			.toBe(false);
		await page.reload();
		await expect.poll(media).toEqual(['core/image']);
		expect(
			await page.evaluate(
				() =>
					window.wp.data
						.select('core/block-editor')
						.getBlocks()[0]
						.innerBlocks.find(
							(slot) => slot.attributes.name === 'media'
						).innerBlocks[0].attributes.alt
			)
		).toBe('Edited');

		// A new section still starts from the template.
		await admin.createNewPost();
		await page.evaluate(() =>
			window.wp.data
				.dispatch('core/block-editor')
				.insertBlock(
					window.wp.blocks.createBlock('matter-test/section')
				)
		);
		await expect
			.poll(() =>
				page.evaluate(() =>
					window.wp.data
						.select('core/block-editor')
						.getBlocks()[0]
						.innerBlocks.find(
							(slot) => slot.attributes.name === 'media'
						)
						.innerBlocks.map((block) => block.name)
				)
			)
			.toEqual(['core/video']);
	});
});

test.describe('slot-only blocks', () => {
	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.updateSiteSettings({
			matter_test_allowed_blocks: true,
		});
	});

	test.afterAll(async ({ requestUtils }) => {
		await requestUtils.updateSiteSettings({
			matter_test_allowed_blocks: false,
		});
	});

	test("a block only a slot allows is offered in that slot, not at the page's top level", async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await editor.insertBlock({ name: 'matter-test/section' });

		const [atRoot, inSlot, inOtherSlot] = await page.evaluate(() => {
			const { select } = window.wp.data;
			const { canInsertBlockType, getBlocks } =
				select('core/block-editor');
			const [section] = getBlocks();
			const slot = (name) =>
				section.innerBlocks.find(
					(block) => block.attributes.name === name
				).clientId;

			return [
				canInsertBlockType('core/verse'),
				canInsertBlockType('core/verse', slot('content')),
				canInsertBlockType('core/verse', slot('media')),
			];
		});

		expect([atRoot, inSlot, inOtherSlot]).toEqual([false, true, false]);
	});
});

test.describe('section variants', () => {
	test("a section in its default variant has the variant's class; a chosen one replaces it", async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await page.evaluate(() =>
			['default', 'wide'].forEach((name) =>
				window.wp.blocks.registerBlockStyle('matter-test/section', {
					name,
					label: name,
					isDefault: name === 'default',
				})
			)
		);
		await editor.insertBlock({ name: 'matter-test/section' });

		const section = editor.canvas.locator('.wp-block-matter-test-section');

		await expect(section).toHaveClass(/(^|\s)is-style-default(\s|$)/);

		await page.evaluate(() => {
			const { select, dispatch } = window.wp.data;
			const [block] = select('core/block-editor').getBlocks();

			dispatch('core/block-editor').updateBlockAttributes(
				block.clientId,
				{ className: 'is-style-wide' }
			);
		});

		await expect(section).toHaveClass(/(^|\s)is-style-wide(\s|$)/);
		await expect(section).not.toHaveClass(/is-style-default/);

		// Only shown, not saved.
		expect(await editor.getEditedPostContent()).not.toContain(
			'is-style-default'
		);
	});

	test('a removed scheme or variant looks the same in the editor as on the site', async ({
		admin,
		page,
		requestUtils,
	}) => {
		// Saved with a scheme and a variant the theme doesn't have (any more).
		const saved = await createPage(
			requestUtils,
			'Removed scheme',
			'<!-- wp:matter-test/section {"scheme":"removed-scheme","className":"is-style-removed-variant"} -->' +
				'<!-- wp:matter/slot {"name":"content"} --><!-- wp:paragraph --><p>Hello</p><!-- /wp:paragraph --><!-- /wp:matter/slot -->' +
				'<!-- /wp:matter-test/section -->'
		);

		await admin.editPost(saved.id);
		await page.evaluate(() =>
			['default', 'wide'].forEach((name) =>
				window.wp.blocks.registerBlockStyle('matter-test/section', {
					name,
					label: name,
					isDefault: name === 'default',
				})
			)
		);

		const section = page
			.frameLocator('[name="editor-canvas"]')
			.locator('.wp-block-matter-test-section');

		await expect(section).toHaveClass(/(^|\s)is-style-default(\s|$)/);
		await expect(section).toHaveClass(/is-style-removed-variant/);
		await expect(section).not.toHaveClass(/has-scheme/);

		const editorClasses = await section.evaluate((element) => [
			...element.classList,
		]);

		// The front end: no scheme class either. (The fixture theme has no
		// `default` variant, so only the scheme is compared.)
		await page.goto(saved.link);

		const front = await page
			.locator('.wp-block-matter-test-section')
			.evaluate((element) => [...element.classList]);

		expect(front.some((name) => name.startsWith('has-scheme'))).toBe(false);
		expect(
			editorClasses.some((name) => name.startsWith('has-scheme'))
		).toBe(false);
	});
});

test.describe('slot labels', () => {
	test('the list view names a slot from its name, in sentence case', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await editor.insertBlock({ name: 'matter-test/section' });

		const labels = await page.evaluate(() => {
			const type = window.wp.blocks.getBlockType('matter/slot');

			return ['content', 'media-end', 'side_note', ''].map((name) =>
				window.wp.blocks.__experimentalGetBlockLabel(type, { name })
			);
		});

		expect(labels).toEqual(['Content', 'Media end', 'Side note', 'Slot']);

		// The slots are created after the section is inserted, by the
		// reconcile effect: wait for them before selecting one.
		await expect
			.poll(() =>
				page.evaluate(
					() =>
						window.wp.data
							.select('core/block-editor')
							.getBlocks()[0]?.innerBlocks.length
				)
			)
			.toBeGreaterThan(0);

		// The breadcrumbs use the same label as the list view.
		await page.evaluate(() => {
			const { select, dispatch } = window.wp.data;
			const [section] = select('core/block-editor').getBlocks();

			dispatch('core/block-editor').selectBlock(
				section.innerBlocks[0].clientId
			);
		});

		await expect(
			page.getByRole('list', { name: 'Block breadcrumb' })
		).toContainText('Content');
	});
});

test.describe('slot alignments', () => {
	test("a block in a slot offers the slot's alignments", async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await editor.insertBlock({ name: 'matter-test/section' });

		const imageId = await page.evaluate(() => {
			const { createBlock } = window.wp.blocks;
			const { select, dispatch } = window.wp.data;
			const editorStore = select('core/block-editor');
			const [section] = editorStore.getBlocks();
			const content = section.innerBlocks.find(
				(slot) => slot.attributes.name === 'content'
			);
			const image = createBlock('core/image', {
				url: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
				alt: 'Aligned',
			});

			dispatch('core/block-editor').insertBlock(
				image,
				undefined,
				content.clientId
			);

			return image.clientId;
		});

		await page.evaluate(
			(id) =>
				window.wp.data.dispatch('core/block-editor').selectBlock(id),
			imageId
		);
		await page
			.getByRole('toolbar', { name: 'Block tools' })
			.getByRole('button', { name: 'Align' })
			.click();

		const options = page.getByRole('menuitemradio');

		await expect(options).toHaveText([/None/, /Wide width/, /Full width/]);
	});

	test('carousels, galleries, tabs and accordions can be wide or full', async ({
		admin,
		page,
	}) => {
		await admin.createNewPost();

		const supports = await page.evaluate(() =>
			[
				'matter/carousel',
				'matter/gallery',
				'matter/tabs',
				'matter/accordion',
			].map((name) => window.wp.blocks.getBlockSupport(name, 'align'))
		);

		expect(supports).toEqual(Array(4).fill(['wide', 'full']));
	});
});

test.describe('posts displays', () => {
	test('searching "faq" or a post type finds Posts accordion, which lists up to 100', async ({
		admin,
		page,
	}) => {
		await admin.createNewPost();
		await page
			.getByRole('button', { name: 'Block Inserter', exact: true })
			.click();

		const search = page.getByRole('searchbox', { name: 'Search' });
		const result = page.getByRole('option', { name: 'Posts accordion' });

		for (const term of ['faq', 'pages']) {
			await search.fill(term);
			await expect(result).toBeVisible();
		}

		await result.click();
		await expect
			.poll(() =>
				page.evaluate(
					() =>
						window.wp.data
							.select('core/block-editor')
							.getBlocks()[0]?.attributes.query.perPage
				)
			)
			.toBe(100);
	});

	test('a new posts display asks what it lists first', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await page
			.getByRole('button', { name: 'Block Inserter', exact: true })
			.click();
		await page
			.getByRole('searchbox', { name: 'Search' })
			.fill('Posts accordion');
		await page.getByRole('option', { name: 'Posts accordion' }).click();

		await expect(
			editor.canvas.getByText('What will it list?')
		).toBeVisible();
		await editor.canvas.getByRole('button', { name: 'Pages' }).click();

		await expect
			.poll(() =>
				page.evaluate(
					() =>
						window.wp.data
							.select('core/block-editor')
							.getBlocks()[0]?.attributes.query.postType
				)
			)
			.toBe('page');
		await expect(editor.canvas.getByText('What will it list?')).toHaveCount(
			0
		);
	});
});

test.describe('carousel picker', () => {
	test('choosing posts keeps the variant the carousel already has', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await editor.insertBlock({
			name: 'matter/carousel',
			attributes: { className: 'is-style-slides' },
		});

		await editor.canvas
			.locator('.block-editor-block-variation-picker')
			.getByRole('button', { name: 'One slide per post.' })
			.click();

		await expect
			.poll(() =>
				page.evaluate(() => {
					const [block] = window.wp.data
						.select('core/block-editor')
						.getBlocks();

					return [block.name, block.attributes.matterDisplay?.style];
				})
			)
			.toEqual(['core/query', 'slides']);
	});

	test("an autoplaying carousel's play button shows as on the site, not disabled", async ({
		admin,
		editor,
	}) => {
		await admin.createNewPost();
		await editor.insertBlock({
			name: 'matter/carousel',
			attributes: { className: 'is-style-slides' },
			innerBlocks: [
				{ name: 'core/paragraph', attributes: { content: 'One' } },
				{ name: 'core/paragraph', attributes: { content: 'Two' } },
			],
		});

		const play = editor.canvas.locator('.wp-block-matter-carousel__play');

		await expect(play).toHaveAttribute('aria-hidden', 'true');
		await expect(play).toHaveAttribute('tabindex', '-1');
		await expect(play).not.toHaveAttribute('disabled');
	});
});

test.describe('carousel slide types', () => {
	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.updateSiteSettings({
			matter_test_scoped_slides: true,
		});
	});

	test.afterAll(async ({ requestUtils }) => {
		await requestUtils.updateSiteSettings({
			matter_test_scoped_slides: false,
		});
	});

	test('a slide type limited to a section is only offered in carousels inside it', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await editor.insertBlock({ name: 'matter-test/section' });

		// One carousel in the section's content slot, one outside it.
		await page.evaluate(() => {
			const { createBlock } = window.wp.blocks;
			const { select, dispatch } = window.wp.data;
			const [section] = select('core/block-editor').getBlocks();
			const content = section.innerBlocks.find(
				(slot) => slot.attributes.name === 'content'
			);

			dispatch('core/block-editor').insertBlock(
				createBlock('matter/carousel'),
				undefined,
				content.clientId
			);
			dispatch('core/block-editor').insertBlock(
				createBlock('matter/carousel')
			);
		});

		const pickers = editor.canvas.locator(
			'.wp-block-matter-carousel .block-editor-block-variation-picker'
		);

		await expect(pickers).toHaveCount(2);
		await expect(pickers.first()).toContainText('Notes');
		await expect(pickers.last()).not.toContainText('Notes');

		// Slides allowed, in carousels that have a slide (an empty one shows
		// the picker, and its slides' rules apply once it has slides).
		await page.evaluate(() => {
			const { createBlock } = window.wp.blocks;
			const { select, dispatch } = window.wp.data;
			const [section] = select('core/block-editor').getBlocks();
			const content = section.innerBlocks.find(
				(slot) => slot.attributes.name === 'content'
			);
			const carousel = () =>
				createBlock('matter/carousel', { className: 'has-slide' }, [
					createBlock('core/image', {
						url: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
						alt: 'Slide',
					}),
				]);

			dispatch('core/block-editor').insertBlock(
				carousel(),
				undefined,
				content.clientId
			);
			dispatch('core/block-editor').insertBlock(carousel());
		});

		const allowed = () =>
			page.evaluate(() => {
				const editorStore = window.wp.data.select('core/block-editor');

				return editorStore
					.getClientIdsWithDescendants()
					.filter(
						(id) =>
							editorStore.getBlockAttributes(id)?.className ===
							'has-slide'
					)
					.map((id) => [
						editorStore.canInsertBlockType('core/paragraph', id),
						editorStore.canInsertBlockType('core/image', id),
					]);
			});

		await expect.poll(allowed).toEqual([
			[true, true],
			[false, true],
		]);
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

	test('a copy pasted above the original gets a new ID; the original keeps its own', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await editor.insertBlock({
			name: 'matter/modal',
			attributes: { overlayId: 'offer' },
		});

		// As a paste above it does: a copy, inserted first.
		await page.evaluate(() => {
			const [original] = window.wp.data
				.select('core/block-editor')
				.getBlocks();

			window.wp.data
				.dispatch('core/block-editor')
				.insertBlocks([window.wp.blocks.cloneBlock(original)], 0);
		});

		await expect
			.poll(async () => (await blocks(page)).map(({ id }) => id))
			.toEqual([expect.stringMatching(/^modal-/), 'offer']);
	});

	test("a tabs block's own ID leaves its HTML anchor to the client", async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await editor.insertBlock({ name: 'matter/tabs' });

		const ids = () =>
			page.evaluate(() => {
				const { attributes } = window.wp.data
					.select('core/block-editor')
					.getBlocks()[0];

				return [attributes.matterId ?? '', attributes.anchor ?? ''];
			});
		const anchor = async () => (await ids())[1];

		await expect.poll(ids).toEqual([expect.stringMatching(/^tabs-/), '']);

		for (const value of ['f', 'faq', '']) {
			await page.evaluate((next) => {
				const [tabs] = window.wp.data
					.select('core/block-editor')
					.getBlocks();

				window.wp.data
					.dispatch('core/block-editor')
					.updateBlockAttributes(tabs.clientId, { anchor: next });
			}, value);
			await expect.poll(anchor).toBe(value);
		}
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

test.describe('site details', () => {
	test('a web address typed without https:// is accepted and completed', async ({
		admin,
		page,
	}) => {
		await admin.visitAdminPage('admin.php', 'page=matter-settings');

		const field = page.getByRole('textbox', { name: 'Instagram' });

		await field.fill('instagram.com/shop');
		await field.blur();
		await expect(field).toHaveValue('https://instagram.com/shop');

		await page.getByRole('button', { name: 'Save settings' }).click();
		await expect(
			page.getByText('Settings saved.', { exact: true }).first()
		).toBeVisible();

		await page.reload();
		await expect(
			page.getByRole('textbox', { name: 'Instagram' })
		).toHaveValue('https://instagram.com/shop');
	});
});

test.describe('site details numbers', () => {
	test('a number too large to store is refused, shown on the page, and nothing breaks', async ({
		admin,
		page,
	}) => {
		await admin.visitAdminPage('admin.php', 'page=matter-settings');

		const seats = page.getByRole('spinbutton', { name: 'Seats' });
		const good = String(10 + (Date.now() % 80));

		await seats.fill(good);
		await page.getByRole('button', { name: 'Save settings' }).click();
		await expect(
			page.getByText('Settings saved.', { exact: true }).first()
		).toBeVisible();

		// `1e999` is valid JSON and decodes to infinity, which can't be stored
		// (the page's own JSON would fail). The route refuses it.
		const refused = await page.evaluate(async () => {
			try {
				await window.wp.apiFetch({
					path: '/matter/v1/settings',
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: '{"values":{"social":{"seats":1e999}}}',
				});
				return 'saved';
			} catch (error) {
				return error.message;
			}
		});

		expect(refused).toBe('“Seats” needs a number that isn’t too large.');

		// The page shows what the route says, and stays until the next save.
		await page.route(/matter(\/|%2F)v1(\/|%2F)settings/, (route) =>
			route.request().method() === 'POST'
				? route.fulfill({
						status: 400,
						contentType: 'application/json',
						body: JSON.stringify({
							code: 'matter_settings_invalid_number',
							message:
								'“Seats” needs a number that isn’t too large.',
						}),
					})
				: route.continue()
		);
		await seats.fill(String(Number(good) + 1));
		await page.getByRole('button', { name: 'Save settings' }).click();
		await expect(page.locator('.components-notice.is-error')).toContainText(
			'“Seats” needs a number that isn’t too large.'
		);
		await page.unroute(/matter(\/|%2F)v1(\/|%2F)settings/);

		// Nothing was stored: the page loads, with the last good value.
		await page.reload();
		await expect(
			page.getByRole('spinbutton', { name: 'Seats' })
		).toHaveValue(good);
	});
});

test.describe('archive entries', () => {
	test('customising an archive saves nothing until saved, and its bound text says where it comes from', async ({
		page,
		requestUtils,
	}) => {
		const [id] = await createCategories(requestUtils, ['Journal']);

		await requestUtils.rest({
			path: `/wp/v2/categories/${id}`,
			method: 'POST',
			data: { description: 'Notes from the workshop.' },
		});

		const archiveLink = page.locator('#wp-admin-bar-matter-archive > a');

		await page.goto(`/?cat=${id}`);
		await expect(archiveLink).toHaveText('Customise archive');
		await archiveLink.click();
		await page.waitForFunction(() =>
			window.wp?.data?.select('core/editor')?.getCurrentPostId()
		);

		expect(
			await page.evaluate(
				() =>
					window.wp.data.select('core/editor').getCurrentPost().status
			)
		).toBe('auto-draft');

		await page.evaluate(() => {
			const block = window.wp.blocks.createBlock('core/paragraph', {
				metadata: {
					bindings: {
						content: {
							source: 'matter/archive',
							args: { key: 'description' },
						},
					},
				},
			});

			window.wp.data.dispatch('core/block-editor').insertBlocks(block);
			window.wp.data
				.dispatch('core/block-editor')
				.selectBlock(block.clientId);
		});
		await page.evaluate(() => {
			window.wp.data
				.dispatch('core/preferences')
				.set('core/edit-post', 'welcomeGuide', false);
			window.wp.data
				.dispatch('core/edit-post')
				.openGeneralSidebar('edit-post/block');
		});

		await expect(
			page.getByText(
				'The title and description come from the category “Journal”.'
			)
		).toBeVisible();
		await expect(
			page.getByRole('link', { name: /Edit the category/ })
		).toHaveAttribute('href', new RegExp(`tag_ID=${id}`));

		// Leaving without saving leaves the archive as it was.
		await page.goto(`/?cat=${id}`);
		await expect(archiveLink).toHaveText('Customise archive');
	});

	test('a customised archive is kept once saved', async ({
		page,
		requestUtils,
	}) => {
		const [id] = await createCategories(requestUtils, ['Workshop']);
		const archiveLink = page.locator('#wp-admin-bar-matter-archive > a');

		await page.goto(`/?cat=${id}`);
		await archiveLink.click();
		await page.waitForFunction(() =>
			window.wp?.data?.select('core/editor')?.getCurrentPostId()
		);
		await page.evaluate(() =>
			window.wp.data.dispatch('core/editor').savePost()
		);
		await expect
			.poll(() =>
				page.evaluate(
					() =>
						window.wp.data.select('core/editor').getCurrentPost()
							.status
				)
			)
			.toBe('draft');

		await page.goto(`/?cat=${id}`);
		await expect(archiveLink).toHaveText('Edit archive');
	});
});

test.describe('archive entry preview', () => {
	test.afterAll(async ({ requestUtils }) => {
		await deleteArchiveEntries(requestUtils);
	});

	test("Preview in new tab shows each draft entry's own intro, to those who can edit it", async ({
		admin,
		page,
		requestUtils,
	}) => {
		await deleteArchiveEntries(requestUtils);
		// A date archive without posts is a 404.
		await createPosts(requestUtils, ['Dated post']);

		// Two drafts for the same archive: neither is "the" draft.
		const drafts = [];

		for (const name of ['first', 'second']) {
			drafts.push(
				await createArchiveEntry(requestUtils, 'date', {
					status: 'draft',
					title: `Draft ${name}`,
					content: `<!-- wp:paragraph --><p>Draft intro ${name}</p><!-- /wp:paragraph --><!-- wp:matter/archive-loop /-->`,
				})
			);
		}

		const urls = [];

		for (const [index, name] of ['first', 'second'].entries()) {
			await admin.visitAdminPage(
				'post.php',
				`post=${drafts[index].id}&action=edit`
			);
			await page.waitForFunction(() =>
				window.wp?.data?.select('core/editor')?.getCurrentPostId()
			);
			await page.evaluate(() => {
				window.wp.data
					.dispatch('core/preferences')
					.set('core/edit-post', 'welcomeGuide', false);
			});

			await page
				.getByRole('button', { name: 'View', exact: true })
				.click();

			const [preview] = await Promise.all([
				page.context().waitForEvent('page'),
				page
					.getByRole('menuitem', { name: /Preview in new tab/ })
					.click(),
			]);

			await expect(
				preview.getByText(`Draft intro ${name}`)
			).toBeVisible();
			await expect(
				preview.getByText(`Draft intro ${index ? 'first' : 'second'}`)
			).toHaveCount(0);
			urls.push(preview.url());
			await preview.close();
		}

		// The first one's link, opened again now the second is newer, is
		// still the first.
		const again = await page.goto(urls[0]);

		await expect(page.getByText('Draft intro first')).toBeVisible();

		// A draft is for one person: it's kept out of shared caches.
		expect(again.headers()['cache-control']).toMatch(/no-cache|no-store/);
		await expect(page.getByText('Draft intro second')).toHaveCount(0);

		// Someone logged out, or without the right to edit, sees neither.
		const visitor = await page
			.context()
			.browser()
			.newContext({ storageState: { cookies: [], origins: [] } });
		const anonymous = await visitor.newPage();

		for (const url of urls) {
			await anonymous.goto(url);
			await expect(
				anonymous.getByText(/Draft intro (first|second)/)
			).toHaveCount(0);
		}

		await visitor.close();
	});
});

test.describe('template part', () => {
	test('a part the theme doesn\'t list shows the "couldn\'t be shown" placeholder, not an empty block', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();

		for (const slug of ['megamenu/x', 'nothing-here', 'unlisted']) {
			await editor.insertBlock({
				name: 'matter/template-part',
				attributes: { slug },
			});
		}

		await editor.insertBlock({
			name: 'matter/template-part',
			attributes: { slug: 'note' },
		});

		const canvas = editor.canvas;

		await expect(
			canvas.getByText("This template part couldn't be shown.")
		).toHaveCount(3);
		await expect(canvas.getByText('Not a part')).toHaveCount(0);
		await expect(canvas.getByText('Listed part')).toBeVisible();
		await expect(canvas.getByText('Panel')).toHaveCount(0);
		expect(await page.locator('.components-spinner').count()).toBe(0);
	});
});

test.describe('accordion', () => {
	test("“Add item” shows while an item's text is selected, and adds one", async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await editor.insertBlock({
			name: 'matter/accordion',
			innerBlocks: [
				{
					name: 'matter/accordion-item',
					attributes: { title: 'One' },
					innerBlocks: [
						{
							name: 'core/paragraph',
							attributes: { content: 'Answer' },
						},
					],
				},
			],
		});

		await page.evaluate(() => {
			const { select, dispatch } = window.wp.data;
			const [accordion] = select('core/block-editor').getBlocks();

			dispatch('core/block-editor').selectBlock(
				accordion.innerBlocks[0].innerBlocks[0].clientId
			);
		});

		await editor.canvas.getByRole('button', { name: 'Add item' }).click();
		await expect
			.poll(() =>
				page.evaluate(
					() =>
						window.wp.data
							.select('core/block-editor')
							.getBlocks()[0].innerBlocks.length
				)
			)
			.toBe(2);
		// Ready to type the new item's title.
		await expect(
			editor.canvas
				.locator('.wp-block-matter-accordion-item__title')
				.nth(1)
		).toBeFocused();
	});

	test('Enter at the end of a question moves to its answer', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await editor.insertBlock({
			name: 'matter/accordion',
			innerBlocks: [{ name: 'matter/accordion-item' }],
		});

		await editor.canvas
			.locator('.wp-block-matter-accordion-item__title')
			.first()
			.click();
		await page.keyboard.type('Do you deliver?');
		await page.keyboard.press('Enter');
		await page.keyboard.type('Yes, everywhere.');

		const item = await page.evaluate(() => {
			const [accordion] = window.wp.data
				.select('core/block-editor')
				.getBlocks();
			const [first] = accordion.innerBlocks;

			return {
				title: first.attributes.title,
				answer: first.innerBlocks.map(
					({ attributes }) => `${attributes.content ?? ''}`
				),
			};
		});

		expect(item).toEqual({
			title: 'Do you deliver?',
			answer: ['Yes, everywhere.'],
		});
	});

	test("Enter at the end of a tab's name moves to its content", async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await editor.insertBlock({ name: 'matter/tabs' });

		await editor.canvas
			.locator('.wp-block-matter-tabs__label[contenteditable]')
			.click();
		await page.keyboard.type('Beginners');
		await page.keyboard.press('Enter');
		await page.keyboard.type('For first-timers.');

		const tab = await page.evaluate(() => {
			const [tabs] = window.wp.data
				.select('core/block-editor')
				.getBlocks();
			const [first] = tabs.innerBlocks;

			return {
				label: first.attributes.label,
				content: `${first.innerBlocks[0]?.attributes.content ?? ''}`,
			};
		});

		expect(tab).toEqual({
			label: 'Beginners',
			content: 'For first-timers.',
		});
	});
});

test.describe('inserter previews', () => {
	test("Matter's blocks have previews, and posts displays preview a few items", async ({
		admin,
		page,
	}) => {
		await admin.createNewPost();

		const previews = await page.evaluate(() => {
			const { getBlockType, getBlockVariations } = window.wp.blocks;
			const names = [
				'matter/accordion',
				'matter/carousel',
				'matter/collapsible',
				'matter/drawer',
				'matter/gallery',
				'matter/modal',
				'matter/tabs',
				'matter-test/section',
			];

			return {
				missing: names.filter((name) => !getBlockType(name)?.example),
				posts: getBlockVariations('core/query')
					.filter(({ name }) => name.startsWith('matter/'))
					.map(({ example }) => example?.attributes?.query?.perPage),
			};
		});

		expect(previews.missing).toEqual([]);
		expect(previews.posts).toEqual([3, 3, 3]);
	});

	test('a posts display previews three items, though it lists up to 100', async ({
		admin,
		page,
		requestUtils,
	}) => {
		// More posts than a preview shows; only these are removed after.
		const created = [];
		const removeCreated = () =>
			Promise.all(
				created.map((id) =>
					requestUtils.rest({
						method: 'DELETE',
						path: `/wp/v2/posts/${id}`,
						params: { force: true },
					})
				)
			);

		try {
			for (let i = 1; i <= 5; i++) {
				// With content: an accordion item with nothing in it isn't
				// shown.
				const { id } = await requestUtils.createPost({
					title: `Preview post ${i}`,
					content: `Answer ${i}`,
					status: 'publish',
				});

				created.push(id);
			}

			await admin.createNewPost();
			await page
				.getByRole('button', { name: 'Block Inserter', exact: true })
				.click();
			await page
				.getByRole('searchbox', { name: 'Search' })
				.fill('Posts accordion');

			// Hovered again while the directory's results load below.
			const option = page.getByRole('option', {
				name: 'Posts accordion',
			});
			const items = page
				.frameLocator('.block-editor-inserter__preview iframe')
				.locator(
					'.matter-query-display__preview .wp-block-matter-accordion-item'
				);

			await expect
				.poll(async () => {
					await option.hover();
					return items.count();
				})
				.toBe(3);
		} finally {
			await removeCreated();
		}
	});
});

test.describe('gallery uploads', () => {
	// A 1×1 PNG.
	const PIXEL = Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
		'base64'
	);

	test('several files uploaded at once all join the gallery', async ({
		admin,
		editor,
		page,
		requestUtils,
	}) => {
		const ids = [];

		try {
			await admin.createNewPost();
			await editor.insertBlock({ name: 'matter/gallery' });
			await editor.canvas
				.locator('.wp-block-matter-gallery input[type="file"]')
				.setInputFiles(
					[1, 2, 3].map((n) => ({
						name: `gallery-upload-${n}.png`,
						mimeType: 'image/png',
						buffer: PIXEL,
					}))
				);

			const uploaded = () =>
				page.evaluate(() =>
					window.wp.data
						.select('core/block-editor')
						.getBlocks()[0]
						.innerBlocks.map(({ attributes }) => attributes.id)
						.filter(Boolean)
				);

			await expect.poll(uploaded, { timeout: 20000 }).toHaveLength(3);
			ids.push(...(await uploaded()));
		} finally {
			await Promise.all(
				ids.map((id) =>
					requestUtils.rest({
						method: 'DELETE',
						path: `/wp/v2/media/${id}`,
						params: { force: true },
					})
				)
			);
		}
	});
});

test.describe('overlay triggers', () => {
	test("a new trigger button's text is selected, so typing replaces it", async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await editor.insertBlock({ name: 'matter/modal' });
		await editor.openDocumentSettingsSidebar();
		await page
			.getByRole('region', { name: 'Editor settings' })
			.getByRole('tab', { name: 'Block' })
			.click();
		// Clicked, not checked: the sidebar moves to the new button.
		await page.getByLabel('Trigger on the page').click();
		await page.keyboard.type('Book a place');

		await expect
			.poll(() =>
				page.evaluate(() => {
					const { getBlocksByName, getBlockAttributes } =
						window.wp.data.select('core/block-editor');
					const [button] = getBlocksByName('core/button');

					return `${getBlockAttributes(button)?.text ?? ''}`;
				})
			)
			.toBe('Book a place');
	});
});

test.describe('buttons without a link', () => {
	test('a button with text but no link is marked until it has one', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost({ postType: 'page' });
		await editor.insertBlock({
			name: 'core/buttons',
			innerBlocks: [
				{ name: 'core/button', attributes: { text: 'See all' } },
				{
					name: 'core/button',
					attributes: { text: 'Shop', url: '/shop/' },
				},
				{ name: 'core/button', attributes: { text: '' } },
			],
		});

		const marked = editor.canvas.locator(
			'.wp-block-button.matter-needs-link'
		);

		await expect(marked).toHaveCount(1);
		await expect(marked).toHaveAttribute('data-matter-hint', 'No link');
		await expect(marked).toContainText('See all');

		await marked.locator('.wp-block-button__link').click();
		await page.evaluate(() => {
			const { getSelectedBlockClientId } =
				window.wp.data.select('core/block-editor');

			window.wp.data
				.dispatch('core/block-editor')
				.updateBlockAttributes(getSelectedBlockClientId(), {
					url: '/journal/',
				});
		});

		await expect(marked).toHaveCount(0);
	});
});

test.describe('tabs', () => {
	test('“Add tab” shows while the tabs are being edited, and adds one', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await editor.insertBlock({ name: 'matter/tabs' });

		const addTab = editor.canvas.getByRole('button', { name: 'Add tab' });

		await addTab.click();
		await expect
			.poll(() =>
				page.evaluate(
					() =>
						window.wp.data
							.select('core/block-editor')
							.getBlocks()[0].innerBlocks.length
				)
			)
			.toBe(3);

		await page.evaluate(() =>
			window.wp.data.dispatch('core/block-editor').clearSelectedBlock()
		);
		await expect(addTab).toHaveCount(0);
	});
});

test.describe('add buttons on the toolbar', () => {
	const count = (page, path) =>
		page.evaluate((keys) => {
			let block = {
				innerBlocks: window.wp.data
					.select('core/block-editor')
					.getBlocks(),
			};

			for (const key of keys) {
				block = block.innerBlocks[key];
			}

			return block.innerBlocks.length;
		}, path);

	const select = (page, path) =>
		page.evaluate((keys) => {
			const { select: get, dispatch } = window.wp.data;
			let block = { innerBlocks: get('core/block-editor').getBlocks() };

			for (const key of keys) {
				block = block.innerBlocks[key];
			}

			dispatch('core/block-editor').selectBlock(block.clientId);
		}, path);

	test('a list offers “Add …” from itself and from anything inside its items', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await editor.insertBlock({
			name: 'matter/tabs',
			innerBlocks: [
				{
					name: 'matter/tab',
					innerBlocks: [
						{
							name: 'core/paragraph',
							attributes: { content: 'Tab text' },
						},
					],
				},
			],
		});
		await editor.insertBlock({
			name: 'matter/accordion',
			innerBlocks: [
				{
					name: 'matter/accordion-item',
					attributes: { title: 'One' },
					innerBlocks: [
						{
							name: 'core/paragraph',
							attributes: { content: 'Answer' },
						},
					],
				},
			],
		});
		await editor.insertBlock({ name: 'matter-test/list' });

		const toolbar = page.getByRole('toolbar', { name: 'Block tools' });

		// Tabs: from a tab's text.
		await select(page, [0, 0, 0]);
		await toolbar.getByRole('button', { name: 'Add tab' }).click();
		await expect.poll(() => count(page, [0])).toBe(2);

		// Accordion: from an answer.
		await select(page, [1, 0, 0]);
		await toolbar.getByRole('button', { name: 'Add item' }).click();
		await expect.poll(() => count(page, [1])).toBe(2);

		// A section whose slot holds one kind of item: from the section, and
		// from inside an item; not from its other slot.
		await expect.poll(() => count(page, [2, 1])).toBe(2);
		await select(page, [2]);
		await toolbar.getByRole('button', { name: 'Add test feature' }).click();
		await expect.poll(() => count(page, [2, 1])).toBe(3);

		await select(page, [2, 1, 0]);
		await expect(
			toolbar.getByRole('button', { name: 'Add test feature' })
		).toBeVisible();

		await select(page, [2, 0, 0]);
		await expect(toolbar).toBeVisible();
		await expect(
			toolbar.getByRole('button', { name: /^Add / })
		).toHaveCount(0);
	});
});

test.describe('filters in the editor', () => {
	const listing = (filters) =>
		`<!-- wp:query {"queryId":7,"query":{"perPage":10,"postType":"post","inherit":false}} --><div class="wp-block-query"><!-- wp:matter/filters -->${filters}<!-- /wp:matter/filters --><!-- wp:post-template --><!-- wp:post-title /--><!-- /wp:post-template --></div><!-- /wp:query -->`;
	const filterAttributes = (page) =>
		page.evaluate(() => {
			const { select } = window.wp.data;
			const find = (list) =>
				list.flatMap((block) => [
					...(block.name === 'matter/filter' ? [block] : []),
					...find(block.innerBlocks),
				]);

			return find(select('core/block-editor').getBlocks()).map(
				({ attributes }) => attributes
			);
		});

	test("a filter's name is edited in place, its settings are a tools panel, and a collapsible one previews closed", async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await editor.setContent(
			listing(
				'<!-- wp:matter/filter {"source":"taxonomy:category"} /--><!-- wp:matter/filter {"source":"taxonomy:post_tag","collapsible":true,"open":false} /--><!-- wp:matter/filter /-->'
			)
		);

		const [category, tag] = await Promise.all([
			editor.canvas.locator('.wp-block-matter-filter').first(),
			editor.canvas.locator('.wp-block-matter-filter').nth(1),
		]);

		// The name is the legend, edited in place; empty, it's the source's.
		const name = category.getByRole('textbox', { name: 'Filter name' });

		await expect(name).toBeVisible();
		await name.click();
		await page.keyboard.type('Topics');
		await expect
			.poll(async () => (await filterAttributes(page))[0].label)
			.toBe('Topics');

		// Settings: a tools panel. "Match" chooses any or all.
		await editor.openDocumentSettingsSidebar();
		const settings = page.getByRole('region', { name: 'Editor settings' });

		await expect(
			settings.getByRole('combobox', { name: 'Filter by' })
		).toHaveValue('taxonomy:category');
		await settings.getByRole('radio', { name: 'All' }).click();
		await expect
			.poll(async () => (await filterAttributes(page))[0].operator)
			.toBe('and');

		await settings
			.getByRole('button', { name: 'Settings options' })
			.click();
		await page.getByRole('menuitem', { name: 'Reset all' }).click();
		await expect
			.poll(async () => (await filterAttributes(page))[0].operator)
			.toBe('or');

		// Closed at first: its options hidden until its row is clicked.
		const group = tag.locator('.wp-block-matter-filter__group');

		await expect(group).not.toHaveAttribute('open');
		// The end of the row, past its (editable) name.
		const row = tag.locator('.wp-block-matter-filter__summary');
		const { width } = await row.boundingBox();

		await row.click({ position: { x: width - 4, y: 4 } });
		await expect(group).toHaveAttribute('open', '');
		expect((await filterAttributes(page))[1].open).toBe(false);

		// A new filter (no source yet): its placeholder chooses one.
		await editor.canvas
			.locator('.wp-block-matter-filter')
			.nth(2)
			.getByRole('combobox', { name: 'Filter by' })
			.selectOption('taxonomy:post_tag');
		await expect
			.poll(async () => (await filterAttributes(page))[2].source)
			.toBe('taxonomy:post_tag');
	});
});

test.describe('focal point preview', () => {
	test("the featured image block previews the post's point, and sets no position without one", async ({
		admin,
		editor,
		requestUtils,
	}) => {
		const post = await requestUtils.rest({
			path: '/wp/v2/posts',
			method: 'POST',
			data: {
				title: 'Focal',
				status: 'draft',
				meta: { _thumbnail_focal_point: { x: 0.2, y: 0.8 } },
			},
		});
		const styles = () =>
			editor.canvas
				.locator('style')
				.evaluateAll((nodes) =>
					nodes
						.map((node) => node.textContent)
						.filter((css) => css.includes('object-position'))
				);

		await admin.editPost(post.id);
		await editor.insertBlock({ name: 'core/post-featured-image' });
		await expect
			.poll(styles)
			.toEqual([expect.stringContaining('object-position:20% 80%')]);

		// A post with no point has no such rule.
		const plain = await requestUtils.rest({
			path: '/wp/v2/posts',
			method: 'POST',
			data: { title: 'No focal', status: 'draft' },
		});

		await admin.editPost(plain.id);
		await editor.insertBlock({ name: 'core/post-featured-image' });
		await expect(
			editor.canvas.locator('.wp-block-post-featured-image')
		).toBeVisible();
		expect(await styles()).toEqual([]);
	});
});
