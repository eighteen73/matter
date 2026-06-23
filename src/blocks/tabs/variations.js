/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { loop } from '@wordpress/icons';

const variations = [
	{
		name: 'query-loop-tabs',
		title: __('Query Loop Tabs', 'matter'),
		description: __(
			'Create tabs from a query loop (one tab per post).',
			'matter'
		),
		scope: ['block', 'inserter'],
		icon: loop,
		attributes: {
			isQueryMode: true,
		},
		isActive: ['isQueryMode'],
		innerBlocks: [
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
		],
	},
];

export default variations;
