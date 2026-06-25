/**
 * WordPress dependencies
 */
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	InnerBlocks,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * External dependencies
 */
import EmblaCarousel from 'embla-carousel';
import useEmblaCarousel from 'embla-carousel-react';

/**
 * Internal dependencies
 */
import SingleBlockTypeAppender from '../../components/single-block-type-appender';
import {
	addDotBtnsAndClickHandlers,
	addPrevNextBtnsClickHandlers,
	addThumbsClickHandlers,
} from './utils/embla';
import {
	buildEmblaPlugins,
	normalizeEmblaConfig,
	prepareEmblaBlockState,
} from './utils/embla-block-config';
import { findDescendantBlock } from './utils/block-tree';
import { buildCarouselStylesheet } from './utils/styles';
import { shouldReplaceThumbBlocks } from './utils/thumbnails-sync';
import AdvancedControls from './components/advanced-controls';
import CarouselControls from './components/carousel-controls';
import breakpoints from '../../constants/breakpoints';
import BlockVariationPicker from '../../components/block-variation-picker';

import './editor.scss';

const DEFAULT_CAROUSEL_TEMPLATE = [
	['matter/carousel-viewport', { lock: { remove: true } }],
	[
		'core/group',
		{
			layout: {
				type: 'flex',
				justifyContent: 'space-between',
				flexWrap: 'nowrap',
				verticalAlignment: 'center',
			},
		},
		[
			['matter/carousel-previous-button'],
			['matter/carousel-dots'],
			['matter/carousel-next-button'],
		],
	],
];

