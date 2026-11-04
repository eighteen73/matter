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
import { createBlock } from '@wordpress/blocks';
import {
	Button,
	PanelBody,
	TextControl,
	ToolbarButton,
	ToolbarGroup,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { plus } from '@wordpress/icons';

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

const TEMPLATE = [['core/image'], ['core/image'], ['core/image']];

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

	const { lastSlide, slideCount, selectedSlide, isEditing } = useSelect(
		(select) => {
			const { getBlocks, isBlockSelected, hasSelectedInnerBlock } =
				select(blockEditorStore);
			const blocks = getBlocks(clientId);

			return {
				// Editor-only buttons show while the carousel is being edited.
				isEditing:
					isBlockSelected(clientId) ||
					hasSelectedInnerBlock(clientId, true),
				lastSlide: blocks[blocks.length - 1],
				slideCount: blocks.length,
				selectedSlide: selectedSlideIndex(
					select,
					clientId,
					blockEditorStore
				),
			};
		},
		[clientId]
	);
	const { insertBlock } = useDispatch(blockEditorStore);
	const { scrollToSlide } = carousel;

	// Bring the slide being edited into view.
	useEffect(() => {
		scrollToSlide(selectedSlide);
	}, [selectedSlide, slideCount, scrollToSlide]);

	const isQuery = lastSlide?.name === 'core/query';

	// Image-only carousels (e.g. a slideshow) are managed like a gallery.
	const media = useGalleryMedia(clientId);
	const isImages = !isQuery && media.isImageOnly;

	// A new, empty slide like the last one (e.g. another card).
	const addSlide = () =>
		insertBlock(
			createBlock(lastSlide?.name ?? 'core/image'),
			slideCount,
			clientId
		);

	const blockProps = useBlockProps({
		className: ['is-initialised', carousel.isQuery && 'is-query']
			.filter(Boolean)
			.join(' '),
	});
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'wp-block-matter-carousel__track' },
		{
			template: TEMPLATE,
			orientation: 'horizontal',
			renderAppender: false,
		}
	);

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
						<ToolbarButton icon={plus} onClick={addSlide}>
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
				{!isQuery && isEditing && (
					<div className="matter-carousel-editor__actions">
						{isImages ? (
							<GalleryMediaUpload
								ids={media.ids}
								onSelect={media.update}
								render={({ open, label }) => (
									<Button
										variant="secondary"
										size="small"
										onClick={open}
									>
										{label}
									</Button>
								)}
							/>
						) : (
							<Button
								variant="secondary"
								size="small"
								icon={plus}
								onClick={addSlide}
							>
								{__('Add slide', 'matter')}
							</Button>
						)}
					</div>
				)}
			</div>
		</>
	);
}
