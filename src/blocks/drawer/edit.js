/**
 * WordPress dependencies
 */
import { __, isRTL } from '@wordpress/i18n';

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
				{/* Saved as logical sides (the start is the left in
				left-to-right languages), labelled as the editor sees them. */}
				<ToggleGroupControlOption
					value="start"
					label={
						isRTL() ? __('Right', 'matter') : __('Left', 'matter')
					}
				/>
				<ToggleGroupControlOption
					value="end"
					label={
						isRTL() ? __('Left', 'matter') : __('Right', 'matter')
					}
				/>
			</ToggleGroupControl>
		</OverlayEdit>
	);
}
