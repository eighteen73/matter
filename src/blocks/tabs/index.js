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
import './editor.scss';
import './style.scss';

registerBlockType(metadata.name, {
	edit: Edit,
	save: () => <InnerBlocks.Content />,
	variations: [
		{
			name: 'tabs',
			title: __('Tabs', 'matter'),
			isDefault: true,
			scope: ['inserter'],
			innerBlocks: [['matter/tab'], ['matter/tab']],
		},
		{
			name: 'posts',
			title: __('Tabs from posts', 'matter'),
			description: __('One tab per post from a query.', 'matter'),
			scope: ['inserter'],
			innerBlocks: [
				[
					'core/query',
					{
						query: {
							perPage: 5,
							postType: 'post',
							inherit: false,
						},
					},
					[
						[
							'core/post-template',
							{},
							[['matter/tab', {}, [['core/post-excerpt']]]],
						],
					],
				],
			],
		},
	],
});
