/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { accordion as accordionIcon, loop } from '@wordpress/icons';

const ITEM_TEMPLATE = [
	'matter/accordion-item',
	{},
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

export const MANUAL_ACCORDION_TEMPLATE = [ITEM_TEMPLATE];

export const QUERY_LOOP_ACCORDION_TEMPLATE = [
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
];

const variations = [
	{
		name: 'accordion',
		title: __('Accordion', 'matter'),
		description: __(
			'Create collapsible sections with manual accordion items.',
			'matter'
		),
		scope: ['block', 'transform'],
		icon: accordionIcon,
		isDefault: true,
		attributes: {
			isQueryMode: false,
		},
		isActive: (blockAttributes) => !blockAttributes?.isQueryMode,
		innerBlocks: MANUAL_ACCORDION_TEMPLATE,
	},
	{
		name: 'query-loop-accordion',
		title: __('Query Loop Accordion', 'matter'),
		description: __(
			'Create accordion items from a query loop (one item per post).',
			'matter'
		),
		scope: ['block', 'inserter', 'transform'],
		icon: loop,
		attributes: {
			isQueryMode: true,
		},
		isActive: ['isQueryMode'],
		innerBlocks: QUERY_LOOP_ACCORDION_TEMPLATE,
	},
];

export default variations;
export { ITEM_TEMPLATE };
