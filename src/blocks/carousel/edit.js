/**
 * WordPress dependencies
 */
import {
	BlockControls,
	InspectorControls,
	store as blockEditorStore,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToolbarButton,
	ToolbarGroup,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useEffect, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import {
	CarouselControls,
	selectedSlideIndex,
	useLiveCarousel,
	variantOptions,
} from '../../carousel/editor/live-carousel';
import { useAddSlide } from '../../carousel/editor/use-add-slide';
import {
	AspectRatioControl,
	aspectRatioStyle,
	useAspectRatios,
} from '../../components/aspect-ratio';
import {
	GalleryMediaUpload,
	useGalleryMedia,
} from '../../components/gallery-media';
import SlidePicker, { themeSlideTypes } from './slide-picker';

// With theme slide types, slides are limited to them, images and queries.
const allowedSlides = () => {
	const types = Object.keys(themeSlideTypes());

	return types.length
		? [
				...new Set([
					'core/image',
					'core/query',
					'woocommerce/product-collection',
					...types,
				]),
			]
		: undefined;
};

/**
 * A live carousel: the variant (block style) decides behaviour and the theme's
 * CSS decides slide widths, as on the front end. Slides can't be dragged in
 * the editor; use the arrows, dots or select a block to move.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {string}   props.clientId      Block client ID.
 * @return {Element} Carousel editor.
 */
export default function Edit({ attributes, setAttributes, clientId }) {
	const options = variantOptions('matter/carousel', attributes.className);
	const carousel = useLiveCarousel(options);

	const selectedSlide = useSelect(
		(select) => selectedSlideIndex(select, clientId, blockEditorStore),
		[clientId]
	);
	const { lastSlide, slideCount, addSlide } = useAddSlide(clientId);
	const { scrollToSlide } = carousel;

	// Bring the slide being edited into view.
	useEffect(() => {
		scrollToSlide(selectedSlide);
	}, [selectedSlide, slideCount, scrollToSlide]);

	const isQuery = lastSlide?.name === 'core/query';

	// Image-only carousels (e.g. a slideshow) are managed like a gallery.
	const media = useGalleryMedia(clientId);
	const isImages = !isQuery && media.isImageOnly;

	// Image slides share an aspect ratio (the variant's by default).
	const aspectRatios = useAspectRatios();
	const currentRatio =
		attributes.aspectRatio || options.aspectRatio || 'auto';
	const ratioStyle = isImages
		? aspectRatioStyle(currentRatio, aspectRatios)
		: undefined;

	const blockProps = useBlockProps({
		className: [
			'is-initialised',
			carousel.isQuery && 'is-query',
			ratioStyle && 'has-image-aspect-ratio',
		]
			.filter(Boolean)
			.join(' '),
		style: ratioStyle,
	});
	const allowedBlocks = useMemo(allowedSlides, []);
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'wp-block-matter-carousel__track' },
		{
			allowedBlocks,
			orientation: 'horizontal',
			renderAppender: false,
		}
	);

	// A new carousel: choose what the slides will be.
	if (!slideCount) {
		return (
			<div {...blockProps}>
				<SlidePicker
					clientId={clientId}
					setAttributes={setAttributes}
					onImages={media.update}
				/>
			</div>
		);
	}

	return (
		<>
			{isImages && (
				<BlockControls group="other">
					<GalleryMediaUpload
						ids={media.ids}
						onSelect={media.update}
						render={({ open, label }) => (
							<ToolbarButton onClick={open}>
								{label}
							</ToolbarButton>
						)}
					/>
				</BlockControls>
			)}
			{!isQuery && !isImages && (
				<BlockControls group="block">
					<ToolbarGroup>
						<ToolbarButton onClick={addSlide}>
							{__('Add slide', 'matter')}
						</ToolbarButton>
					</ToolbarGroup>
				</BlockControls>
			)}
			<InspectorControls>
				<PanelBody title={__('Settings', 'matter')}>
					<TextControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={__('Name', 'matter')}
						help={__(
							'Describes the carousel to screen readers, e.g. "Customer stories".',
							'matter'
						)}
						value={attributes.label}
						onChange={(label) => setAttributes({ label })}
					/>
					{isImages && (
						<AspectRatioControl
							value={currentRatio}
							presets={aspectRatios}
							onChange={(value) =>
								setAttributes({ aspectRatio: value })
							}
						/>
					)}
				</PanelBody>
			</InspectorControls>
			<div {...blockProps}>
				<div
					className="wp-block-matter-carousel__viewport"
					ref={carousel.ref}
				>
					<div {...innerBlocksProps} />
				</div>
				<CarouselControls carousel={carousel} options={options} />
			</div>
		</>
	);
}
