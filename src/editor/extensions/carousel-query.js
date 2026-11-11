/**
 * Carousels of posts or products: a Query Loop or Product Collection that is
 * itself the carousel (see Blocks\QueryCarousel for the front end).
 *
 * - A `carousel` attribute (`style`, `scheme`, `label`) on the query block
 *   makes it a carousel: the editor shows it as a live carousel, and its
 *   sidebar has the carousel's settings above the query's own controls.
 * - Posts: a "Posts carousel" Query Loop variation, matched by `namespace`,
 *   with core's `allowedControls`.
 * - Products: a "Products carousel" collection, with WooCommerce's
 *   `hideControls` (its Layout and Width settings are hidden by the editor
 *   stylesheet instead). No "Choose collection" button.
 * - In the post editor these replace the plain Query Loop and Product
 *   Collection (and WooCommerce's other collections) in the inserter. The
 *   Site Editor keeps them all, for templates.
 * - The query's items (template, loop item) can't be selected or edited.
 */

/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	getBlockType,
	getBlockVariations,
	registerBlockVariation,
	store as blocksStore,
	unregisterBlockVariation,
} from '@wordpress/blocks';
import {
	Button,
	TextControl,
	__experimentalToolsPanel as ToolsPanel, // eslint-disable-line @wordpress/no-unsafe-wp-apis -- What core uses for block controls; experimental in name only.
	__experimentalToolsPanelItem as ToolsPanelItem, // eslint-disable-line @wordpress/no-unsafe-wp-apis
} from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { dispatch, useDispatch, useSelect } from '@wordpress/data';
import domReady from '@wordpress/dom-ready';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';
import { postList, store as shop } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import {
	POSTS,
	POSTS_CONTROLS,
	POSTS_NAMESPACE,
	PRODUCTS,
	PRODUCTS_COLLECTION,
	PRODUCTS_HIDDEN_CONTROLS,
	PRODUCTS_LAYOUT,
	QUERY_BLOCKS,
} from '../../blocks/carousel/templates';
import { useLockedQuery } from '../../blocks/carousel/use-locked-query';
import {
	CarouselFrame,
	carouselClasses,
	useLiveCarousel,
	variantOptions,
} from '../../carousel/editor/live-carousel';
import SchemeControl from '../components/scheme-control';

const CAROUSEL = 'matter/carousel';
const LOOP_ITEM = [['matter/loop-item']];
const CAROUSEL_ATTRIBUTE = { carousel: { type: 'object' } };

// The Site Editor keeps the plain query blocks in its inserter.
const isPostEditor = () => !document.body.classList.contains('site-editor-php');

/*
 * The `carousel` attribute, on query blocks registered after this script
 * (filter) and before it (e.g. WooCommerce's, updated in the store).
 */
addFilter(
	'blocks.registerBlockType',
	'matter/carousel/attribute',
	(settings, name) =>
		QUERY_BLOCKS.includes(name)
			? {
					...settings,
					attributes: {
						...settings.attributes,
						...CAROUSEL_ATTRIBUTE,
					},
				}
			: settings
);

const addAttributeToRegistered = () =>
	QUERY_BLOCKS.forEach((name) => {
		const blockType = getBlockType(name);

		if (blockType && !blockType.attributes?.carousel) {
			dispatch(blocksStore).addBlockTypes({
				...blockType,
				attributes: { ...blockType.attributes, ...CAROUSEL_ATTRIBUTE },
			});
		}
	});

addAttributeToRegistered();

registerBlockVariation(POSTS, {
	name: POSTS_NAMESPACE,
	title: __('Posts carousel', 'matter'),
	description: __('Posts shown as slides.', 'matter'),
	icon: postList,
	scope: isPostEditor() ? ['inserter'] : [],
	isDefault: isPostEditor(),
	attributes: {
		namespace: POSTS_NAMESPACE,
		carousel: {},
		query: { perPage: 9, postType: 'post', inherit: false },
	},
	isActive: ['namespace'],
	allowedControls: POSTS_CONTROLS,
	innerBlocks: [['core/post-template', {}, LOOP_ITEM]],
});

