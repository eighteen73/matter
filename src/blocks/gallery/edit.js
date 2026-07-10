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
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalSpacingSizesControl as SpacingSizesControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalGetGapCSSValue as getGapCSSValue,
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
import { useEffect, useMemo, useRef } from '@wordpress/element';
import { __, _x, sprintf } from '@wordpress/i18n';
import { useSelect, useDispatch } from '@wordpress/data';
import { createBlobURL } from '@wordpress/blob';
import { store as noticesStore } from '@wordpress/notices';
import useEmblaCarousel from 'embla-carousel-react';

import {
	normalizeCarouselConfig,
	prepareCarouselBlockState,
	buildCarouselPlugins,
} from '../../utils/carousel/config';
import {
	addPrevNextBtnsClickHandlers,
	addThumbsClickHandlers,
} from '../../utils/carousel/handlers';
import { Gallery as GalleryIcon } from '../../components/icons/gallery';
import ColorControl from '../../components/color-control';
import { storeColorValue } from '../../utils/colors';
import { getBlockStyles } from '../../utils/block-styles';

const ALLOWED_MEDIA_TYPES = ['image'];
const DEFAULT_BLOCK = { name: 'core/image' };
const EMPTY_ARRAY = [];
const DEFAULT_GRID_LAYOUT = { type: 'grid', columnCount: 3 };
const DEFAULT_FLOW_LAYOUT = { type: 'default' };
const EDITOR_SLIDES_SELECTOR =
	':scope > .block-editor-block-list__block:not(.block-list-appender), :scope > .wp-block:not(.block-list-appender)';
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
		lightboxThumbnails,
		lightboxThumbnailSizeSlug,
		lightboxThumbnailAspectRatio,
		lightboxThumbnailsVisible,
		lightboxThumbnailGap,
		lightboxBackdropColor,
		lightboxBackdropOpacity,
		lightboxBackdropBlur,
		imageLimit,
		includeThumbnails,
		thumbnailAspectRatio,
		thumbnailsVisible,
		thumbnailGap,
		imageCrop,
		carouselConfig,
		layout,
		style,
	} = attributes;

	const isCarousel = type === 'carousel';
	const isGrid = !isCarousel;
	const hasImageLimit = isGrid && imageLimit > 0;
	const lightboxEnabled = lightbox || hasImageLimit;
	const columnCount = layout?.columnCount || DEFAULT_GRID_LAYOUT.columnCount;

	const setGalleryType = (nextType) => {
		if (nextType === 'carousel') {
			setAttributes({
				type: 'carousel',
				layout: DEFAULT_FLOW_LAYOUT,
			});
			return;
		}

		setAttributes({
			type: 'grid',
			layout: {
				type: 'grid',
				columnCount:
					layout?.columnCount || DEFAULT_GRID_LAYOUT.columnCount,
			},
		});
	};

	// Carousel must not keep a grid layout — core layout styles break Embla.
	useEffect(() => {
		if (isCarousel && layout?.type === 'grid') {
			setAttributes({ layout: DEFAULT_FLOW_LAYOUT });
		}
	}, [isCarousel, layout?.type, setAttributes]);

	// Keep image limit at least one full row when columns change.
	useEffect(() => {
		if (!isGrid || imageLimit <= 0) {
			return;
		}
		if (imageLimit < columnCount) {
			setAttributes({ imageLimit: columnCount });
		}
	}, [isGrid, imageLimit, columnCount, setAttributes]);

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
				alt: block.attributes.alt,
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

	const { carouselOptions, pluginState } = useMemo(
		() =>
			prepareCarouselBlockState({
				carouselConfig: resolvedCarouselConfig,
			}),
		[resolvedCarouselConfig]
	);

	const emblaPlugins = useMemo(
		() => buildCarouselPlugins(pluginState, { forceInactive: true }),
		[pluginState]
	);

	// Matter-only keys — Embla ignores unknown options, but strip to be safe.
	const emblaInitOptions = useMemo(() => {
		const {
			slidesToShow: _slidesToShow,
			slideGap: _slideGap,
			...options
		} = carouselOptions || {};
		return options;
	}, [carouselOptions]);

	const [emblaRef, emblaApi] = useEmblaCarousel(
		{
			...emblaInitOptions,
			// Track is the first child of the viewport (Embla default container).
			slides: EDITOR_SLIDES_SELECTOR,
			watchFocus: false,
			active: isCarousel,
		},
		emblaPlugins
	);

	const [thumbsRef, thumbsApi] = useEmblaCarousel({
		containScroll: 'keepSnaps',
		dragFree: true,
		watchFocus: false,
		active: isCarousel && includeThumbnails,
	});

	const prevButtonRef = useRef(null);
	const nextButtonRef = useRef(null);

	useEffect(() => {
		if (!emblaApi || !isCarousel) {
			return;
		}
		emblaApi.reInit();
	}, [
		emblaApi,
		isCarousel,
		images.length,
		carouselOptions,
		includeThumbnails,
	]);

	useEffect(() => {
		if (
			!emblaApi ||
			!isCarousel ||
			!prevButtonRef.current ||
			!nextButtonRef.current
		) {
			return;
		}

		return addPrevNextBtnsClickHandlers(
			emblaApi,
			prevButtonRef.current,
			nextButtonRef.current
		);
	}, [emblaApi, isCarousel, images.length]);

	useEffect(() => {
		if (!emblaApi || !thumbsApi || !isCarousel || !includeThumbnails) {
			return;
		}

		const thumbsNode = thumbsApi.containerNode();
		if (!thumbsNode) {
			return;
		}

		return addThumbsClickHandlers(emblaApi, thumbsApi, thumbsNode);
	}, [emblaApi, thumbsApi, isCarousel, includeThumbnails, images.length]);

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
			'has-lightbox': lightboxEnabled,
			'is-cropped':
				isGrid &&
				(imageCrop || (aspectRatio && aspectRatio !== 'auto')),
			'has-aspect-ratio': !!(aspectRatio && aspectRatio !== 'auto'),
		}),
	});

	// Keep a stable InnerBlocks host across grid/carousel so blocks stay mounted.
	// Layout classnames must live here (not on the figure) so grid columns apply
	// to the element that actually contains the images.
	const innerBlocksProps = useInnerBlocksProps(
		{
			className: clsx({
				'matter-gallery__track': isCarousel,
				[layoutClassNames]: isGrid && layoutClassNames,
			}),
		},
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

	const fadeActive = !!resolvedCarouselConfig.plugins?.fade?.active;
	const showCropControl = isGrid && (!aspectRatio || aspectRatio === 'auto');
	const showCarouselThumbControls = isCarousel && includeThumbnails;
	const showLightboxThumbControls =
		lightboxEnabled && lightboxThumbnails !== false;
	const thumbStyle =
		thumbnailAspectRatio && thumbnailAspectRatio !== 'auto'
			? {
					aspectRatio: thumbnailAspectRatio,
					objectFit: 'cover',
				}
			: undefined;
	const carouselThumbStyles = {
		...getBlockStyles({ thumbnailGap }, 'gallery'),
		...(thumbnailsVisible > 0
			? { '--matter-gallery--thumbs-visible': thumbnailsVisible }
			: {}),
	};

	const carouselGap = isCarousel
		? getGapCSSValue(style?.spacing?.blockGap)
		: null;
	const carouselStyles = carouselGap ? { gap: carouselGap } : undefined;

	if (!hasImages) {
		return (
			<figure {...blockProps}>
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

	return (
		<>
			<InspectorControls>
				<ToolsPanel
					label={__('Settings', 'matter')}
					resetAll={() => {
						setGalleryType('grid');
						setAttributes({
							aspectRatio: 'auto',
							sizeSlug: 'large',
							thumbnailSizeSlug: 'thumbnail',
							imageLimit: 0,
							includeThumbnails: false,
							thumbnailAspectRatio: '1',
							thumbnailsVisible: 0,
							thumbnailGap: '',
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
						onDeselect={() => setGalleryType('grid')}
						isShownByDefault
					>
						<ToggleGroupControl
							label={__('Type', 'matter')}
							value={type}
							onChange={setGalleryType}
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
						<>
							<ToolsPanelItem
								hasValue={() => imageLimit > 0}
								label={__('Limit visible images', 'matter')}
								onDeselect={() =>
									setAttributes({ imageLimit: 0 })
								}
								isShownByDefault
							>
								<ToggleControl
									label={__('Limit visible images', 'matter')}
									checked={imageLimit > 0}
									onChange={(enabled) => {
										if (enabled) {
											setAttributes({
												imageLimit: columnCount,
												lightbox: true,
											});
											return;
										}
										setAttributes({ imageLimit: 0 });
									}}
									help={__(
										'Show a full grid of images, then open the rest in the lightbox.',
										'matter'
									)}
									__nextHasNoMarginBottom
								/>
							</ToolsPanelItem>

							{imageLimit > 0 && (
								<ToolsPanelItem
									hasValue={() => imageLimit > columnCount}
									label={__('Visible image count', 'matter')}
									onDeselect={() =>
										setAttributes({
											imageLimit: columnCount,
										})
									}
									isShownByDefault
								>
									<RangeControl
										label={__(
											'Visible image count',
											'matter'
										)}
										help={sprintf(
											/* translators: %d: column count */
											__(
												'Minimum is %d (one full row). Remaining images open in the lightbox.',
												'matter'
											),
											columnCount
										)}
										value={Math.max(
											imageLimit,
											columnCount
										)}
										onChange={(value) => {
											const nextLimit = Math.max(
												value ?? columnCount,
												columnCount
											);
											setAttributes({
												imageLimit: nextLimit,
												lightbox: true,
											});
										}}
										min={columnCount}
										max={Math.max(
											images.length,
											columnCount,
											12
										)}
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								</ToolsPanelItem>
							)}
						</>
					)}

					{isCarousel && (
						<ToolsPanelItem
							hasValue={() => !!includeThumbnails}
							label={__('Enable thumbnails', 'matter')}
							onDeselect={() =>
								setAttributes({ includeThumbnails: false })
							}
							isShownByDefault
						>
							<ToggleControl
								label={__('Enable thumbnails', 'matter')}
								checked={!!includeThumbnails}
								onChange={(value) =>
									setAttributes({
										includeThumbnails: value,
									})
								}
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
					)}

					{showCarouselThumbControls &&
						imageSizeOptions.length > 0 && (
							<ToolsPanelItem
								hasValue={() =>
									thumbnailSizeSlug !== 'thumbnail'
								}
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

					{showCarouselThumbControls &&
						aspectRatioOptions.length > 1 && (
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
									label={__(
										'Thumbnail aspect ratio',
										'matter'
									)}
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

					{showCarouselThumbControls && (
						<ToolsPanelItem
							hasValue={() => thumbnailsVisible > 0}
							label={__('Thumbnails visible', 'matter')}
							onDeselect={() =>
								setAttributes({ thumbnailsVisible: 0 })
							}
							isShownByDefault
						>
							<RangeControl
								label={__('Thumbnails visible', 'matter')}
								help={__(
									'0 uses a fixed thumbnail width. Set a number to show that many across the strip.',
									'matter'
								)}
								value={thumbnailsVisible}
								onChange={(value) =>
									setAttributes({
										thumbnailsVisible: value ?? 0,
									})
								}
								min={0}
								max={12}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
					)}
				</ToolsPanel>

				<ToolsPanel
					label={__('Lightbox', 'matter')}
					resetAll={() => {
						setAttributes({
							lightbox: true,
							lightboxSizeSlug: 'large',
							lightboxThumbnails: true,
							lightboxThumbnailSizeSlug: 'thumbnail',
							lightboxThumbnailAspectRatio: '1',
							lightboxThumbnailsVisible: 0,
							lightboxThumbnailGap: '',
						});
					}}
				>
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
							label={__('Image size', 'matter')}
							onDeselect={() =>
								setAttributes({ lightboxSizeSlug: 'large' })
							}
							isShownByDefault
						>
							<SelectControl
								label={__('Image size', 'matter')}
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

					{lightboxEnabled && (
						<ToolsPanelItem
							hasValue={() => lightboxThumbnails === false}
							label={__('Show thumbnails', 'matter')}
							onDeselect={() =>
								setAttributes({ lightboxThumbnails: true })
							}
							isShownByDefault
						>
							<ToggleControl
								label={__('Show thumbnails', 'matter')}
								checked={lightboxThumbnails !== false}
								onChange={(value) =>
									setAttributes({
										lightboxThumbnails: value,
									})
								}
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
					)}

					{showLightboxThumbControls &&
						imageSizeOptions.length > 0 && (
							<ToolsPanelItem
								hasValue={() =>
									lightboxThumbnailSizeSlug !== 'thumbnail'
								}
								label={__('Thumbnail size', 'matter')}
								onDeselect={() =>
									setAttributes({
										lightboxThumbnailSizeSlug: 'thumbnail',
									})
								}
								isShownByDefault
							>
								<SelectControl
									label={__('Thumbnail size', 'matter')}
									value={lightboxThumbnailSizeSlug}
									options={imageSizeOptions}
									onChange={(value) =>
										setAttributes({
											lightboxThumbnailSizeSlug: value,
										})
									}
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>
						)}

					{showLightboxThumbControls &&
						aspectRatioOptions.length > 1 && (
							<ToolsPanelItem
								hasValue={() =>
									lightboxThumbnailAspectRatio &&
									lightboxThumbnailAspectRatio !== '1'
								}
								label={__('Thumbnail aspect ratio', 'matter')}
								onDeselect={() =>
									setAttributes({
										lightboxThumbnailAspectRatio: '1',
									})
								}
								isShownByDefault
							>
								<SelectControl
									label={__(
										'Thumbnail aspect ratio',
										'matter'
									)}
									value={lightboxThumbnailAspectRatio || '1'}
									options={aspectRatioOptions.filter(
										(option) => option.value !== 'auto'
									)}
									onChange={(value) =>
										setAttributes({
											lightboxThumbnailAspectRatio: value,
										})
									}
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>
						)}

					{showLightboxThumbControls && (
						<ToolsPanelItem
							hasValue={() => lightboxThumbnailsVisible > 0}
							label={__('Thumbnails visible', 'matter')}
							onDeselect={() =>
								setAttributes({
									lightboxThumbnailsVisible: 0,
								})
							}
							isShownByDefault
						>
							<RangeControl
								label={__('Thumbnails visible', 'matter')}
								help={__(
									'0 uses a fixed thumbnail width. Set a number to show that many across the strip.',
									'matter'
								)}
								value={lightboxThumbnailsVisible}
								onChange={(value) =>
									setAttributes({
										lightboxThumbnailsVisible: value ?? 0,
									})
								}
								min={0}
								max={12}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
					)}
				</ToolsPanel>
			</InspectorControls>

			{lightboxEnabled && (
				<InspectorControls group="color">
					<ColorControl
						label={__('Backdrop', 'matter')}
						value={lightboxBackdropColor}
						attributeName="lightboxBackdropColor"
						onChange={(value, slug) =>
							setAttributes({
								lightboxBackdropColor: storeColorValue(
									slug,
									value
								),
							})
						}
						panelId={clientId}
					/>

					{lightboxBackdropColor && (
						<>
							<ToolsPanelItem
								hasValue={() => lightboxBackdropOpacity !== 85}
								label={__('Backdrop opacity', 'matter')}
								onDeselect={() =>
									setAttributes({
										lightboxBackdropOpacity: 85,
									})
								}
								isShownByDefault
								panelId={clientId}
							>
								<RangeControl
									label={__('Backdrop opacity', 'matter')}
									value={lightboxBackdropOpacity}
									onChange={(value) =>
										setAttributes({
											lightboxBackdropOpacity: value,
										})
									}
									min={0}
									max={100}
									step={10}
									required
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>

							<ToolsPanelItem
								hasValue={() => !!lightboxBackdropBlur}
								label={__('Backdrop blur', 'matter')}
								onDeselect={() =>
									setAttributes({
										lightboxBackdropBlur: 0,
									})
								}
								isShownByDefault
								panelId={clientId}
							>
								<RangeControl
									label={__('Backdrop blur', 'matter')}
									value={lightboxBackdropBlur}
									onChange={(value) =>
										setAttributes({
											lightboxBackdropBlur: value,
										})
									}
									min={0}
									max={10}
									step={1}
									required
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>
						</>
					)}
				</InspectorControls>
			)}

			{(showCarouselThumbControls || showLightboxThumbControls) && (
				<InspectorControls group="dimensions">
					{showCarouselThumbControls && (
						<ToolsPanelItem
							hasValue={() => !!thumbnailGap}
							label={__('Thumbnail spacing', 'matter')}
							onDeselect={() =>
								setAttributes({ thumbnailGap: '' })
							}
							resetAllFilter={() => ({
								thumbnailGap: '',
							})}
							panelId={clientId}
						>
							<SpacingSizesControl
								label={__('Thumbnail spacing', 'matter')}
								values={{
									top: thumbnailGap || undefined,
								}}
								onChange={({ top }) =>
									setAttributes({
										thumbnailGap: top || '',
									})
								}
								sides={['top']}
								showSideInLabel={false}
							/>
						</ToolsPanelItem>
					)}

					{showLightboxThumbControls && (
						<ToolsPanelItem
							hasValue={() => !!lightboxThumbnailGap}
							label={__('Lightbox thumbnail spacing', 'matter')}
							onDeselect={() =>
								setAttributes({ lightboxThumbnailGap: '' })
							}
							resetAllFilter={() => ({
								lightboxThumbnailGap: '',
							})}
							panelId={clientId}
						>
							<SpacingSizesControl
								label={__(
									'Lightbox thumbnail spacing',
									'matter'
								)}
								values={{
									top: lightboxThumbnailGap || undefined,
								}}
								onChange={({ top }) =>
									setAttributes({
										lightboxThumbnailGap: top || '',
									})
								}
								sides={['top']}
								showSideInLabel={false}
							/>
						</ToolsPanelItem>
					)}
				</InspectorControls>
			)}

			<BlockControls group="other">
				<MediaReplaceFlow
					allowedTypes={ALLOWED_MEDIA_TYPES}
					handleUpload={false}
					onSelect={updateImages}
					name={__('Add', 'matter')}
					multiple
					mediaIds={images
						.filter((image) => image.id)
						.map((image) => image.id)}
					addToGallery={hasImageIds}
					onError={onUploadError}
				/>
			</BlockControls>

			{hasImageLimit && (
				<style>
					{`
						.block-editor-block-list__block[data-block="${clientId}"] .block-editor-block-list__layout > .wp-block:nth-child(n + ${imageLimit + 1}) {
							display: none !important;
						}
					`}
				</style>
			)}

			<figure {...blockProps}>
				<div
					className={
						isCarousel
							? 'matter-gallery__carousel'
							: 'matter-gallery__grid'
					}
					style={isCarousel ? carouselStyles : undefined}
				>
					<div className="matter-gallery__stage">
						<div
							className="matter-gallery__viewport"
							ref={isCarousel ? emblaRef : undefined}
						>
							<div {...innerBlocksProps} />
						</div>

						{isCarousel && (
							<div className="matter-gallery__controls">
								<button
									type="button"
									className="matter-gallery__nav matter-gallery__nav--prev"
									ref={prevButtonRef}
									aria-label={__('Previous image', 'matter')}
								>
									&#10094;
								</button>
								<button
									type="button"
									className="matter-gallery__nav matter-gallery__nav--next"
									ref={nextButtonRef}
									aria-label={__('Next image', 'matter')}
								>
									&#10095;
								</button>
							</div>
						)}
					</div>

					{isCarousel && includeThumbnails && (
						<div
							className={clsx('matter-gallery__thumbs', {
								'has-visible-count': thumbnailsVisible > 0,
							})}
							style={carouselThumbStyles}
						>
							<div
								className="matter-gallery__thumbs-viewport"
								ref={thumbsRef}
							>
								<div className="matter-gallery__thumbs-track">
									{images.map((image, index) => (
										<button
											key={
												image.clientId ||
												image.id ||
												index
											}
											type="button"
											className="matter-gallery__thumb"
											aria-label={sprintf(
												/* translators: %d: image number */
												__('Go to image %d', 'matter'),
												index + 1
											)}
										>
											{image.url ? (
												<img
													src={image.url}
													alt={image.alt || ''}
													style={thumbStyle}
												/>
											) : null}
										</button>
									))}
								</div>
							</div>
						</div>
					)}
				</div>

				{hasImageLimit && images.length > imageLimit && (
					<div className="matter-gallery__view-all">
						{__('View gallery', 'matter')}
					</div>
				)}
			</figure>
		</>
	);
}
