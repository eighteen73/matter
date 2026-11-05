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
import { queryTemplate } from './templates';
import './style.scss';

registerBlockType(metadata.name, {
	edit: Edit,
	save: () => <InnerBlocks.Content />,
	// The carousel itself asks what the slides will be; this is a shortcut.
	variations: [
		{
			name: 'posts',
			title: __('Carousel of posts', 'matter'),
			description: __('One slide per post from a query.', 'matter'),
			scope: ['inserter'],
			innerBlocks: [queryTemplate('post')],
		},
	],
});
