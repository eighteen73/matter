/**
 * Queries shown as a carousel, accordion or tabs: a Query Loop (or, for
 * carousels, a Product Collection or Terms Query) that is itself the block
 * (see query-display/templates and Blocks\QueryDisplay for the front end).
 *
 * - A `matterDisplay` attribute on the query block (`type`, `style`,
 *   `scheme` and the block's own settings) shows it as that block. Its
 *   sidebar has the block's settings above the query's own controls.
 * - Carousels are live carousels around the query (their slides are the
 *   theme's loop items). Accordions and tabs are the server's rendering, as
 *   on the front end, which can be clicked through.
 * - Posts: "Posts carousel", "Posts accordion" and "Posts tabs" Query Loop
 *   variations, matched by `namespace`, with core's `allowedControls`.
 * - An integration's query blocks (carousels only), e.g. the WooCommerce
 *   integration's "Products carousel" collection, registered by its own
 *   editor script with the helpers on `window.matterEditor.queryDisplay`.
 * - Terms (carousels only): a "Terms carousel" Terms Query variation, matched
 *   by its display, with core's own controls (taxonomy, order, empty terms,
 *   nesting, chosen terms). Its slides are the theme's term loop items.
 * - In the post editor these replace the plain query blocks (and any other
 *   variations of them, e.g. WooCommerce's other collections) in the
 *   inserter. The Site Editor keeps them all, for templates.
 * - The query's items can't be selected, edited or added to.
 */

/**
 * WordPress dependencies
 */
import {
	getBlockType,
	getBlockVariations,
	registerBlockVariation,
	unregisterBlockVariation,
} from '@wordpress/blocks';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useRegistry, useSelect } from '@wordpress/data';
import domReady from '@wordpress/dom-ready';
import { useEffect } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';
import { category, postList } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { CAN_INSERT_FILTER } from '../can-insert';
import {
	ATTRIBUTE,
	DISPLAY_BLOCKS,
	ITEMS,
	LIST_CLASS,
	NAMESPACES,
	POSTS,
	POSTS_CONTROLS,
	TERMS,
	TERMS_VARIATION,
	displayOf,
	postsTemplate,
	queryBlocks,
	queryLoops,
	termsAttributes,
} from '../../../query-display/templates';
import CarouselEdit from './carousel-edit';
import PreviewEdit from './preview-edit';
import PostTypePicker from './post-type-picker';

const DISPLAY_ATTRIBUTE = {
	[ATTRIBUTE]: { type: 'object' },
	matterId: { type: 'string' },
};
const DISPLAY_CONTEXT = 'matter/display';
const { postTypeNames = [], postTypes = [] } = window.matterEditor ?? {};

// The Site Editor keeps the plain query blocks in its inserter.
const isPostEditor = () => !document.body.classList.contains('site-editor-php');

const POSTS_VARIATIONS = {
	carousel: {
		title: __('Posts carousel', 'matter'),
		description: __(
			'Posts shown as slides, e.g. the latest news. New posts appear by themselves.',
			'matter'
		),
		keywords: [
			__('slider', 'matter'),
			__('latest', 'matter'),
			__('news', 'matter'),
			__('blog', 'matter'),
		],
	},
	accordion: {
		title: __('Posts accordion', 'matter'),
		description: __(
			'Posts shown as an accordion, e.g. every FAQ: each title opens its panel. New posts appear by themselves.',
			'matter'
		),
		keywords: [
			__('faq', 'matter'),
			__('questions', 'matter'),
			__('toggle', 'matter'),
		],
	},
	tabs: {
		title: __('Posts tabs', 'matter'),
		description: __(
			'Posts shown as tabs: each post’s title is a tab. New posts appear by themselves.',
			'matter'
		),
		keywords: [],
	},
};

/*
 * The attribute, on query blocks registered after this script (filter) and
 * before it (e.g. WooCommerce's, updated in the store).
 */
const withDisplay = (settings) => ({
	...settings,
	attributes: { ...settings.attributes, ...DISPLAY_ATTRIBUTE },
	// Loop items inside pick the theme's pattern for the block (also in the
	// post template's previews of its other items, which are outside the
	// editor's block tree but inside this context).
	providesContext: {
		...settings.providesContext,
		[DISPLAY_CONTEXT]: ATTRIBUTE,
	},
});

// Also reaches blocks registered before this script (e.g. WooCommerce's
// Product Collection): the post and site editors reapply block type filters
// when they start.
addFilter(
	'blocks.registerBlockType',
	'matter/query-display/attribute',
	(settings, name) =>
		queryBlocks().includes(name) ? withDisplay(settings) : settings
);

