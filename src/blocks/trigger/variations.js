/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

import icon from './icon';

const variations = [
	{
		name: 'button',
		title: __('Trigger', 'matter'),
		description: __(
			'A trigger button to open a modal, drawer, or collapsible.',
			'matter'
		),
		icon,
		attributes: {
			triggerType: 'button',
		},
		scope: ['inserter', 'transform'],
		isDefault: true,
		isActive: ['triggerType'],
		innerBlocks: [
			[
				'core/buttons',
				{},
				[
					[
						'core/button',
						{
							text: __('Open', 'matter'),
							tagName: 'button',
						},
					],
				],
			],
		],
	},
	{
		name: 'group',
		title: __('Group trigger', 'matter'),
		description: __(
			'Group triggers should wrap non-interactive content only. Avoid placing links or buttons inside the group.',
			'matter'
		),
		icon,
		attributes: {
			triggerType: 'content',
		},
		scope: ['transform'],
		isActive: ['triggerType'],
		innerBlocks: [['core/group', {}, []]],
	},
];

export default variations;
