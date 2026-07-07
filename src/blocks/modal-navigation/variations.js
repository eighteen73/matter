import { __ } from '@wordpress/i18n';
import { arrowLeft, arrowRight } from '@wordpress/icons';

const variations = [
	{
		name: 'previous',
		title: __('Previous Modal', 'matter'),
		description: __(
			'Navigate to the previous modal in the group.',
			'matter'
		),
		icon: arrowLeft,
		attributes: {
			direction: 'previous',
			label: __('Previous', 'matter'),
		},
		scope: ['inserter', 'transform'],
		isDefault: false,
		isActive: ['direction'],
	},
	{
		name: 'next',
		title: __('Next Modal', 'matter'),
		description: __('Navigate to the next modal in the group.', 'matter'),
		icon: arrowRight,
		attributes: {
			direction: 'next',
			label: __('Next', 'matter'),
		},
		scope: ['inserter', 'transform'],
		isDefault: true,
		isActive: ['direction'],
	},
];

export default variations;
