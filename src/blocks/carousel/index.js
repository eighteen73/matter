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

const query = (postType) => [
	'core/query',
	{ query: { perPage: 9, postType, inherit: false } },
	[
		[
			'core/post-template',
			{},
			[
				['core/post-featured-image'],
				['core/post-title', { isLink: true }],
			],
		],
	],
];

registerBlockType(metadata.name, {
	edit: Edit,
	save: () => <InnerBlocks.Content />,
	variations: [
		{
			name: 'slides',
			title: __('Carousel', 'matter'),
			isDefault: true,
			scope: ['inserter'],
			innerBlocks: [['core/image'], ['core/image'], ['core/image']],
		},
		{
			name: 'posts',
			title: __('Carousel of posts', 'matter'),
			description: __('One slide per post from a query.', 'matter'),
			scope: ['inserter'],
			innerBlocks: [query('post')],
		},
	],
});
