/**
 * WordPress dependencies
 */
import {
	BlockControls,
	InspectorControls,
	MediaPlaceholder,
	store as blockEditorStore,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
	PanelBody,
	RangeControl,
	TextControl,
	ToggleControl,
	ToolbarButton,
	ToolbarGroup,
	__experimentalToggleGroupControl as ToggleGroupControl, // eslint-disable-line @wordpress/no-unsafe-wp-apis -- Stable in practice since 6.2.
	__experimentalToggleGroupControlOption as ToggleGroupControlOption, // eslint-disable-line @wordpress/no-unsafe-wp-apis
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { gallery as icon } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import {
	CarouselControls,
	selectedSlideIndex,
	useLiveCarousel,
	variantOptions,
} from '../../carousel/editor/live-carousel';
import {
	GalleryMediaUpload,
	useGalleryMedia,
} from '../../components/gallery-media';

const ALLOWED_BLOCKS = ['core/image'];

/**
 * Gallery editor. The grid dims images beyond "Images to show"; the carousel
 * layout is a live carousel, as on the front end.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {string}   props.clientId      Block client ID.
 * @return {Element} Gallery editor.
 */
export default function Edit({ attributes, setAttributes, clientId }) {
	const { lightbox, label, layout, limit, className = '' } = attributes;
	const isCarousel = layout === 'carousel';
	const options = variantOptions(
		'matter/gallery',
		className,
		window.matterEditor?.variants?.['matter/carousel']?.default
	);
	const carousel = useLiveCarousel(options);

	const { imageCount, selectedSlide } = useSelect(
		(select) => ({
			imageCount: select(blockEditorStore).getBlockCount(clientId),
			selectedSlide: selectedSlideIndex(
				select,
				clientId,
				blockEditorStore
			),
		}),
		[clientId]
	);
	const media = useGalleryMedia(clientId);
	const { scrollToSlide } = carousel;

	useEffect(() => {
		if (isCarousel) {
			scrollToSlide(selectedSlide);
		}
	}, [isCarousel, selectedSlide, imageCount, scrollToSlide]);

	const isLimited = !isCarousel && limit > 0 && imageCount > limit;

	const blockProps = useBlockProps({
		className: isCarousel ? 'is-carousel' : 'is-grid',
	});
	const innerBlocksProps = useInnerBlocksProps(
		{
			className: isCarousel
				? 'wp-block-matter-carousel__track'
				: 'wp-block-matter-gallery__items',
		},
		{
			allowedBlocks: ALLOWED_BLOCKS,
			orientation: isCarousel ? 'horizontal' : undefined,
			renderAppender: false,
		}
	);

	if (!imageCount) {
		return (
			<div {...blockProps}>
				<MediaPlaceholder
					icon={icon}
					labels={{
						title: __('Gallery', 'matter'),
						instructions: __(
							'Drag images, upload new ones or choose from your library.',
							'matter'
						),
					}}
					accept="image/*"
					allowedTypes={['image']}
					multiple
					gallery
					onSelect={media.update}
				/>
			</div>
		);
	}

	return (
		<>
			<BlockControls group="other">
				<ToolbarGroup>
					<GalleryMediaUpload
						ids={media.ids}
						onSelect={media.update}
						render={({ open, label: openLabel }) => (
							<ToolbarButton onClick={open}>
								{openLabel}
							</ToolbarButton>
						)}
					/>
				</ToolbarGroup>
			</BlockControls>
			<InspectorControls>
				<PanelBody title={__('Settings', 'matter')}>
					<ToggleGroupControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						isBlock
						label={__('Layout', 'matter')}
						value={layout}
						onChange={(value) => setAttributes({ layout: value })}
					>
						<ToggleGroupControlOption
							value="grid"
							label={__('Grid', 'matter')}
						/>
						<ToggleGroupControlOption
							value="carousel"
							label={__('Carousel', 'matter')}
						/>
					</ToggleGroupControl>
					{!isCarousel && (
						<RangeControl
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							label={__('Images to show', 'matter')}
							help={
								limit > 0
									? __(
											'The rest open from a "View all" button.',
											'matter'
										)
									: __('All images are shown.', 'matter')
							}
							value={limit || undefined}
							min={1}
							max={Math.max(imageCount, 1)}
							allowReset
							resetFallbackValue={0}
							onChange={(value) =>
								setAttributes({ limit: value ?? 0 })
							}
						/>
					)}
					<ToggleControl
						__nextHasNoMarginBottom
						label={__('Open images in a lightbox', 'matter')}
						checked={lightbox}
						onChange={(value) => setAttributes({ lightbox: value })}
					/>
					{isCarousel && (
						<TextControl
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							label={__('Name', 'matter')}
							help={__(
								'Describes the carousel to screen readers.',
								'matter'
							)}
							value={label}
							onChange={(value) =>
								setAttributes({ label: value })
							}
						/>
					)}
				</PanelBody>
			</InspectorControls>
			<div {...blockProps}>
				{isCarousel ? (
					<div className="wp-block-matter-gallery__items wp-block-matter-carousel is-initialised">
						<div
							className="wp-block-matter-carousel__viewport"
							ref={carousel.ref}
						>
							<div {...innerBlocksProps} />
						</div>
						<CarouselControls
							carousel={carousel}
							options={options}
						/>
					</div>
				) : (
					<>
						{isLimited && (
							<style>
								{`#block-${clientId} .wp-block-matter-gallery__items > [data-block]:nth-child(n + ${
									limit + 1
								}):not(.is-selected, .has-child-selected) { display: none; }`}
							</style>
						)}
						<div {...innerBlocksProps} />
						{isLimited && (
							<button
								type="button"
								className="wp-block-matter-gallery__more"
								aria-disabled="true"
							>
								{sprintf(
									/* translators: %d: number of images */
									_n(
										'View all %d image',
										'View all %d images',
										imageCount,
										'matter'
									),
									imageCount
								)}
							</button>
						)}
					</>
				)}
			</div>
		</>
	);
}
