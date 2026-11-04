/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import Edit from './edit';
import metadata from './block.json';
import './style.scss';

registerBlockType(metadata.name, {
	edit: Edit,
	save: () => <InnerBlocks.Content />,
	variations: [
		{
			name: 'items',
			title: __('Accordion', 'matter'),
			isDefault: true,
			scope: ['inserter'],
			innerBlocks: [['matter/accordion-item'], ['matter/accordion-item']],
		},
		{
			name: 'posts',
			title: __('Accordion from posts', 'matter'),
			description: __('One item per post from a query.', 'matter'),
			scope: ['inserter'],
			// Items show the post title; the panel shows the excerpt.
			innerBlocks: [
				[
					'core/query',
					{
						query: {
							perPage: 10,
							postType: 'post',
							order: 'asc',
							orderBy: 'title',
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
									{},
									[['core/post-excerpt']],
								],
							],
						],
					],
				],
			],
		},
	],
});
