/**
 * WordPress dependencies
 */
import {
	BlockControls,
	InspectorControls,
	MediaPlaceholder,
	MediaUpload,
	MediaUploadCheck,
	store as blockEditorStore,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	ToolbarButton,
	ToolbarGroup,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { gallery as icon } from '@wordpress/icons';

const ALLOWED_BLOCKS = ['core/image'];

const toImageBlock = (image) =>
	createBlock('core/image', {
		id: image.id,
		url: image.url,
		alt: image.alt,
		sizeSlug: 'large',
	});

export default function Edit({ attributes, setAttributes, clientId }) {
	const { lightbox, label, className = '' } = attributes;
	const isCarousel = className.includes('is-style-carousel');

	const imageCount = useSelect(
		(select) => select(blockEditorStore).getBlockCount(clientId),
		[clientId]
	);
	const { replaceInnerBlocks, insertBlocks } = useDispatch(blockEditorStore);

	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'wp-block-matter-gallery__items' },
		{
			allowedBlocks: ALLOWED_BLOCKS,
			orientation: isCarousel ? 'horizontal' : undefined,
		}
	);

	const addImages = (images) =>
		insertBlocks(images.map(toImageBlock), imageCount, clientId, false);

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
					onSelect={(images) =>
						replaceInnerBlocks(
							clientId,
							images.map(toImageBlock),
							false
						)
					}
				/>
			</div>
		);
	}

	return (
		<>
			<BlockControls>
				<ToolbarGroup>
					<MediaUploadCheck>
						<MediaUpload
							allowedTypes={['image']}
							multiple
							gallery={false}
							onSelect={addImages}
							render={({ open }) => (
								<ToolbarButton onClick={open}>
									{__('Add images', 'matter')}
								</ToolbarButton>
							)}
						/>
					</MediaUploadCheck>
				</ToolbarGroup>
			</BlockControls>
			<InspectorControls>
				<PanelBody title={__('Settings', 'matter')}>
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
				<div {...innerBlocksProps} />
			</div>
		</>
	);
}
