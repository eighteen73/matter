const variations = [
	{
		name: 'image-carousel',
		title: 'Image Carousel',
		description: 'Carousel with image slides and navigation controls',
		scope: ['inserter'],
		attributes: {
			className: 'is-style-image-carousel',
		},
		innerBlocks: [
			[
				'eighteen73-blocks/carousel-viewport',
				{
					allowedBlocks: ['core/image'],
					lock: { remove: true },
				},
				[
					['core/image'],
					['core/image'],
					['core/image'],
					['core/image'],
					['core/image'],
					['core/image'],
				],
			],
			[
				'eighteen73-blocks/carousel-progress',
				{
					indicateCurrentPosition: true,
				},
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
					['eighteen73-blocks/carousel-previous-button'],
					['eighteen73-blocks/carousel-dots'],
					['eighteen73-blocks/carousel-next-button'],
				],
			],
		],
		isActive: ['className'],
	},
];

export default variations;