// WooCommerce's registry loads separately from Matter's editor script.
domReady(() => {
	addAttributeToRegistered();

	window.wc?.wcBlocksRegistry?.__experimentalRegisterProductCollection?.({
		name: PRODUCTS_COLLECTION,
		title: __('Products carousel', 'matter'),
		description: __('Products shown as slides.', 'matter'),
		icon: shop,
		scope: isPostEditor() ? ['inserter'] : [],
		attributes: {
			carousel: {},
			hideControls: PRODUCTS_HIDDEN_CONTROLS,
			displayLayout: PRODUCTS_LAYOUT,
			query: { perPage: 9 },
		},
		innerBlocks: [['woocommerce/product-template', {}, LOOP_ITEM]],
	});

	if (!isPostEditor()) {
		return;
	}

	// Clients get the carousels, not the plain blocks or other collections.
	QUERY_BLOCKS.forEach((name) =>
		(getBlockVariations(name) ?? []).forEach((variation) => {
			const isOurs = [POSTS_NAMESPACE, PRODUCTS_COLLECTION].includes(
				variation.name
			);

			if (!isOurs && variation.scope?.includes('inserter')) {
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

	// The carousel collection stands in for the plain Product Collection.
	const products = (getBlockVariations(PRODUCTS) ?? []).find(
		({ name }) => name === PRODUCTS_COLLECTION
	);

	if (products && !products.isDefault) {
		unregisterBlockVariation(PRODUCTS, PRODUCTS_COLLECTION);
		registerBlockVariation(PRODUCTS, { ...products, isDefault: true });
	}
});

// Nothing can be added inside a carousel's query: its items are the theme's
// loop item. (Core's filter for insertion rules; `__unstable` in name only,
// as WooCommerce uses it.)
addFilter(
	'blockEditor.__unstableCanInsertBlockType',
	'matter/carousel/locked-query',
	(canInsert, blockType, rootClientId, { getBlock }) => {
		const root = rootClientId ? getBlock(rootClientId) : null;

		return root &&
			QUERY_BLOCKS.includes(root.name) &&
			root.attributes?.carousel
			? false
			: canInsert;
	}
);

/**
 * The carousel's styles (block styles registered for the carousel block).
 *
 * @param {Object}   props
 * @param {string}   props.value    Selected style name.
 * @param {Function} props.onChange Receives a style name.
 * @return {Element} Style buttons.
 */
function StylePicker({ value, onChange }) {
	const styles = useSelect(
		(select) => select(blocksStore).getBlockStyles(CAROUSEL) ?? [],
		[]
	);
	const active =
		value || styles.find(({ isDefault }) => isDefault)?.name || '';

	return (
		<div className="matter-carousel-styles">
			{styles.map(({ name, label }) => (
				<Button
					key={name}
					__next40pxDefaultSize
					variant={name === active ? 'primary' : 'secondary'}
					aria-pressed={name === active}
					onClick={() => onChange(name)}
				>
					{label}
				</Button>
			))}
		</div>
	);
}

/**
 * The carousel's settings, above the query's own controls.
 *
 * @param {Object}   props
 * @param {Object}   props.carousel The `carousel` attribute.
 * @param {Function} props.set      Updates it.
 * @return {Element} Inspector panel.
 */
function CarouselPanel({ carousel, set }) {
	return (
		<InspectorControls>
			<ToolsPanel
				className="matter-carousel-query-panel"
				label={__('Carousel', 'matter')}
				resetAll={() =>
					set({
						style: undefined,
						scheme: undefined,
						label: undefined,
					})
				}
			>
				<ToolsPanelItem
					label={__('Style', 'matter')}
					hasValue={() => !!carousel.style}
					onDeselect={() => set({ style: undefined })}
					isShownByDefault
				>
					<StylePicker
						value={carousel.style}
						onChange={(style) => set({ style })}
					/>
				</ToolsPanelItem>
				<ToolsPanelItem
					label={__('Colour scheme', 'matter')}
					hasValue={() => !!carousel.scheme}
					onDeselect={() => set({ scheme: undefined })}
					isShownByDefault
				>
					<SchemeControl
						value={carousel.scheme}
						onChange={(scheme) => set({ scheme })}
					/>
				</ToolsPanelItem>
				<ToolsPanelItem
					label={__('Name', 'matter')}
					hasValue={() => !!carousel.label}
					onDeselect={() => set({ label: undefined })}
					isShownByDefault
				>
					<TextControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={__('Name', 'matter')}
						help={__(
							'Describes the carousel to screen readers, e.g. "Latest news".',
							'matter'
						)}
						value={carousel.label ?? ''}
						onChange={(label) => set({ label })}
					/>
				</ToolsPanelItem>
			</ToolsPanel>
		</InspectorControls>
	);
}

/**
 * A query that is a carousel: the live carousel around the query's editor,
 * as the front end wraps its output.
 *
 * @param {Object}  props
 * @param {Element} props.BlockEdit The query's edit component.
 * @param {Object}  props.props     Its props.
 * @return {Element} Carousel.
 */
function QueryCarouselEdit({ BlockEdit, props }) {
	const { attributes, setAttributes, clientId, isSelected } = props;
	const carousel = attributes.carousel;
	const styleClass = carousel.style ? `is-style-${carousel.style}` : '';
	const options = variantOptions(CAROUSEL, styleClass);
	const live = useLiveCarousel(options);

	useLockedQuery(clientId);

	const set = (changes) =>
		setAttributes({ carousel: { ...carousel, ...changes } });

	// The whole carousel acts as the block: clicking its controls (outside
	// the query's own element) selects it too, and it has the outline.
	const { selectBlock } = useDispatch(blockEditorStore);

	return (
		<>
			{isSelected && <CarouselPanel carousel={carousel} set={set} />}
			{/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- Mouse only: keyboard users reach the block as usual. */}
			<div
				className={[
					'wp-block-matter-carousel',
					'is-query',
					attributes.align && `align${attributes.align}`,
					styleClass,
					carousel.scheme &&
						`has-scheme has-scheme-${carousel.scheme}`,
					carouselClasses(live),
					isSelected && 'is-block-selected',
				]
					.filter(Boolean)
					.join(' ')}
				role="region"
				aria-roledescription={__('carousel', 'matter')}
				aria-label={carousel.label || undefined}
				onClick={() => !isSelected && selectBlock(clientId)}
			>
				<CarouselFrame carousel={live} options={options}>
					<div
						className="wp-block-matter-carousel__viewport"
						ref={live.ref}
					>
						<div className="wp-block-matter-carousel__track">
							<BlockEdit {...props} />
						</div>
					</div>
				</CarouselFrame>
			</div>
		</>
	);
}

addFilter(
	'editor.BlockEdit',
	'matter/carousel/query',
	createHigherOrderComponent(
		(BlockEdit) =>
			function CarouselQueryEdit(props) {
				const isCarousel =
					QUERY_BLOCKS.includes(props.name) &&
					!!props.attributes?.carousel &&
					typeof props.attributes.carousel === 'object';

				return isCarousel ? (
					<QueryCarouselEdit BlockEdit={BlockEdit} props={props} />
				) : (
					<BlockEdit {...props} />
				);
			},
		'withQueryCarousel'
	)
);

// The query's own outline is drawn around the whole carousel instead (see
// editor/canvas.scss).
addFilter(
	'editor.BlockListBlock',
	'matter/carousel/query-outline',
	createHigherOrderComponent(
		(BlockListBlock) =>
			function CarouselQueryBlock(props) {
				const isCarousel =
					QUERY_BLOCKS.includes(props.name) &&
					!!props.attributes?.carousel &&
					typeof props.attributes.carousel === 'object';

				return isCarousel ? (
					<BlockListBlock
						{...props}
						className={[props.className, 'is-carousel-query']
							.filter(Boolean)
							.join(' ')}
					/>
				) : (
					<BlockListBlock {...props} />
				);
			},
		'withCarouselQueryOutline'
	)
);
