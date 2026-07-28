/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { loop, tabs as tabsIcon } from '@wordpress/icons';

export const MANUAL_TABS_TEMPLATE = [
	['matter/tab-list'],
	['matter/tab-panels'],
];

export const QUERY_LOOP_TABS_TEMPLATE = [
	['matter/tab-list'],
	[
		'matter/tab-panels',
		{},
		[
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
								'matter/tab-panel',
								{ inQueryLoop: true },
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
		name: 'tabs',
		title: __('Tabs', 'matter'),
		description: __('Create tabs with manually added panels.', 'matter'),
		scope: ['block', 'transform'],
		icon: tabsIcon,
		isDefault: true,
		attributes: {
			isQueryMode: false,
		},
		isActive: (blockAttributes) => !blockAttributes?.isQueryMode,
		innerBlocks: MANUAL_TABS_TEMPLATE,
	},
	{
		name: 'query-loop-tabs',
		title: __('Query Loop Tabs', 'matter'),
		description: __(
			'Create tabs from a query loop (one tab per post).',
			'matter'
		),
		scope: ['block', 'inserter', 'transform'],
		icon: loop,
		attributes: {
			isQueryMode: true,
		},
		isActive: ['isQueryMode'],
		innerBlocks: QUERY_LOOP_TABS_TEMPLATE,
	},
];

export default variations;
