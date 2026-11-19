/**
 * What a new carousel holds: images (from the media library), the theme's
 * slide types (e.g. cards; `matter_carousel_slides`), posts, terms (e.g.
 * categories), or what an integration adds (e.g. products, with
 * WooCommerce's).
 * Each type can set the variant the carousel starts with, unless the carousel
 * already has one (e.g. from a section's template): that one is kept.
 */

/**
 * WordPress dependencies
 */
import {
	MediaPlaceholder,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	createBlock,
	createBlocksFromInnerBlocksTemplate,
	getBlockType,
} from '@wordpress/blocks';
import { Dashicon } from '@wordpress/components';
import { useDispatch } from '@wordpress/data';
import { applyFilters } from '@wordpress/hooks';
import { cloneElement, isValidElement, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { category, gallery, postList } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { BlockVariationPicker } from '../../components/compat';
import {
	POSTS,
	TERMS,
	carouselTemplate,
	queryBlocks,
} from '../../query-display/templates';
import { useSwapBlock } from '../../query-display/use-swap-block';

// New slides of a theme slide type.
const SLIDE_COUNT = 3;

/**
 * The theme's slide types (block name => { label, variant, within }).
 *
 * @return {Object} Slide types.
 */
export const themeSlideTypes = () => window.matterEditor?.carouselSlides ?? {};

/**
 * The slide types for one carousel: those without `within`, and those whose
 * `within` names a block the carousel is inside.
 *
 * @param {string[]} ancestors Names of the blocks the carousel is inside.
 * @return {Object} Slide types.
 */
export const slideTypesFor = (ancestors = []) =>
	Object.fromEntries(
		Object.entries(themeSlideTypes()).filter(
			([, type]) =>
				!type.within?.length ||
				type.within.some((name) => ancestors.includes(name))
		)
	);

/**
 * A block's icon at the picker's size, like core's own (48px): an SVG may fix
 * its own size (WooCommerce's draws at 24px from a component), and a Dashicon
 * (a theme's block.json icon) fills more of its box than a line icon, so it's
 * drawn smaller. canvas.scss sizes the box and colours them as core's.
 *
 * @param {Object|Element|Function|string} icon Block type icon.
 * @return {Element} Icon for the picker.
 */
const pickerIcon = (icon) => {
	const Src = icon?.src ?? icon;

	if (isValidElement(Src)) {
		return cloneElement(Src, { width: 48, height: 48 });
	}

	return (
		<span className="matter-picker-icon">
			{typeof Src === 'function' ? (
				<Src />
			) : (
				<Dashicon icon={Src} size={40} />
			)}
		</span>
	);
};

/**
 * Picker options: images, the theme's types, posts, what integrations add
 * (e.g. products, with WooCommerce's), then terms.
 *
 * @param {Object} theme The carousel's slide types (slideTypesFor()).
 * @return {Array} Variations for the picker.
 */
function slideOptions(theme) {
	const custom = Object.keys(theme)
		.filter(
			(name) =>
				!['core/image', ...queryBlocks()].includes(name) &&
				getBlockType(name)
		)
		.map((name) => ({
			name,
			title: theme[name].label || getBlockType(name).title,
			icon: pickerIcon(getBlockType(name).icon),
		}));

	return [
		{
			name: 'core/image',
			title: theme['core/image']?.label || __('Images', 'matter'),
			description: __('Images from the media library.', 'matter'),
			icon: gallery,
		},
		...custom,
		{
			name: POSTS,
			title: theme[POSTS]?.label || __('Posts', 'matter'),
			description: __('One slide per post.', 'matter'),
			icon: postList,
		},
		...integrationOptions(theme),
		getBlockType(TERMS) && {
			name: TERMS,
			title: theme[TERMS]?.label || __('Terms', 'matter'),
			description: __(
				'One slide per category, tag or other term.',
				'matter'
			),
			icon: category,
		},
	].filter(Boolean);
}

/**
 * Query blocks an integration offers as slides (`matter.carousel.queryOptions`
 * filter), each `{ name, title, description }` for a registered query block
 * that can be a carousel, shown with its block's icon. A theme's label for
 * the block (`matter_carousel_slides`) wins over the integration's title.
 *
 * @param {Object} theme The carousel's slide types (slideTypesFor()).
 * @return {Array} Variations for the picker.
 */
const integrationOptions = (theme) =>
	applyFilters('matter.carousel.queryOptions', [], theme)
		.filter(
			(option) =>
				option?.name &&
				queryBlocks().includes(option.name) &&
				getBlockType(option.name)
		)
		.map((option) => ({
			...option,
			title: theme[option.name]?.label || option.title,
			icon: option.icon ?? pickerIcon(getBlockType(option.name).icon),
		}));

/**
 * The carousel's own variant, if it has one other than the default.
 *
 * @param {string} className The carousel's classes.
 * @return {string|undefined} Variant slug.
 */
export const currentVariant = (className = '') => {
	const variant = /(?:^|\s)is-style-([\w-]+)/.exec(className ?? '')?.[1];

	return variant === 'default' ? undefined : variant;
};

/**
 * @param {Object}   props
 * @param {string}   props.clientId      Carousel client ID.
 * @param {string}   props.className     The carousel's classes.
 * @param {Object}   props.types         The carousel's slide types.
 * @param {Function} props.setAttributes Carousel attribute setter.
 * @param {Function} props.onImages      Called with chosen images.
 * @return {Element} Picker.
 */
export default function SlidePicker({
	clientId,
	className,
	types,
	setAttributes,
	onImages,
}) {
	const [isChoosingImages, setIsChoosingImages] = useState(false);
	const { replaceInnerBlocks } = useDispatch(blockEditorStore);
	const swapBlock = useSwapBlock();

	if (isChoosingImages) {
		return (
			<MediaPlaceholder
				icon={gallery}
				labels={{
					title: __('Carousel', 'matter'),
					instructions: __(
						'Drag images, upload new ones or choose from your library.',
						'matter'
					),
				}}
				accept="image/*"
				allowedTypes={['image']}
				multiple
				gallery
				handleUpload={false}
				onSelect={onImages}
			/>
		);
	}

	const choose = ({ name }) => {
		const kept = currentVariant(className);
		const variant = kept ?? types[name]?.variant;

		// Posts, terms and an integration's queries (e.g. products): the
		// query block is the carousel, so it takes this block's place.
		const template = queryBlocks().includes(name)
			? carouselTemplate(name, variant)
			: null;

		if (template) {
			const [block] = createBlocksFromInnerBlocksTemplate([template]);

			swapBlock(clientId, block);
			return;
		}

		if (variant && !kept) {
			setAttributes({
				className: [className, `is-style-${variant}`]
					.filter(Boolean)
					.join(' '),
			});
		}

		if (name === 'core/image') {
			setIsChoosingImages(true);
		} else {
			replaceInnerBlocks(
				clientId,
				Array.from({ length: SLIDE_COUNT }, () => createBlock(name))
			);
		}
	};

	return (
		<BlockVariationPicker
			icon="slides"
			label={__('Carousel', 'matter')}
			instructions={__('What will the slides be?', 'matter')}
			variations={slideOptions(types)}
			onSelect={choose}
		/>
	);
}
