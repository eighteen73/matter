/**
 * Carousels of posts or products are edited from their query block.
 *
 * Clicking a carousel's slides selects its Query Loop or Product Collection
 * (its items stay locked), so clients get WordPress's and WooCommerce's own
 * filters, trimmed to those that suit a carousel:
 *
 * - Query Loop: a "Posts carousel" variation, matched by `namespace`, with
 *   core's `allowedControls`.
 * - Product Collection: a "Products carousel" collection, with WooCommerce's
 *   `hideControls`. Its empty scope keeps it out of the inserter and hides
 *   WooCommerce's "Choose collection" button.
 *
 * The carousel's own settings (style, colour scheme, name) are added to the
 * query's sidebar, so everything is in one place. The carousel itself is one
 * step up (toolbar's parent button or the breadcrumb), to move or remove it.
 */

/**
 * WordPress dependencies
 */
import {
	BlockStyles,
	InspectorControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { registerBlockVariation } from '@wordpress/blocks';
import {
	TextControl,
	__experimentalToolsPanel as ToolsPanel, // eslint-disable-line @wordpress/no-unsafe-wp-apis -- What core uses for block controls; experimental in name only.
	__experimentalToolsPanelItem as ToolsPanelItem, // eslint-disable-line @wordpress/no-unsafe-wp-apis
} from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useDispatch, useSelect } from '@wordpress/data';
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
	PRODUCTS_COLLECTION,
	PRODUCTS_HIDDEN_CONTROLS,
	PRODUCTS_LAYOUT,
	QUERY_BLOCKS,
} from '../../blocks/carousel/templates';
import SchemeControl from '../components/scheme-control';

const CAROUSEL = 'matter/carousel';
const LOOP_ITEM = [['matter/loop-item']];

registerBlockVariation(POSTS, {
	name: POSTS_NAMESPACE,
	title: __('Posts carousel', 'matter'),
	description: __(
		'The posts shown as slides. Choose which posts, and the carousel’s style, here.',
		'matter'
	),
	icon: postList,
	scope: [],
	attributes: { namespace: POSTS_NAMESPACE },
	isActive: ['namespace'],
	allowedControls: POSTS_CONTROLS,
	innerBlocks: [['core/post-template', {}, LOOP_ITEM]],
});

// WooCommerce's registry loads separately from Matter's editor script.
domReady(() => {
	window.wc?.wcBlocksRegistry?.__experimentalRegisterProductCollection?.({
		name: PRODUCTS_COLLECTION,
		title: __('Products carousel', 'matter'),
		description: __(
			'The products shown as slides. Choose which products, and the carousel’s style, here.',
			'matter'
		),
		icon: shop,
		scope: [],
		attributes: {
			hideControls: PRODUCTS_HIDDEN_CONTROLS,
			displayLayout: PRODUCTS_LAYOUT,
		},
		innerBlocks: [['woocommerce/product-template', {}, LOOP_ITEM]],
	});
});

/**
 * The carousel a query block is in, if any.
 *
 * @param {string} clientId Query block client ID.
 * @return {Object} `carouselId` and the carousel's `attributes`.
 */
function useCarousel(clientId) {
	return useSelect(
		(select) => {
			const { getBlockRootClientId, getBlockName, getBlockAttributes } =
				select(blockEditorStore);
			const rootId = getBlockRootClientId(clientId);

			return getBlockName(rootId) === CAROUSEL
				? {
						carouselId: rootId,
						attributes: getBlockAttributes(rootId),
					}
				: {};
		},
		[clientId]
	);
}

/**
 * The carousel's settings, in its query's sidebar: its styles (core's own
 * block styles panel, for the carousel), colour scheme and name.
 *
 * @param {Object} props
 * @param {string} props.carouselId Carousel client ID.
 * @param {Object} props.attributes Carousel attributes.
 * @return {Element} Inspector panels.
 */
function CarouselPanel({ carouselId, attributes }) {
	const { updateBlockAttributes } = useDispatch(blockEditorStore);
	const set = (changes) => updateBlockAttributes(carouselId, changes);

	return (
		<InspectorControls>
			<BlockStyles clientId={carouselId} />
			<ToolsPanel
				className="matter-carousel-query-panel"
				label={__('Carousel', 'matter')}
				resetAll={() => set({ scheme: undefined, label: undefined })}
			>
				<ToolsPanelItem
					label={__('Colour scheme', 'matter')}
					hasValue={() => !!attributes.scheme}
					onDeselect={() => set({ scheme: undefined })}
					isShownByDefault
				>
					<SchemeControl
						value={attributes.scheme}
						onChange={(scheme) => set({ scheme })}
					/>
				</ToolsPanelItem>
				<ToolsPanelItem
					label={__('Name', 'matter')}
					hasValue={() => !!attributes.label}
					onDeselect={() => set({ label: undefined })}
					isShownByDefault
				>
					<TextControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={__('Name', 'matter')}
						help={__(
							'Describes the carousel to screen readers, e.g. "Customer stories".',
							'matter'
						)}
						value={attributes.label ?? ''}
						onChange={(label) => set({ label })}
					/>
				</ToolsPanelItem>
			</ToolsPanel>
		</InspectorControls>
	);
}

addFilter(
	'editor.BlockEdit',
	'matter/carousel/query',
	createHigherOrderComponent(
		(BlockEdit) =>
			function CarouselQueryEdit(props) {
				const isQuery = QUERY_BLOCKS.includes(props.name);
				const { carouselId, attributes } = useCarousel(
					isQuery ? props.clientId : undefined
				);

				if (!carouselId || !props.isSelected) {
					return <BlockEdit {...props} />;
				}

				return (
					<>
						<CarouselPanel
							carouselId={carouselId}
							attributes={attributes}
						/>
						<BlockEdit {...props} />
					</>
				);
			},
		'withCarouselQuery'
	)
);
