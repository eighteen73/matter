/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { Carousel } from '../../components/icons/carousel';

export const STANDARD_CAROUSEL_TEMPLATE = [
	[
		'matter/carousel-viewport',
		{ lock: { remove: true }, allowedBlocks: ['matter/carousel-slide'] },
		[['matter/carousel-slide']],
	],
	[
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
	],
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
	[
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
	],
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
	[
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
	],
];

/**
 * Resolve which carousel variation mode is active.
 *
 * @param {string|undefined} className Block className attribute.
 * @return {'standard'|'image'|'post'} Active mode.
 */
export function getCarouselMode(className = '') {
	if (className === 'is-style-post-carousel') {
		return 'post';
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
];

export default variations;
