/**
 * WordPress dependencies
 */
import {
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControl as ToggleGroupControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';

/**
 * Internal dependencies
 */
import breakpoints from '../constants/breakpoints';

export default function BreakpointSelectorControl({ value, onChange, label }) {
	return (
		<ToggleGroupControl
			label={label}
			onChange={onChange}
			value={value}
			isBlock
			style={{ width: '100%' }}
		>
			{Object.entries(breakpoints).map(([name, breakpoint]) => (
				<ToggleGroupControlOption
					key={name}
					value={name}
					label={breakpoint.label.toUpperCase()}
				/>
			))}
		</ToggleGroupControl>
	);
}
