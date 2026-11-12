/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import {
	ToggleGroupControl,
	ToggleGroupControlOption,
} from '../../components/compat';
import OverlayEdit from '../../overlay/editor/overlay-edit';

export default function Edit(props) {
	const { attributes, setAttributes } = props;

	return (
		<OverlayEdit {...props} type="drawer">
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
