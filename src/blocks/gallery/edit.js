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
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { gallery as icon } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import {
	ToggleGroupControl,
	ToggleGroupControlOption,
} from '../../components/compat';
import {
	CarouselFrame,
	carouselClasses,
	selectedSlideIndex,
	useLiveCarousel,
	variantOptions,
} from '../../carousel/editor/live-carousel';
import {
	AspectRatioControl,
	aspectRatioStyle,
	useAspectRatios,
} from '../../components/aspect-ratio';
import {
	GalleryMediaUpload,
	useGalleryMedia,
} from '../../components/gallery-media';

const ALLOWED_BLOCKS = ['core/image'];

/**
 * How many images a limited grid shows: whole rows at the number of columns
 * that fit (as the front end's view.js), or the limit if under one row.
 *
 * @param {Object} ref   Ref to the grid.
 * @param {number} limit "Images to show" (0 = all).
 * @param {string} key   Changes when the layout may have.
 * @return {number} Images to show.
 */
function useVisibleCount(ref, limit, key) {
	const [columns, setColumns] = useState(1);

	useEffect(() => {
		const grid = ref.current;

		if (!limit || !grid) {
			return;
		}

		const view = grid.ownerDocument.defaultView;
		const update = () =>
			setColumns(
				view
					.getComputedStyle(grid)
					.gridTemplateColumns.split(' ')
					.filter(Boolean).length || 1
			);
		const observer = new view.ResizeObserver(update);

		update();
		observer.observe(grid);

		return () => observer.disconnect();
	}, [ref, limit, key]);

	return Math.floor(limit / columns) * columns || limit;
}

/**
 * Gallery editor, as on the front end: the grid hides images beyond "Images
 * to show" (in full rows at the current number of columns); the carousel
 * layout is a live carousel. Columns and the images' aspect ratio are chosen
 * from the theme's options.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {string}   props.clientId      Block client ID.
 * @return {Element} Gallery editor.
 */
export default function Edit({ attributes, setAttributes, clientId }) {
	const {
		lightbox,
		captions,
		label,
		layout,
		limit,
		columns,
		aspectRatio,
		className = '',
	} = attributes;
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

	// The theme's column choices and default crop (variant options).
	const columnChoices = (options.columns ?? []).map(Number);
	const currentColumns = columns || Number(options.defaultColumns) || 0;
	const hasColumns = !isCarousel && columnChoices.includes(currentColumns);
	// "Images to show" counts in whole rows.
	const rowSize = hasColumns ? currentColumns : 1;

	// As on the front end, show full rows at the number of columns that fit.
	const itemsRef = useRef();
	const visible = useVisibleCount(
		itemsRef,
		isCarousel ? 0 : limit,
		`${currentColumns}-${imageCount}`
	);
	const isLimited = !isCarousel && limit > 0 && imageCount > visible;

	const aspectRatios = useAspectRatios();
	const currentRatio = aspectRatio || options.aspectRatio || 'auto';
	const currentCaptions = captions || options.captions || 'tooltip';

	const blockProps = useBlockProps({
		className: [
			isCarousel ? 'is-carousel' : 'is-grid',
			hasColumns && `has-columns has-columns-${currentColumns}`,
			`has-captions-${currentCaptions}`,
		]
			.filter(Boolean)
			.join(' '),
		style: aspectRatioStyle(currentRatio, aspectRatios),
	});
	const innerBlocksProps = useInnerBlocksProps(
		{
			ref: itemsRef,
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
					{!isCarousel && columnChoices.length > 1 && (
						<ToggleGroupControl
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							isBlock
							label={__('Columns', 'matter')}
							help={__(
								'Fewer columns show where there is less room.',
								'matter'
							)}
							value={currentColumns}
							onChange={(value) => {
								const count = Number(value);

								// Keep "Images to show" to whole rows.
								setAttributes({
									columns: count,
									limit: limit
										? Math.max(
												count,
												Math.round(limit / count) *
													count
											)
										: 0,
								});
							}}
						>
							{columnChoices.map((count) => (
								<ToggleGroupControlOption
									key={count}
									value={count}
									label={String(count)}
								/>
							))}
						</ToggleGroupControl>
					)}
					{!isCarousel && (
						<RangeControl
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							label={__('Images to show', 'matter')}
							help={
								limit > 0
									? __(
											'Shown in full rows; the rest open from a "View all" button.',
											'matter'
										)
									: __('All images are shown.', 'matter')
							}
							value={limit || undefined}
							min={rowSize}
							step={rowSize}
							max={Math.max(imageCount, rowSize)}
							allowReset
							resetFallbackValue={0}
							onChange={(value) =>
								setAttributes({ limit: value ?? 0 })
							}
						/>
					)}
					<AspectRatioControl
						value={currentRatio}
						presets={aspectRatios}
						onChange={(value) =>
							setAttributes({ aspectRatio: value })
						}
					/>
					<ToggleGroupControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						isBlock
						label={__('Captions', 'matter')}
						help={
							{
								tooltip: __(
									'Behind an info button on each image.',
									'matter'
								),
								overlay: __(
									'Over the bottom of each image.',
									'matter'
								),
								hidden: __(
									'Not shown on the page or in the lightbox.',
									'matter'
								),
							}[currentCaptions]
						}
						value={currentCaptions}
						onChange={(value) => setAttributes({ captions: value })}
					>
						<ToggleGroupControlOption
							value="tooltip"
							label={__('Info button', 'matter')}
						/>
						<ToggleGroupControlOption
							value="overlay"
							label={__('Over image', 'matter')}
						/>
						<ToggleGroupControlOption
							value="hidden"
							label={__('Hidden', 'matter')}
						/>
					</ToggleGroupControl>
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
					<div
						className={`wp-block-matter-gallery__items wp-block-matter-carousel ${carouselClasses(
							carousel
						)}`}
					>
						<CarouselFrame
							carousel={carousel}
							options={options}
							thumbnails={media.urls}
							canExpand={lightbox}
						>
							<div
								className="wp-block-matter-carousel__viewport"
								ref={carousel.ref}
							>
								<div {...innerBlocksProps} />
							</div>
						</CarouselFrame>
					</div>
				) : (
					<>
						{isLimited && (
							<style>
								{/* Counting blocks only: a selected image adds a measuring element. */}
								{`#block-${clientId} .wp-block-matter-gallery__items > [data-block]:nth-child(n + ${
									visible + 1
								} of [data-block]):not(.is-selected, .has-child-selected) { display: none; }`}
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