export default function Edit({
	clientId,
	attributes,
	setAttributes,
	isSelected,
}) {
	const { emblaConfig, advancedEmblaConfig, advancedEmblaConfigMerge } =
		attributes;
	const resolvedConfig = useMemo(
		() => normalizeEmblaConfig(emblaConfig),
		[emblaConfig]
	);

	const { emblaOptions, pluginState } = useMemo(
		() =>
			prepareEmblaBlockState({
				emblaConfig: resolvedConfig,
				advancedEmblaConfig,
				advancedEmblaConfigMerge,
			}),
		[resolvedConfig, advancedEmblaConfig, advancedEmblaConfigMerge]
	);

	const setOption = (key, value) => {
		setAttributes({
			emblaConfig: {
				...resolvedConfig,
				options: {
					...resolvedConfig.options,
					[key]: value,
				},
			},
		});
	};

	const setAutoplay = (key, value) => {
		setAttributes({
			emblaConfig: {
				...resolvedConfig,
				plugins: {
					...resolvedConfig.plugins,
					autoplay: {
						...resolvedConfig.plugins.autoplay,
						[key]: value,
					},
				},
			},
		});
	};

	const setLayerOption = (token, key, value) => {
		const layers = resolvedConfig.breakpointLayers || {};
		const layer = layers[token] || {};
		setAttributes({
			emblaConfig: {
				...resolvedConfig,
				breakpointLayers: {
					...layers,
					[token]: {
						...layer,
						options: {
							...(layer.options || {}),
							[key]: value,
						},
					},
				},
			},
		});
	};

	const setLayerAutoplay = (token, key, value) => {
		const layers = resolvedConfig.breakpointLayers || {};
		const layer = layers[token] || {};
		const layerPlugins = layer.plugins || {};
		setAttributes({
			emblaConfig: {
				...resolvedConfig,
				breakpointLayers: {
					...layers,
					[token]: {
						...layer,
						plugins: {
							...layerPlugins,
							autoplay: {
								...(layerPlugins.autoplay || {}),
								[key]: value,
							},
						},
					},
				},
			},
		});
	};

	const resetLayer = (token) => {
		const layers = resolvedConfig.breakpointLayers || {};
		if (!layers[token]) {
			return;
		}
		const { [token]: _removed, ...rest } = layers;
		setAttributes({
			emblaConfig: {
				...resolvedConfig,
				breakpointLayers: rest,
			},
		});
	};

	const carouselId = `block-${clientId}`;
	const carouselStylesheet = useMemo(
		() =>
			buildCarouselStylesheet(`#${carouselId}`, {
				baseOptions: resolvedConfig.options,
				breakpointLayers: resolvedConfig.breakpointLayers,
				breakpointTokens: Object.keys(breakpoints),
				breakpointConfig: breakpoints,
			}),
		[carouselId, resolvedConfig.options, resolvedConfig.breakpointLayers]
	);

	const blockProps = useBlockProps({
		id: carouselId,
	});

	const innerBlocks = useSelect((select) =>
		select('core/block-editor').getBlock(clientId)
			? select('core/block-editor').getBlock(clientId).innerBlocks
			: []
	);

	const viewportBlock =
		innerBlocks.find(
			(block) => block.name === 'matter/carousel-viewport'
		) || false;

	const viewportInnerBlocks = useSelect((select) =>
		viewportBlock &&
		select('core/block-editor').getBlock(viewportBlock.clientId)
			? select('core/block-editor').getBlock(viewportBlock.clientId)
					.innerBlocks
			: []
	);

	const thumbsBlock =
		findDescendantBlock(innerBlocks, 'matter/carousel-thumbnails') || false;

	const thumbsInnerBlocks = useSelect((select) =>
		thumbsBlock &&
		select('core/block-editor').getBlock(thumbsBlock.clientId)
			? select('core/block-editor').getBlock(thumbsBlock.clientId)
					.innerBlocks
			: []
	);

	const { replaceInnerBlocks } = useDispatch(blockEditorStore);

	const hasQueryLoop = viewportInnerBlocks.find(
		(block) =>
			block.name === 'core/query' ||
			block.name === 'woocommerce/product-collection'
	);

	const viewportAllowedBlock =
		viewportBlock?.attributes?.allowedBlocks?.[0] ?? null;

	const isQueryOnlyViewport =
		viewportAllowedBlock === 'core/query' ||
		viewportAllowedBlock === 'woocommerce/product-collection';

	const getContainer = () => {
		if (!hasQueryLoop) {
			return '.embla__container';
		}

		if (hasQueryLoop.name === 'core/query') {
			return '.wp-block-post-template';
		}
		if (hasQueryLoop.name === 'woocommerce/product-collection') {
			return '.wp-block-woocommerce-product-template';
		}

		return '.embla__container';
	};

	const emblaPlugins = useMemo(
		() => buildEmblaPlugins(pluginState, { forceInactive: true }),
		[pluginState]
	);

	const editorSlidesSelector =
		':scope > .block-editor-block-list__block:not(.block-list-appender)';

	const [emblaRef, emblaApi] = useEmblaCarousel(
		{
			...emblaOptions,
			container: getContainer(),
			slides: editorSlidesSelector,
			watchFocus: false,
		},
		emblaPlugins
	);

	// Embla measures slide sizes on init; changing CSS vars that affect widths
	// needs a reInit to reflect immediately in the editor.
	const layoutSignature = useMemo(() => {
		const base = resolvedConfig.options.slidesToShow;
		const baseAxis = resolvedConfig.options.axis;
		const baseSlideGap = resolvedConfig.options.slideGap;
		const layers = resolvedConfig.breakpointLayers || {};
		const perBp = Object.keys(breakpoints).map((token) => [
			token,
			layers?.[token]?.options?.slidesToShow,
			layers?.[token]?.options?.axis,
			layers?.[token]?.options?.slideGap,
		]);
		return JSON.stringify({ base, baseAxis, baseSlideGap, perBp });
	}, [
		resolvedConfig.options.slidesToShow,
		resolvedConfig.options.axis,
		resolvedConfig.options.slideGap,
		resolvedConfig.breakpointLayers,
	]);

	useEffect(() => {
		if (!emblaApi) {
			return;
		}
		emblaApi.reInit();
	}, [emblaApi, layoutSignature]);

	useEffect(() => {
		if (!emblaApi) {
			return;
		}

		emblaApi.reInit();
	}, [emblaApi, viewportInnerBlocks.length]);

	useEffect(() => {
		if (!thumbsBlock) {
			return;
		}

		const syncWithCarousel =
			thumbsBlock.attributes?.syncWithCarousel !== false;
		const nextThumbBlocks = shouldReplaceThumbBlocks({
			syncWithCarousel,
			viewportInnerBlocks,
			thumbsInnerBlocks,
		});

		if (!nextThumbBlocks) {
			return;
		}

		replaceInnerBlocks(thumbsBlock.clientId, nextThumbBlocks, false);
	}, [
		replaceInnerBlocks,
		thumbsBlock,
		thumbsInnerBlocks,
		viewportInnerBlocks,
	]);

	useEffect(() => {
		if (!emblaApi) {
			return;
		}

		setAttributes({ emblaApi });
	}, [emblaApi, setAttributes]);

	useEffect(() => {
		if (!emblaApi) {
			return;
		}

		setAttributes({ emblaApi });

		const emblaRootNode = emblaApi.rootNode?.();
		const block =
			emblaRootNode?.closest?.(`[data-block="${clientId}"]`) || null;
		const controlsScope = block || emblaRootNode || null;
		const buttons = controlsScope?.querySelectorAll('.embla__button');
		const dotsNode = controlsScope?.querySelector('.embla__dots');
		const thumbsViewportNode = controlsScope?.querySelector(
			'.embla__thumbs__viewport'
		);
		const thumbsContainerNode = controlsScope?.querySelector(
			'.embla__thumbs__container'
		);
		const removeHandlers = [];

		if (buttons && buttons.length >= 2) {
			removeHandlers.push(
				addPrevNextBtnsClickHandlers(emblaApi, buttons[0], buttons[1])
			);
		}

		if (dotsNode) {
			removeHandlers.push(addDotBtnsAndClickHandlers(emblaApi, dotsNode));
		}

		if (thumbsViewportNode && thumbsContainerNode) {
			const thumbsEmblaApi = EmblaCarousel(thumbsViewportNode, {
				containScroll: 'keepSnaps',
				container: thumbsContainerNode,
				dragFree: true,
				slides: editorSlidesSelector,
				watchFocus: false,
			});

			removeHandlers.push(
				addThumbsClickHandlers(
					emblaApi,
					thumbsEmblaApi,
					thumbsContainerNode
				)
			);
			removeHandlers.push(() => thumbsEmblaApi.destroy());
		}

		return () => {
			removeHandlers.forEach((removeHandler) => removeHandler());
		};
	}, [
		clientId,
		emblaApi,
		innerBlocks,
		thumbsInnerBlocks,
		viewportInnerBlocks,
		setAttributes,
	]);

	const isInnerBlockSelected = useSelect((select) =>
		select('core/block-editor').hasSelectedInnerBlock(clientId, true)
	);

	const uiOptions = resolvedConfig.options;
	const uiAutoplay = resolvedConfig.plugins.autoplay;

	const { children, ...innerBlocksProps } = useInnerBlocksProps(blockProps, {
		orientation: 'vertical',
		template: DEFAULT_CAROUSEL_TEMPLATE,
		templateLock: false,
		renderAppender:
			isSelected && !isInnerBlockSelected
				? InnerBlocks.ButtonBlockAppender
				: false,
	});

	if (innerBlocks.length === 0) {
		return (
			<BlockVariationPicker
				blockName="matter/carousel"
				setAttributes={setAttributes}
				clientId={clientId}
				defaultTemplate={DEFAULT_CAROUSEL_TEMPLATE}
			/>
		);
	}

	return (
		<>
			{carouselStylesheet && <style>{carouselStylesheet}</style>}

			<InspectorControls group="settings">
				<CarouselControls
					baseOptions={uiOptions}
					baseAutoplay={uiAutoplay}
					breakpointLayers={resolvedConfig.breakpointLayers}
					onChangeBaseOption={setOption}
					onChangeBaseAutoplay={setAutoplay}
					onChangeLayerOption={setLayerOption}
					onChangeLayerAutoplay={setLayerAutoplay}
					onResetLayer={resetLayer}
					emblaConfig={resolvedConfig}
					setAttributes={setAttributes}
				/>

				<AdvancedControls
					advancedEmblaConfig={advancedEmblaConfig}
					advancedEmblaConfigMerge={advancedEmblaConfigMerge}
					setAttributes={setAttributes}
				/>
			</InspectorControls>

			<div {...innerBlocksProps}>
				<div className="embla" ref={emblaRef}>
					{children}
				</div>

				{viewportBlock &&
					viewportBlock?.attributes?.allowedBlocks?.length === 1 &&
					!isQueryOnlyViewport &&
					!hasQueryLoop &&
					(isSelected || isInnerBlockSelected) && (
						<SingleBlockTypeAppender
							onClickAfter={() => {}}
							variant="secondary"
							text={__('Add item', 'matter')}
							allowedBlock={
								viewportBlock?.attributes?.allowedBlocks?.[0]
							}
							style={{
								width: '50%',
								justifyContent: 'center',
								marginTop: '1rem',
								marginLeft: 'auto',
								marginRight: 'auto',
								display: 'flex',
							}}
							clientId={viewportBlock.clientId}
						/>
					)}
			</div>
		</>
	);
}