// Items in an inserter preview: enough to show the display, not every post.
const PREVIEW_ITEMS = 3;

/**
 * A block template (`[ name, attributes, inner ]`) as an inserter example's
 * blocks.
 *
 * @param {Array} template Block template.
 * @return {Object[]} Example blocks.
 */
const exampleBlocks = (template = []) =>
	template.map(([name, attributes = {}, inner = []]) => ({
		name,
		attributes,
		innerBlocks: exampleBlocks(inner),
	}));

/**
 * An inserter preview for a query display: its own attributes and blocks,
 * listing a few items (see DisplayEdit; a product collection applies its own
 * query, so all of them). Carousels are shown at a laptop's width, several
 * slides across.
 *
 * @param {Object} attributes Display attributes.
 * @param {Array}  template   Inner block template.
 * @param {string} queryKey   `query` or `termQuery`.
 * @return {Object} Block example.
 */
const queryExample = (attributes, template, queryKey = 'query') => ({
	...('carousel' === attributes[ATTRIBUTE]?.type && { viewportWidth: 1200 }),
	attributes: {
		...attributes,
		[queryKey]: { ...attributes[queryKey], perPage: PREVIEW_ITEMS },
	},
	innerBlocks: exampleBlocks(template),
});

/*
 * Helpers for integrations' editor scripts, which load after this one (it's
 * their dependency), so their query blocks show as Matter's do: e.g. the
 * WooCommerce integration's "Products carousel" collection.
 */
window.matterEditor = {
	...window.matterEditor,
	queryDisplay: { ATTRIBUTE, ITEMS, isPostEditor, queryExample },
};

// After the blocks register (their icons) and other plugins' registries load
// (an integration registers its own variations after this, in its own
// domReady, so they're never hidden below).
domReady(() => {
	Object.entries(POSTS_VARIATIONS).forEach(([type, variation]) => {
		// No post type: the client chooses what it lists (DisplayEdit).
		const [, attributes] = postsTemplate(type, '');
		const innerBlocks = [['core/post-template', {}, ITEMS[type]]];

		registerBlockVariation(POSTS, {
			...variation,
			// Searching a post type's name ("faq") finds them too.
			keywords: [...variation.keywords, ...postTypeNames],
			name: NAMESPACES[type],
			icon: getBlockType(DISPLAY_BLOCKS[type])?.icon?.src ?? postList,
			scope: isPostEditor() ? ['inserter'] : [],
			isDefault: isPostEditor() && type === 'carousel',
			attributes,
			isActive: ['namespace'],
			allowedControls: POSTS_CONTROLS,
			innerBlocks,
			example: queryExample(attributes, innerBlocks),
		});
	});

	if (getBlockType(TERMS)) {
		registerBlockVariation(TERMS, {
			name: TERMS_VARIATION,
			title: __('Terms carousel', 'matter'),
			description: __(
				'Categories, tags or other terms shown as slides.',
				'matter'
			),
			icon: getBlockType(DISPLAY_BLOCKS.carousel)?.icon?.src ?? category,
			scope: isPostEditor() ? ['inserter'] : [],
			isDefault: isPostEditor(),
			attributes: termsAttributes(),
			// A Terms Query has no `namespace`: its display marks it.
			isActive: (attributes) => !!displayOf(TERMS, attributes),
			innerBlocks: [['core/term-template', {}, ITEMS.carousel]],
			example: queryExample(
				termsAttributes(),
				[['core/term-template', {}, ITEMS.carousel]],
				'termQuery'
			),
		});
	}

	if (!isPostEditor()) {
		return;
	}

	// Clients get Matter's, not the plain blocks or other variations.
	const ours = [...Object.values(NAMESPACES), TERMS_VARIATION];

	queryBlocks().forEach((name) =>
		(getBlockVariations(name) ?? []).forEach((variation) => {
			if (
				!ours.includes(variation.name) &&
				variation.scope?.includes('inserter')
			) {
				unregisterBlockVariation(name, variation.name);
				registerBlockVariation(name, {
					...variation,
					isDefault: false,
					scope: variation.scope.filter(
						(scope) => scope !== 'inserter'
					),
				});
			}
		})
	);
});

// Every loop template's list has Matter's class, as on the front end
// (Blocks\Instances::mark_list()), so a carousel around a query finds its
// slides by one class, whichever block lists them.
addFilter(
	'editor.BlockListBlock',
	'matter/query-display/list-class',
	createHigherOrderComponent(
		(BlockListBlock) =>
			function QueryListBlock(props) {
				return queryLoops()[props.name] ? (
					<BlockListBlock
						{...props}
						className={[props.className, LIST_CLASS]
							.filter(Boolean)
							.join(' ')}
					/>
				) : (
					<BlockListBlock {...props} />
				);
			},
		'withQueryListClass'
	)
);

