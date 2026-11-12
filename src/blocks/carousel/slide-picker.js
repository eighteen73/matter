/**
 * What a new carousel holds: images (from the media library), the theme's
 * slide types (e.g. cards; `matter_carousel_slides`), posts or products.
 * Each type can set the variant the carousel starts with.
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
import { useDispatch } from '@wordpress/data';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { gallery, postList } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { BlockVariationPicker } from '../../components/compat';
import {
	POSTS,
	PRODUCTS,
	productsTemplate,
	queryTemplate,
} from '../../query-display/templates';
import { useSwapBlock } from '../../query-display/use-swap-block';

// New slides of a theme slide type.
const SLIDE_COUNT = 3;

/**
 * The theme's slide types (block name => { label, variant }).
 *
 * @return {Object} Slide types.
 */
export const themeSlideTypes = () => window.matterEditor?.carouselSlides ?? {};

/**
 * Picker options: images, the theme's types, posts, then products (with
 * WooCommerce).
 *
 * @return {Array} Variations for the picker.
 */
function slideOptions() {
	const theme = themeSlideTypes();
	const custom = Object.keys(theme)
		.filter(
			(name) =>
				!['core/image', POSTS, PRODUCTS].includes(name) &&
				getBlockType(name)
		)
		.map((name) => ({
			name,
			title: theme[name].label || getBlockType(name).title,
			icon: getBlockType(name).icon,
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
		getBlockType(PRODUCTS) && {
			name: PRODUCTS,
			title: theme[PRODUCTS]?.label || __('Products', 'matter'),
			description: __('One slide per product.', 'matter'),
			icon: getBlockType(PRODUCTS).icon,
		},
	].filter(Boolean);
}

/**
 * @param {Object}   props
 * @param {string}   props.clientId      Carousel client ID.
 * @param {Function} props.setAttributes Carousel attribute setter.
 * @param {Function} props.onImages      Called with chosen images.
 * @return {Element} Picker.
 */
export default function SlidePicker({ clientId, setAttributes, onImages }) {
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
				onSelect={onImages}
			/>
		);
	}

	const choose = ({ name }) => {
		const variant = themeSlideTypes()[name]?.variant;

		// Posts and products: the query block is the carousel, so it takes
		// this block's place.
		if (name === POSTS || name === PRODUCTS) {
			const [block] = createBlocksFromInnerBlocksTemplate([
				name === POSTS
					? queryTemplate('post', variant)
					: productsTemplate(variant),
			]);

			swapBlock(clientId, block);
			return;
		}

		if (variant) {
			setAttributes({ className: `is-style-${variant}` });
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
			variations={slideOptions()}
			onSelect={choose}
		/>
	);
}
