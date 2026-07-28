/**
 * WordPress dependencies
 */
import {
	useBlockProps,
	useInnerBlocksProps,
	InnerBlocks,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useMemo } from '@wordpress/element';
import { createBlocksFromInnerBlocksTemplate } from '@wordpress/blocks';

/**
 * External dependencies
 */
import EmblaCarousel from 'embla-carousel';
import useEmblaCarousel from 'embla-carousel-react';

/**
 * Internal dependencies
 */
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
import CarouselBlockControls from './components/block-controls';
import CarouselInspectorControls from './components/inspector-controls';
import breakpoints from '../../constants/breakpoints';
import useBlockId from '../../utils/use-block-id';
import {
	STANDARD_CAROUSEL_TEMPLATE,
	IMAGE_CAROUSEL_TEMPLATE,
	POST_CAROUSEL_TEMPLATE,
	getCarouselMode,
} from './variations';

import './editor.scss';

/**
 * Whether viewport children match the expected carousel mode.
 *
 * @param {'standard'|'image'|'post'} mode           Active carousel mode.
 * @param {Array}                     viewportBlocks Viewport inner blocks.
 * @param {Object|false}              viewportBlock  Viewport block.
 * @return {boolean} True when structure matches the mode.
 */
function hasMatchingViewportStructure(mode, viewportBlocks, viewportBlock) {
	const hasQueryBlock = viewportBlocks.some(
		(block) =>
			block.name === 'core/query' ||
			block.name === 'woocommerce/product-collection'
	);
	const allowedBlock = viewportBlock?.attributes?.allowedBlocks?.[0] ?? null;

	if (mode === 'post') {
		return hasQueryBlock;
	}

	if (mode === 'image') {
		return !hasQueryBlock && allowedBlock === 'core/image';
	}

	return (
		!hasQueryBlock &&
		allowedBlock !== 'core/image' &&
		allowedBlock !== 'core/query' &&
		allowedBlock !== 'woocommerce/product-collection'
	);
}

const MODE_TEMPLATES = {
	standard: STANDARD_CAROUSEL_TEMPLATE,
	image: IMAGE_CAROUSEL_TEMPLATE,
	post: POST_CAROUSEL_TEMPLATE,
};

export default function Edit({
	clientId,
	attributes,
	setAttributes,
	isSelected,
}) {
	const {
		className,
		emblaConfig,
		advancedEmblaConfig,
		advancedEmblaConfigMerge,
	} = attributes;

	useBlockId({
		blockName: 'matter/carousel',
		prefix: 'matter-carousel',
		attributes,
		setAttributes,
		clientId,
	});

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

	const setFade = (key, value) => {
		const enablingFade = key === 'active' && value === true;
		const layers = resolvedConfig.breakpointLayers || {};
		let nextLayers = layers;

		if (enablingFade) {
			nextLayers = Object.fromEntries(
				Object.entries(layers).map(([token, layer]) => {
					if (layer?.plugins?.fade?.active === false) {
						return [token, layer];
					}
					return [
						token,
						{
							...layer,
							options: {
								...(layer.options || {}),
								slidesToShow: 1,
							},
						},
					];
				})
			);
		}

		setAttributes({
			emblaConfig: {
				...resolvedConfig,
				options: enablingFade
					? {
							...resolvedConfig.options,
							slidesToShow: 1,
						}
					: resolvedConfig.options,
				plugins: {
					...resolvedConfig.plugins,
					fade: {
						...resolvedConfig.plugins.fade,
						[key]: value,
					},
				},
				breakpointLayers: nextLayers,
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

	const setLayerFade = (token, key, value) => {
		const layers = resolvedConfig.breakpointLayers || {};
		const layer = layers[token] || {};
		const layerPlugins = layer.plugins || {};
		const enablingFade = key === 'active' && value === true;

		setAttributes({
			emblaConfig: {
				...resolvedConfig,
				breakpointLayers: {
					...layers,
					[token]: {
						...layer,
						...(enablingFade
							? {
									options: {
										...(layer.options || {}),
										slidesToShow: 1,
									},
								}
							: {}),
						plugins: {
							...layerPlugins,
							fade: {
								...(layerPlugins.fade || {}),
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

	const carouselMode = getCarouselMode(className);

	useEffect(() => {
		if (!innerBlocks.length) {
			return;
		}

		if (
			hasMatchingViewportStructure(
				carouselMode,
				viewportInnerBlocks,
				viewportBlock
			)
		) {
			return;
		}

		replaceInnerBlocks(
			clientId,
			createBlocksFromInnerBlocksTemplate(MODE_TEMPLATES[carouselMode]),
			false
		);
	}, [
		carouselMode,
		clientId,
		innerBlocks.length,
		replaceInnerBlocks,
		viewportBlock,
		viewportInnerBlocks,
	]);

	const hasQueryLoop = viewportInnerBlocks.find(
		(block) =>
			block.name === 'core/query' ||
			block.name === 'woocommerce/product-collection'
	);

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
	const uiFade = resolvedConfig.plugins.fade;

	const { children, ...innerBlocksProps } = useInnerBlocksProps(blockProps, {
		orientation: 'vertical',
		template: STANDARD_CAROUSEL_TEMPLATE,
		templateLock: false,
		renderAppender:
			isSelected && !isInnerBlockSelected
				? InnerBlocks.ButtonBlockAppender
				: false,
	});

	const blockControls = <CarouselBlockControls />;

	const inspectorControls = (
		<CarouselInspectorControls
			baseOptions={uiOptions}
			baseAutoplay={uiAutoplay}
			baseFade={uiFade}
			breakpointLayers={resolvedConfig.breakpointLayers}
			onChangeBaseOption={setOption}
			onChangeBaseAutoplay={setAutoplay}
			onChangeBaseFade={setFade}
			onChangeLayerOption={setLayerOption}
			onChangeLayerAutoplay={setLayerAutoplay}
			onChangeLayerFade={setLayerFade}
			onResetLayer={resetLayer}
			emblaConfig={resolvedConfig}
			setAttributes={setAttributes}
			advancedEmblaConfig={advancedEmblaConfig}
			advancedEmblaConfigMerge={advancedEmblaConfigMerge}
		/>
	);

	return (
		<>
			{carouselStylesheet && <style>{carouselStylesheet}</style>}

			{blockControls}

			{inspectorControls}

			<div {...innerBlocksProps}>
				<div className="embla" ref={emblaRef}>
					{children}
				</div>
			</div>
		</>
	);
}
