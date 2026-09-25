/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { Carousel } from '../../components/icons/carousel';

const CAROUSEL_CONTROLS_TEMPLATE = [
	'core/group',
	{
		layout: {
			type: 'flex',
			justifyContent: 'space-between',
			flexWrap: 'nowrap',
			verticalAlignment: 'center',
		},
	},
	[
		['matter/carousel-previous-button'],
		['matter/carousel-dots'],
		['matter/carousel-next-button'],
	],
];

export const STANDARD_CAROUSEL_TEMPLATE = [
	[
		'matter/carousel-viewport',
		{ lock: { remove: true }, allowedBlocks: ['matter/carousel-slide'] },
		[['matter/carousel-slide']],
	],
	CAROUSEL_CONTROLS_TEMPLATE,
];

export const IMAGE_CAROUSEL_TEMPLATE = [
	[
		'matter/carousel-viewport',
		{
			allowedBlocks: ['core/image'],
			lock: { remove: true },
		},
		[['core/image'], ['core/image'], ['core/image']],
	],
	CAROUSEL_CONTROLS_TEMPLATE,
];

export const POST_CAROUSEL_TEMPLATE = [
	[
		'matter/carousel-viewport',
		{
			allowedBlocks: ['core/query'],
			lock: { remove: true },
		},
		[
			[
				'core/query',
				{
					query: {
						perPage: 10,
						pages: 0,
						offset: 0,
						postType: 'post',
						inherit: false,
					},
					lock: { remove: true },
				},
				[
					[
						'core/post-template',
						{ lock: { remove: true, move: true } },
						[
							[
								'core/post-featured-image',
								{ isLink: true, aspectRatio: '16/9' },
							],
							['core/post-title'],
							['core/post-excerpt'],
						],
					],
				],
			],
		],
	],
	CAROUSEL_CONTROLS_TEMPLATE,
];

/**
 * Product Collection stays in a flex layout. This carousel owns scrolling;
 * WooCommerce's carousel display layout would add a second scroller.
 */
export const PRODUCT_CAROUSEL_TEMPLATE = [
	[
		'matter/carousel-viewport',
		{
			allowedBlocks: ['woocommerce/product-collection'],
			lock: { remove: true },
		},
		[
			[
				'woocommerce/product-collection',
				{
					query: {
						perPage: 10,
						pages: 0,
						offset: 0,
						postType: 'product',
						order: 'asc',
						orderBy: 'title',
						search: '',
						exclude: [],
						inherit: false,
						taxQuery: {},
						isProductCollectionBlock: true,
						featured: false,
						woocommerceOnSale: false,
						woocommerceAttributes: [],
						woocommerceHandPickedProducts: [],
					},
					tagName: 'div',
					displayLayout: {
						type: 'flex',
						columns: 1,
						shrinkColumns: false,
					},
					dimensions: {
						widthType: 'fill',
					},
					collection:
						'woocommerce/product-collection/product-catalog',
					queryContextIncludes: ['collection'],
					lock: { remove: true },
				},
				[
					[
						'woocommerce/product-template',
						{ lock: { remove: true, move: true } },
						[
							[
								'woocommerce/product-image',
								{
									showSaleBadge: false,
									style: {
										dimensions: {
											aspectRatio: '1/1',
										},
									},
								},
								[
									[
										'woocommerce/product-sale-badge',
										{ align: 'right' },
									],
								],
							],
							[
								'core/post-title',
								{
									level: 2,
									__woocommerceNamespace:
										'woocommerce/product-collection/product-title',
								},
							],
							['woocommerce/product-price'],
							['woocommerce/product-button'],
						],
					],
				],
			],
		],
	],
	CAROUSEL_CONTROLS_TEMPLATE,
];

/**
 * Resolve which carousel variation mode is active.
 *
 * @param {string|undefined} className Block className attribute.
 * @return {'standard'|'image'|'post'|'product'} Active mode.
 */
export function getCarouselMode(className = '') {
	if (className === 'is-style-post-carousel') {
		return 'post';
	}

	if (className === 'is-style-product-carousel') {
		return 'product';
	}

	if (className === 'is-style-image-carousel') {
		return 'image';
	}

	return 'standard';
}

const variations = [
	{
		name: 'carousel',
		title: __('Carousel', 'matter'),
		description: __(
			'A flexible carousel with freeform slides and navigation controls.',
			'matter'
		),
		icon: Carousel,
		attributes: {
			className: '',
		},
		scope: ['block', 'transform'],
		isDefault: true,
		isActive: (blockAttributes) =>
			getCarouselMode(blockAttributes?.className) === 'standard',
		innerBlocks: STANDARD_CAROUSEL_TEMPLATE,
	},
	{
		name: 'image-carousel',
		title: __('Image Carousel', 'matter'),
		description: __(
			'Carousel with image slides and navigation controls',
			'matter'
		),
		icon: 'images-alt',
		attributes: {
			className: 'is-style-image-carousel',
		},
		scope: ['block', 'inserter', 'transform'],
		innerBlocks: IMAGE_CAROUSEL_TEMPLATE,
		isActive: ['className'],
	},
	{
		name: 'post-carousel',
		title: __('Post Carousel', 'matter'),
		description: __(
			'Carousel with post slides and navigation controls',
			'matter'
		),
		icon: 'admin-post',
		attributes: {
			className: 'is-style-post-carousel',
		},
		scope: ['block', 'inserter', 'transform'],
		innerBlocks: POST_CAROUSEL_TEMPLATE,
		isActive: ['className'],
	},
	{
		name: 'product-carousel',
		title: __('Product Carousel', 'matter'),
		description: __(
			'Carousel of products from a Product Collection, with navigation controls.',
			'matter'
		),
		icon: 'products',
		attributes: {
			className: 'is-style-product-carousel',
		},
		scope: ['block', 'inserter', 'transform'],
		innerBlocks: PRODUCT_CAROUSEL_TEMPLATE,
		isActive: ['className'],
	},
];

export default variations;
