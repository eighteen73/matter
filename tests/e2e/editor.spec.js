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

test.describe('accordion', () => {
	test("“Add accordion item” shows while an item's text is selected", async ({
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

		await editor.canvas
			.getByRole('button', { name: 'Add accordion item' })
			.click();
		// The only block it allows: added at once.
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
				const { id } = await requestUtils.createPost({
					title: `Preview post ${i}`,
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
