/**
 * WordPress dependencies
 */
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useEffect, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * External dependencies
 */
import useEmblaCarousel from 'embla-carousel-react';

/**
 * Internal dependencies
 */
import SingleBlockTypeAppender from '../../components/single-block-type-appender';
import {
	addDotBtnsAndClickHandlers,
	addPrevNextBtnsClickHandlers,
} from '../../utils/embla';
import {
	buildEmblaPlugins,
	normalizeEmblaConfig,
	prepareEmblaBlockState,
} from '../../utils/embla-block-config';
import AdvancedControls from './components/advanced-controls';
import CarouselControls from './components/carousel-controls';
import breakpoints from '../../constants/breakpoints';

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

	// Generate CSS variables for slidesToShow
	const slidesToShowCssVars = {
		...Object.keys(breakpoints).reduce((acc, breakpoint) => {
			acc[
				`--wp--custom--eighteen73-carousel--slides-to-show-${breakpoint}`
			] =
				resolvedConfig.breakpointLayers?.[breakpoint]?.options
					?.slidesToShow ?? resolvedConfig.options.slidesToShow;
			return acc;
		}, {}),
		'--wp--custom--eighteen73-carousel--slides-to-show-base':
			resolvedConfig.options.slidesToShow,
	};

	const blockProps = useBlockProps({
		className: 'embla',
		style: slidesToShowCssVars,
	});

	const { children, ...innerBlocksProps } = useInnerBlocksProps(blockProps, {
		orientation: 'vertical',
		template: [
			['eighteen73-blocks/carousel-viewport', { lock: { remove: true } }],
			['eighteen73-blocks/carousel-progress'],
			['eighteen73-blocks/carousel-previous-button'],
			['eighteen73-blocks/carousel-next-button'],
		],
		templateLock: false,
	});

	const innerBlocks = useSelect((select) =>
		select('core/block-editor').getBlock(clientId)
			? select('core/block-editor').getBlock(clientId).innerBlocks
			: []
	);

	const viewportBlock =
		innerBlocks.find(
			(block) => block.name === 'eighteen73-blocks/carousel-viewport'
		) || false;

	const viewportInnerBlocks = useSelect((select) =>
		viewportBlock &&
		select('core/block-editor').getBlock(viewportBlock.clientId)
			? select('core/block-editor').getBlock(viewportBlock.clientId)
					.innerBlocks
			: []
	);

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

	const [emblaRef, emblaApi] = useEmblaCarousel(
		{
			...emblaOptions,
			container: getContainer(),
			slides: ':scope > :not(.block-list-appender)',
		},
		emblaPlugins
	);

	// Embla measures slide sizes on init; changing CSS vars that affect widths
	// needs a reInit to reflect immediately in the editor.
	const slidesToShowSignature = useMemo(() => {
		const base = resolvedConfig.options.slidesToShow;
		const layers = resolvedConfig.breakpointLayers || {};
		const perBp = Object.keys(breakpoints).map((token) => [
			token,
			layers?.[token]?.options?.slidesToShow,
		]);
		return JSON.stringify({ base, perBp });
	}, [resolvedConfig.options.slidesToShow, resolvedConfig.breakpointLayers]);

	useEffect(() => {
		if (!emblaApi) {
			return;
		}
		emblaApi.reInit();
	}, [emblaApi, slidesToShowSignature]);

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

		const block = document.querySelector(`[data-block="${clientId}"]`);
		const buttons = block?.querySelectorAll('.embla__button');
		const dotsNode = block?.querySelector('.embla__dots');

		if (!buttons || buttons.length < 2 || !dotsNode) {
			return;
		}

		const removePrevNextBtnsClickHandlers = addPrevNextBtnsClickHandlers(
			emblaApi,
			buttons[0],
			buttons[1]
		);
		const removeDotBtnsAndClickHandlers = addDotBtnsAndClickHandlers(
			emblaApi,
			dotsNode
		);

		return () => {
			removePrevNextBtnsClickHandlers();
			removeDotBtnsAndClickHandlers();
		};
	}, [clientId, emblaApi, innerBlocks, setAttributes]);

	const isInnerBlockSelected = useSelect((select) =>
		select('core/block-editor').hasSelectedInnerBlock(clientId, true)
	);

	const uiOptions = resolvedConfig.options;
	const uiAutoplay = resolvedConfig.plugins.autoplay;

	return (
		<>
			<InspectorControls group="settings">
				<PanelBody title={__('Settings', 'eighteen73-blocks')}>
					<CarouselControls
						baseOptions={uiOptions}
						baseAutoplay={uiAutoplay}
						breakpointLayers={resolvedConfig.breakpointLayers}
						onChangeBaseOption={setOption}
						onChangeBaseAutoplay={setAutoplay}
						onChangeLayerOption={setLayerOption}
						onChangeLayerAutoplay={setLayerAutoplay}
						onResetLayer={resetLayer}
					/>
				</PanelBody>
			</InspectorControls>

			<InspectorControls group="advanced">
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
					(isSelected || isInnerBlockSelected) && (
						<SingleBlockTypeAppender
							onClickAfter={() => {}}
							variant="secondary"
							text={__('Add item', 'eighteen73-blocks')}
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
