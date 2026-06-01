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
					['eighteen73-blocks/carousel-previous-button'],
					['eighteen73-blocks/carousel-dots'],
					['eighteen73-blocks/carousel-next-button'],
				],
			],
		],
		isActive: ['className'],
	},
	{
		name: 'post-carousel',
		title: 'Post Carousel',
		description: 'Carousel with post slides and navigation controls',
		attributes: {
			className: 'is-style-post-carousel',
		},
		innerBlocks: [
			[
				'eighteen73-blocks/carousel-viewport',
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