// Nothing can be added inside a displayed query: its items are fixed. (Core's
// filter for insertion rules; `__unstable` in name only, as WooCommerce uses
// it.)
addFilter(
	CAN_INSERT_FILTER,
	'matter/query-display/locked-query',
	(canInsert, blockType, rootClientId, { getBlock }) => {
		const root = rootClientId ? getBlock(rootClientId) : null;

		return root && displayOf(root.name, root.attributes)
			? false
			: canInsert;
	}
);

const EDITS = {
	carousel: CarouselEdit,
	accordion: PreviewEdit,
	tabs: PreviewEdit,
};

/**
 * A query display, once it's ready to show:
 *
 * - A new posts display has no post type until the client chooses what it
 *   lists (PostTypePicker). With only one choice, it's that one.
 * - In a preview (the inserter's, a pattern's) it lists a few posts. Core
 *   gives an inserter preview the variation's own attributes over its
 *   example's, so the example alone can't limit them. A preview has its own
 *   block store: the page being edited is untouched.
 *
 * @param {Object}   root           Props.
 * @param {Function} root.Edit      The display's edit component.
 * @param {Function} root.BlockEdit The query block's edit component.
 * @param {Object}   root.props     The query block's props.
 * @param {string}   root.type      Display type.
 * @return {Element} The display, or the post type picker.
 */
function DisplayEdit({ Edit, BlockEdit, props, type }) {
	const registry = useRegistry();
	const isPreview = useSelect(
		(select) => !!select(blockEditorStore).getSettings().isPreviewMode,
		[]
	);
	const { name, attributes, setAttributes } = props;
	const key = TERMS === name ? 'termQuery' : 'query';
	const query = attributes[key];
	const perPage = Number(query?.perPage);
	const needsPostType = POSTS === name && !query?.postType;

	// Set without asking: a preview's posts, or a site's only post type.
	let postType;

	if (needsPostType && isPreview) {
		postType = 'post';
	} else if (needsPostType && postTypes.length < 2) {
		postType = postTypes[0]?.name ?? 'post';
	}

	const changes = {
		...(isPreview &&
			!(perPage > 0 && perPage <= PREVIEW_ITEMS) && {
				perPage: PREVIEW_ITEMS,
			}),
		...(postType && { postType }),
	};
	const pending = Object.keys(changes).length > 0;
	const changesKey = JSON.stringify(changes);

	useEffect(() => {
		if (!pending) {
			return;
		}

		// Not an edit the client made.
		registry
			.dispatch(blockEditorStore)
			.__unstableMarkNextChangeAsNotPersistent();
		setAttributes({ [key]: { ...query, ...JSON.parse(changesKey) } });
	}, [pending, changesKey, key, query, registry, setAttributes]);

	if (pending) {
		return null;
	}

	if (needsPostType) {
		return (
			<PostTypePicker
				label={POSTS_VARIATIONS[type]?.title}
				postTypes={postTypes}
				onChoose={(chosen) =>
					setAttributes({ [key]: { ...query, postType: chosen } })
				}
			/>
		);
	}

	return <Edit BlockEdit={BlockEdit} props={props} />;
}

addFilter(
	'editor.BlockEdit',
	'matter/query-display/edit',
	createHigherOrderComponent(
		(BlockEdit) =>
			function QueryDisplayEdit(props) {
				const display = displayOf(props.name, props.attributes);
				const Edit = display ? EDITS[display.type] : null;

				return Edit ? (
					<DisplayEdit
						type={display.type}
						Edit={Edit}
						BlockEdit={BlockEdit}
						props={props}
					/>
				) : (
					<BlockEdit {...props} />
				);
			},
		'withQueryDisplay'
	)
);

// The query's own outline is drawn around the whole block instead (see
// editor/canvas.scss).
addFilter(
	'editor.BlockListBlock',
	'matter/query-display/outline',
	createHigherOrderComponent(
		(BlockListBlock) =>
			function QueryDisplayBlock(props) {
				return displayOf(props.name, props.attributes) ? (
					<BlockListBlock
						{...props}
						className={[props.className, 'is-display-query']
							.filter(Boolean)
							.join(' ')}
					/>
				) : (
					<BlockListBlock {...props} />
				);
			},
		'withQueryDisplayOutline'
	)
);
