/**
 * WordPress dependencies
 */
import {
	__experimentalToggleGroupControl as ToggleGroupControl, // eslint-disable-line @wordpress/no-unsafe-wp-apis -- Stable in practice since 6.2.
	__experimentalToggleGroupControlOption as ToggleGroupControlOption, // eslint-disable-line @wordpress/no-unsafe-wp-apis
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import OverlayEdit from '../../overlay/editor/overlay-edit';

export default function Edit(props) {
	const { attributes, setAttributes } = props;

	return (
		<OverlayEdit
			{...props}
			type="drawer"
			className={`is-position-${
				attributes.position === 'left' ? 'left' : 'right'
			}`}
		>
			<ToggleGroupControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				isBlock
				label={__('Slides in from', 'matter')}
				value={attributes.position}
				onChange={(position) => setAttributes({ position })}
			>
				<ToggleGroupControlOption
					value="left"
					label={__('Left', 'matter')}
				/>
				<ToggleGroupControlOption
					value="right"
					label={__('Right', 'matter')}
				/>
			</ToggleGroupControl>
		</OverlayEdit>
	);
}
