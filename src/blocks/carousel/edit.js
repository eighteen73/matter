/**
 * WordPress dependencies
 */
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	RangeControl,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
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
	DEFAULT_EMBLA_CONFIG,
	buildEmblaPlugins,
	normalizeEmblaConfig,
	prepareEmblaBlockState,
} from '../../utils/embla-block-config';
import AdvancedControls from './components/advanced-controls';

export default function Edit({
	clientId,
	attributes: { emblaConfig, advancedEmblaConfig, advancedEmblaConfigMerge },
	setAttributes,
	isSelected,
}) {
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

	const blockProps = useBlockProps({ className: 'embla' });
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

	useEffect(() => {
		if (!emblaApi) return;

		setAttributes({ emblaApi });
	}, [emblaApi, setAttributes]);

	useEffect(() => {
		if (!emblaApi) return;

		setAttributes({ emblaApi });

		const block = document.querySelector(`[data-block="${clientId}"]`);
		const buttons = block?.querySelectorAll('.embla__button');
		const dotsNode = block?.querySelector('.embla__dots');

		if (!buttons || buttons.length < 2 || !dotsNode) return;

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
					<ToggleControl
						label={__('Loop', 'eighteen73-blocks')}
						checked={uiOptions.loop}
						onChange={(value) => setOption('loop', value)}
					/>

					<SelectControl
						label={__('Axis', 'eighteen73-blocks')}
						value={uiOptions.axis}
						options={[
							{
								label: __('Horizontal', 'eighteen73-blocks'),
								value: 'x',
							},
							{
								label: __('Vertical', 'eighteen73-blocks'),
								value: 'y',
							},
						]}
						onChange={(value) => setOption('axis', value)}
					/>

					<RangeControl
						label={__('Slides to scroll', 'eighteen73-blocks')}
						value={uiOptions.slidesToScroll}
						onChange={(value) =>
							setOption(
								'slidesToScroll',
								value === undefined
									? DEFAULT_EMBLA_CONFIG.options
											.slidesToScroll
									: value
							)
						}
						min={1}
						max={10}
						step={1}
					/>

					<ToggleControl
						label={__('Autoplay', 'eighteen73-blocks')}
						checked={uiAutoplay.active}
						onChange={(value) => setAutoplay('active', value)}
					/>

					{uiAutoplay.active && (
						<SelectControl
							label={__('Autoplay Type', 'eighteen73-blocks')}
							value={uiAutoplay.type}
							options={[
								{
									label: __('Normal', 'eighteen73-blocks'),
									value: 'normal',
								},
								{
									label: __('Scroll', 'eighteen73-blocks'),
									value: 'scroll',
								},
							]}
							onChange={(value) => setAutoplay('type', value)}
						/>
					)}
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
