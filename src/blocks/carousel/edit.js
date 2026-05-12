import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { useEffect, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import useEmblaCarousel from 'embla-carousel-react';
import SingleBlockTypeAppender from '../../components/single-block-type-appender';
import {
	PanelBody,
	RangeControl,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';

import {
	addDotBtnsAndClickHandlers,
	addPrevNextBtnsClickHandlers,
} from '../../utils/embla';
import { buildMergedEmblaOptions } from '../../utils/embla-carousel-options';
import AdvancedControls from './components/advanced-controls';

//import './editor.scss';

const DEFAULT_CAROUSEL_OPTIONS = {
	loop: false,
	axis: 'x',
	slidesToScroll: 1,
};

export default function Edit({
	clientId,
	attributes: {
		options,
		autoplay,
		advancedCarouselConfig,
		advancedCarouselConfigMerge,
	},
	setAttributes,
	isSelected,
}) {
	const resolvedOptions = {
		...DEFAULT_CAROUSEL_OPTIONS,
		...(options && typeof options === 'object' ? options : {}),
	};

	const mergeWithUi = advancedCarouselConfigMerge === true;

	const finalEmblaOptions = useMemo(
		() =>
			buildMergedEmblaOptions({
				baseOptions: resolvedOptions,
				advancedOptions:
					advancedCarouselConfig &&
					typeof advancedCarouselConfig === 'object'
						? advancedCarouselConfig
						: {},
				mergeWithBase: mergeWithUi,
			}),
		[resolvedOptions, advancedCarouselConfig, mergeWithUi]
	);

	const setOption = (key, value) => {
		setAttributes({
			options: {
				...resolvedOptions,
				[key]: value,
			},
		});
	};
	const blockProps = useBlockProps({ className: 'embla' });
	const { children, ...innerBlocksProps } = useInnerBlocksProps(blockProps, {
		orientation: 'vertical',
		template: [
			['eighteen73-blocks/carousel-viewport'],
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

	const [emblaRef, emblaApi] = useEmblaCarousel({
		...finalEmblaOptions,
		container: getContainer(),
		slides: ':scope > :not(.block-list-appender)',
	});

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

	useEffect(() => {
		if (!emblaApi) return;

		setAttributes({ emblaApi });
	}, [emblaApi, setAttributes]);

	const isInnerBlockSelected = useSelect((select) =>
		select('core/block-editor').hasSelectedInnerBlock(clientId, true)
	);

	return (
		<>
			<InspectorControls group="settings">
				<PanelBody title={__('Settings', 'eighteen73-blocks')}>
					<ToggleControl
						label={__('Loop', 'eighteen73-blocks')}
						checked={resolvedOptions.loop}
						onChange={(value) => setOption('loop', value)}
					/>

					<SelectControl
						label={__('Axis', 'eighteen73-blocks')}
						value={resolvedOptions.axis}
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
						value={resolvedOptions.slidesToScroll}
						onChange={(value) =>
							setOption(
								'slidesToScroll',
								value === undefined
									? DEFAULT_CAROUSEL_OPTIONS.slidesToScroll
									: value
							)
						}
						min={1}
						max={10}
						step={1}
					/>

					<ToggleControl
						label={__('Autoplay', 'eighteen73-blocks')}
						checked={autoplay}
						onChange={(value) => setAttributes({ autoplay: value })}
					/>
				</PanelBody>
			</InspectorControls>

			<InspectorControls group="advanced">
				<AdvancedControls
					advancedCarouselConfig={advancedCarouselConfig}
					advancedCarouselConfigMerge={advancedCarouselConfigMerge}
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
