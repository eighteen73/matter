import clsx from 'clsx';
import { createBlock } from '@wordpress/blocks';
import {
	InspectorControls,
	MediaPlaceholder,
	MediaReplaceFlow,
	BlockControls,
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
	useSettings,
} from '@wordpress/block-editor';
import {
	SelectControl,
	ToggleControl,
	RangeControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControl as ToggleGroupControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanel as ToolsPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { useMemo } from '@wordpress/element';
import { __, _x, sprintf } from '@wordpress/i18n';
import { useSelect, useDispatch } from '@wordpress/data';
import { createBlobURL } from '@wordpress/blob';
import { store as noticesStore } from '@wordpress/notices';

import { normalizeCarouselConfig } from '../../utils/carousel/config';
import { Gallery as GalleryIcon } from '../../components/icons/gallery';

const ALLOWED_MEDIA_TYPES = ['image'];
const DEFAULT_BLOCK = { name: 'core/image' };
const EMPTY_ARRAY = [];
const PLACEHOLDER_TEXT = __(
	'Drag and drop images, upload, or choose from your library.',
	'matter'
);

/**
 * @param {Object} props Block props.
 */
export default function Edit(props) {
	const {
		attributes,
		setAttributes,
		clientId,
		className,
		__unstableLayoutClassNames: layoutClassNames,
	} = props;

	const {
		type,
		aspectRatio,
		sizeSlug,
		thumbnailSizeSlug,
		lightbox,
		lightboxSizeSlug,
		imageLimit,
		includeThumbnails,
		thumbnailAspectRatio,
		imageCrop,
		carouselConfig,
	} = attributes;

	const isCarousel = type === 'carousel';
	const isGrid = !isCarousel;
	const hasImageLimit = isGrid && imageLimit > 0;
	const lightboxEnabled = lightbox || hasImageLimit;

	const [defaultRatios, themeRatios, showDefaultRatios] = useSettings(
		'dimensions.aspectRatios.default',
		'dimensions.aspectRatios.theme',
		'dimensions.defaultAspectRatios'
	);

	const { replaceInnerBlocks, updateBlockAttributes, selectBlock } =
		useDispatch(blockEditorStore);
	const { createErrorNotice, createSuccessNotice } =
		useDispatch(noticesStore);

	const { getBlock, getSettings, innerBlockImages } = useSelect(
		(select) => {
			const { getBlock: _getBlock, getSettings: _getSettings } =
				select(blockEditorStore);

			return {
				getBlock: _getBlock,
				getSettings: _getSettings,
				innerBlockImages:
					_getBlock(clientId)?.innerBlocks ?? EMPTY_ARRAY,
			};
		},
		[clientId]
	);

	const images = useMemo(
		() =>
			innerBlockImages.map((block) => ({
				clientId: block.clientId,
				id: block.attributes.id,
				url: block.attributes.url,
				attributes: block.attributes,
			})),
		[innerBlockImages]
	);

	const hasImages = images.length > 0;
	const hasImageIds = hasImages && images.some((image) => !!image.id);

	const imageSizeOptions = useMemo(() => {
		const settings = getSettings();
		const sizes = settings?.imageSizes ?? [];
		return sizes.map((size) => ({
			value: size.slug,
			label: size.name,
		}));
	}, [getSettings]);

	const aspectRatioOptions = useMemo(() => {
		const themeOptions =
			themeRatios?.map(({ name, ratio }) => ({
				label: name,
				value: ratio,
			})) ?? [];
		const defaultOptions =
			defaultRatios?.map(({ name, ratio }) => ({
				label: name,
				value: ratio,
			})) ?? [];

		return [
			{
				label: _x(
					'Original',
					'Aspect ratio option for dimensions control',
					'matter'
				),
				value: 'auto',
			},
			...(showDefaultRatios ? defaultOptions : []),
			...themeOptions,
		];
	}, [defaultRatios, themeRatios, showDefaultRatios]);

	const resolvedCarouselConfig = useMemo(
		() => normalizeCarouselConfig(carouselConfig),
		[carouselConfig]
	);

	const setFadeActive = (active) => {
		setAttributes({
			carouselConfig: {
				...resolvedCarouselConfig,
				plugins: {
					...resolvedCarouselConfig.plugins,
					fade: {
						...(resolvedCarouselConfig.plugins?.fade || {}),
						active,
					},
				},
			},
		});
	};

	const isValidFileType = (file) => {
		const mediaTypeSelector = file.type;
		return (
			ALLOWED_MEDIA_TYPES.some(
				(mediaType) => mediaTypeSelector?.indexOf(mediaType) === 0
			) || file.blob
		);
	};

	const updateImages = (selectedImages) => {
		const newFileUploads =
			Object.prototype.toString.call(selectedImages) ===
			'[object FileList]';

		const imageArray = newFileUploads
			? Array.from(selectedImages).map((file) => {
					if (!file.url) {
						return { blob: createBlobURL(file) };
					}
					return file;
				})
			: selectedImages;

		if (!imageArray.every(isValidFileType)) {
			createErrorNotice(
				__(
					'If uploading to a gallery all files need to be image formats',
					'matter'
				),
				{ id: 'matter-gallery-upload-invalid-file', type: 'snackbar' }
			);
			return;
		}

		const processedImages = imageArray
			.filter((file) => file.url || isValidFileType(file))
			.map((file) => {
				if (!file.url) {
					return {
						blob: file.blob || createBlobURL(file),
					};
				}
				return file;
			});

		const newOrderMap = processedImages.reduce(
			(result, image, index) => ((result[image.id] = index), result),
			{}
		);

		const existingImageBlocks = !newFileUploads
			? innerBlockImages.filter((block) =>
					processedImages.find(
						(img) => img.id === block.attributes.id
					)
				)
			: innerBlockImages;

		const newImageList = processedImages.filter(
			(img) =>
				!existingImageBlocks.find(
					(existingImg) => img.id === existingImg.attributes.id
				)
		);

		const newBlocks = newImageList.map((image) =>
			createBlock('core/image', {
				id: image.id,
				blob: image.blob,
				url: image.url,
				caption: image.caption,
				alt: image.alt,
				sizeSlug,
				aspectRatio: aspectRatio === 'auto' ? undefined : aspectRatio,
				lightbox: { enabled: false },
				linkDestination: 'none',
			})
		);

		replaceInnerBlocks(
			clientId,
			existingImageBlocks
				.concat(newBlocks)
				.sort(
					(a, b) =>
						newOrderMap[a.attributes.id] -
						newOrderMap[b.attributes.id]
				)
		);

		if (newBlocks?.length > 0) {
			selectBlock(newBlocks[0].clientId);
		}
	};

	const onUploadError = (message) => {
		createErrorNotice(message, { type: 'snackbar' });
	};

	const setAspectRatio = (value) => {
		setAttributes({ aspectRatio: value });

		const changedAttributes = {};
		const blocks = [];

		getBlock(clientId).innerBlocks.forEach((block) => {
			blocks.push(block.clientId);
			changedAttributes[block.clientId] = {
				aspectRatio: value === 'auto' ? undefined : value,
			};
		});

		updateBlockAttributes(blocks, changedAttributes, true);

		const aspectRatioText = aspectRatioOptions.find(
			(option) => option.value === value
		);

		createSuccessNotice(
			sprintf(
				/* translators: %s: aspect ratio setting */
				__('All gallery images updated to aspect ratio: %s', 'matter'),
				aspectRatioText?.label || value
			),
			{
				id: 'matter-gallery-attributes-aspectRatio',
				type: 'snackbar',
			}
		);
	};

	const updateImagesSize = (newSizeSlug) => {
		setAttributes({ sizeSlug: newSizeSlug });

		const changedAttributes = {};
		const blocks = [];

		getBlock(clientId).innerBlocks.forEach((block) => {
			blocks.push(block.clientId);
			changedAttributes[block.clientId] = {
				sizeSlug: newSizeSlug,
			};
		});

		updateBlockAttributes(blocks, changedAttributes, true);

		const imageSize = imageSizeOptions.find(
			(size) => size.value === newSizeSlug
		);

		createSuccessNotice(
			sprintf(
				/* translators: %s: image size settings */
				__('All gallery image sizes updated to: %s', 'matter'),
				imageSize?.label ?? newSizeSlug
			),
			{
				id: 'matter-gallery-attributes-sizeSlug',
				type: 'snackbar',
			}
		);
	};

	const blockProps = useBlockProps({
		className: clsx(className, 'matter-gallery', {
			'matter-gallery--grid': isGrid,
			'matter-gallery--carousel': isCarousel,
			'is-cropped':
				isGrid &&
				(imageCrop || (aspectRatio && aspectRatio !== 'auto')),
			[layoutClassNames]: isGrid && layoutClassNames,
		}),
	});

	const innerBlocksProps = useInnerBlocksProps(
		isCarousel
			? {
					className: 'embla__container matter-gallery__slides',
				}
			: blockProps,
		{
			defaultBlock: DEFAULT_BLOCK,
			directInsert: true,
			orientation: 'horizontal',
			renderAppender: false,
			allowedBlocks: ['core/image'],
		}
	);

	const imagesUploading = images.some(
		(img) => !img.id && img.url?.indexOf('blob:') === 0
	);

	if (!hasImages) {
		return (
			<figure {...blockProps}>
				{innerBlocksProps.children}
				<MediaPlaceholder
					icon={GalleryIcon}
					labels={{
						title: __('Gallery', 'matter'),
						instructions: PLACEHOLDER_TEXT,
					}}
					onSelect={updateImages}
					accept="image/*"
					allowedTypes={ALLOWED_MEDIA_TYPES}
					multiple
					gallery
					onError={onUploadError}
					disableMediaButtons={imagesUploading}
				/>
			</figure>
		);
	}

	const fadeActive = !!resolvedCarouselConfig.plugins?.fade?.active;
	const showCropControl = isGrid && (!aspectRatio || aspectRatio === 'auto');
	const showThumbnailControls =
		lightboxEnabled || (isCarousel && includeThumbnails);

	return (
		<>
			<InspectorControls>
				<ToolsPanel
					label={__('Settings', 'matter')}
					resetAll={() => {
						setAttributes({
							type: 'grid',
							aspectRatio: 'auto',
							sizeSlug: 'large',
							thumbnailSizeSlug: 'thumbnail',
							lightbox: false,
							lightboxSizeSlug: 'large',
							imageLimit: 0,
							includeThumbnails: false,
							thumbnailAspectRatio: '1',
							imageCrop: true,
							carouselConfig: {
								...resolvedCarouselConfig,
								plugins: {
									...resolvedCarouselConfig.plugins,
									fade: {
										...(resolvedCarouselConfig.plugins
											?.fade || {}),
										active: false,
									},
								},
							},
						});
						setAspectRatio('auto');
						if (sizeSlug !== 'large') {
							updateImagesSize('large');
						}
					}}
				>
					<ToolsPanelItem
						hasValue={() => type !== 'grid'}
						label={__('Type', 'matter')}
						onDeselect={() => setAttributes({ type: 'grid' })}
						isShownByDefault
					>
						<ToggleGroupControl
							label={__('Type', 'matter')}
							value={type}
							onChange={(value) => setAttributes({ type: value })}
							isBlock
							__nextHasNoMarginBottom
							__next40pxDefaultSize
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
					</ToolsPanelItem>

					{isCarousel && (
						<>
							<ToolsPanelItem
								hasValue={() => fadeActive}
								label={__('Transition', 'matter')}
								onDeselect={() => setFadeActive(false)}
								isShownByDefault
							>
								<ToggleGroupControl
									label={__('Transition', 'matter')}
									value={fadeActive ? 'fade' : 'slide'}
									onChange={(value) =>
										setFadeActive(value === 'fade')
									}
									isBlock
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								>
									<ToggleGroupControlOption
										value="slide"
										label={__('Slide', 'matter')}
									/>
									<ToggleGroupControlOption
										value="fade"
										label={__('Fade', 'matter')}
									/>
								</ToggleGroupControl>
							</ToolsPanelItem>

							<ToolsPanelItem
								hasValue={() => !!includeThumbnails}
								label={__(
									'Enable carousel thumbnails',
									'matter'
								)}
								onDeselect={() =>
									setAttributes({ includeThumbnails: false })
								}
								isShownByDefault
							>
								<ToggleControl
									label={__(
										'Enable carousel thumbnails',
										'matter'
									)}
									checked={!!includeThumbnails}
									onChange={(value) =>
										setAttributes({
											includeThumbnails: value,
										})
									}
									__nextHasNoMarginBottom
								/>
							</ToolsPanelItem>
						</>
					)}

					{imageSizeOptions.length > 0 && (
						<ToolsPanelItem
							hasValue={() => sizeSlug !== 'large'}
							label={__('Image size', 'matter')}
							onDeselect={() => updateImagesSize('large')}
							isShownByDefault
						>
							<SelectControl
								label={__('Image size', 'matter')}
								value={sizeSlug}
								options={imageSizeOptions}
								onChange={updateImagesSize}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
					)}

					{aspectRatioOptions.length > 1 && (
						<ToolsPanelItem
							hasValue={() =>
								!!aspectRatio && aspectRatio !== 'auto'
							}
							label={__('Aspect ratio', 'matter')}
							onDeselect={() => setAspectRatio('auto')}
							isShownByDefault
						>
							<SelectControl
								label={__('Aspect ratio', 'matter')}
								value={aspectRatio || 'auto'}
								options={aspectRatioOptions}
								onChange={setAspectRatio}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
					)}

					{showCropControl && (
						<ToolsPanelItem
							hasValue={() => !imageCrop}
							label={__('Crop images to fill', 'matter')}
							onDeselect={() =>
								setAttributes({ imageCrop: true })
							}
							isShownByDefault
						>
							<ToggleControl
								label={__('Crop images to fill', 'matter')}
								checked={!!imageCrop}
								onChange={(value) =>
									setAttributes({ imageCrop: value })
								}
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
					)}

					{isGrid && (
						<ToolsPanelItem
							hasValue={() => imageLimit > 0}
							label={__('Image limit', 'matter')}
							onDeselect={() => setAttributes({ imageLimit: 0 })}
							isShownByDefault
						>
							<RangeControl
								label={__('Image limit', 'matter')}
								help={__(
									'Limit visible images in the grid. Remaining images open in the lightbox. 0 shows all.',
									'matter'
								)}
								value={imageLimit}
								onChange={(value) => {
									const nextLimit = value ?? 0;
									setAttributes({
										imageLimit: nextLimit,
										...(nextLimit > 0
											? { lightbox: true }
											: {}),
									});
								}}
								min={0}
								max={Math.max(images.length, 12)}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
					)}

					<ToolsPanelItem
						hasValue={() => !!lightbox}
						label={__('Enable lightbox', 'matter')}
						onDeselect={() =>
							!hasImageLimit && setAttributes({ lightbox: false })
						}
						isShownByDefault
					>
						<ToggleControl
							label={__('Enable lightbox', 'matter')}
							checked={lightboxEnabled}
							disabled={hasImageLimit}
							onChange={(value) =>
								setAttributes({ lightbox: value })
							}
							help={
								hasImageLimit
									? __(
											'Required when an image limit is set.',
											'matter'
										)
									: __(
											'Opens images in a lightbox with thumbnails.',
											'matter'
										)
							}
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>

					{lightboxEnabled && imageSizeOptions.length > 0 && (
						<ToolsPanelItem
							hasValue={() => lightboxSizeSlug !== 'large'}
							label={__('Lightbox image size', 'matter')}
							onDeselect={() =>
								setAttributes({ lightboxSizeSlug: 'large' })
							}
							isShownByDefault
						>
							<SelectControl
								label={__('Lightbox image size', 'matter')}
								value={lightboxSizeSlug}
								options={imageSizeOptions}
								onChange={(value) =>
									setAttributes({ lightboxSizeSlug: value })
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
					)}

					{showThumbnailControls && imageSizeOptions.length > 0 && (
						<ToolsPanelItem
							hasValue={() => thumbnailSizeSlug !== 'thumbnail'}
							label={__('Thumbnail size', 'matter')}
							onDeselect={() =>
								setAttributes({
									thumbnailSizeSlug: 'thumbnail',
								})
							}
							isShownByDefault
						>
							<SelectControl
								label={__('Thumbnail size', 'matter')}
								help={
									isCarousel
										? __(
												'Lightbox and carousel thumbnails.',
												'matter'
											)
										: undefined
								}
								value={thumbnailSizeSlug}
								options={imageSizeOptions}
								onChange={(value) =>
									setAttributes({
										thumbnailSizeSlug: value,
									})
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
					)}

					{showThumbnailControls && aspectRatioOptions.length > 1 && (
						<ToolsPanelItem
							hasValue={() =>
								thumbnailAspectRatio &&
								thumbnailAspectRatio !== '1'
							}
							label={__('Thumbnail aspect ratio', 'matter')}
							onDeselect={() =>
								setAttributes({
									thumbnailAspectRatio: '1',
								})
							}
							isShownByDefault
						>
							<SelectControl
								label={__('Thumbnail aspect ratio', 'matter')}
								help={
									isCarousel
										? __(
												'Lightbox and carousel thumbnails.',
												'matter'
											)
										: undefined
								}
								value={thumbnailAspectRatio || '1'}
								options={aspectRatioOptions.filter(
									(option) => option.value !== 'auto'
								)}
								onChange={(value) =>
									setAttributes({
										thumbnailAspectRatio: value,
									})
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
					)}
				</ToolsPanel>
			</InspectorControls>

			{hasImages && (
				<BlockControls group="other">
					<MediaReplaceFlow
						mediaIds={images
							.filter((image) => image.id)
							.map((image) => image.id)}
						allowedTypes={ALLOWED_MEDIA_TYPES}
						accept="image/*"
						onSelect={updateImages}
						name={__('Edit gallery', 'matter')}
						onError={onUploadError}
						addToGallery={hasImageIds}
					/>
				</BlockControls>
			)}

			{isCarousel ? (
				<figure {...blockProps}>
					<div className="embla matter-gallery__carousel">
						<div className="embla__viewport">
							<div {...innerBlocksProps} />
						</div>
						{includeThumbnails && (
							<div className="matter-gallery__thumbs embla__thumbs">
								<p className="matter-gallery__thumbs-note">
									{__(
										'Thumbnails are generated on the front end.',
										'matter'
									)}
								</p>
							</div>
						)}
					</div>
					{hasImageLimit && (
						<div className="matter-gallery__view-all">
							{__('View gallery', 'matter')}
						</div>
					)}
				</figure>
			) : (
				<figure {...innerBlocksProps}>
					{hasImageLimit && images.length > imageLimit && (
						<div className="matter-gallery__view-all">
							{__('View gallery', 'matter')}
						</div>
					)}
				</figure>
			)}
		</>
	);
}
