/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { accordion as accordionIcon, loop } from '@wordpress/icons';

const ITEM_TEMPLATE = [
	'matter/accordion-item',
	{ openByDefault: true },
	[
		['matter/accordion-heading', {}],
		[
			'matter/accordion-panel',
			{},
			[
				[
					'core/paragraph',
					{
						placeholder: __('Type / to add content…', 'matter'),
					},
				],
			],
		],
	],
];

const variations = [
	{
		name: 'accordion',
		title: __('Accordion', 'matter'),
		description: __(
			'Create collapsible sections with manual accordion items.',
			'matter'
		),
		scope: ['block'],
		icon: accordionIcon,
		attributes: {
			isQueryMode: false,
		},
		isActive: (blockAttributes) => !blockAttributes?.isQueryMode,
		innerBlocks: [ITEM_TEMPLATE],
	},
	{
		name: 'query-loop-accordion',
		title: __('Query Loop Accordion', 'matter'),
		description: __(
			'Create accordion items from a query loop (one item per post).',
			'matter'
		),
		scope: ['block', 'inserter'],
		icon: loop,
		attributes: {
			isQueryMode: true,
		},
		isActive: ['isQueryMode'],
		innerBlocks: [
			[
				'core/query',
				{
					query: {
						perPage: 10,
						pages: 0,
						offset: 0,
						postType: 'post',
						order: 'desc',
						orderBy: 'date',
						author: '',
						search: '',
						exclude: [],
						sticky: '',
						inherit: false,
					},
				},
				[
					[
						'core/post-template',
						{},
						[
							[
								'matter/accordion-item',
								{ inQueryLoop: true },
								[
									['matter/accordion-heading', {}],
									[
										'matter/accordion-panel',
										{},
										[
											[
												'core/post-featured-image',
												{
													isLink: true,
													aspectRatio: '16/9',
												},
											],
											['core/post-title'],
											['core/post-excerpt'],
										],
									],
								],
							],
						],
					],
				],
			],
		],
	},
];

export default variations;
export { ITEM_TEMPLATE };
