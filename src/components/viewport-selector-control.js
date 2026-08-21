/**
 * Viewport selector using WordPress 7.1 Mobile / Tablet states.
 */

import { __ } from '@wordpress/i18n';
import {
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControl as ToggleGroupControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';

export const VIEWPORT_OPTIONS = [
	{
		value: 'mobile',
		label: __('Mobile', 'matter'),
	},
	{
		value: 'tablet',
		label: __('Tablet', 'matter'),
	},
];

/**
 * @param {Object}   props
 * @param {string}   props.value
 * @param {Function} props.onChange
 * @param {string}   [props.label]
 * @param {string}   [props.help]
 * @return {Element} The component.
 */
export default function ViewportSelectorControl({
	value,
	onChange,
	label,
	help,
}) {
	return (
		<ToggleGroupControl
			__next40pxDefaultSize
			__nextHasNoMarginBottom
			isBlock
			label={label}
			help={help}
			onChange={onChange}
			value={value}
			style={{ width: '100%' }}
		>
			{VIEWPORT_OPTIONS.map((option) => (
				<ToggleGroupControlOption
					key={option.value}
					value={option.value}
					label={option.label}
				/>
			))}
		</ToggleGroupControl>
	);
}
