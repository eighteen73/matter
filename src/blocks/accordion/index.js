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
			name: 'items',
			title: __('Accordion', 'matter'),
			isDefault: true,
			scope: ['inserter'],
			innerBlocks: [['matter/accordion-item'], ['matter/accordion-item']],
		},
	],
});
