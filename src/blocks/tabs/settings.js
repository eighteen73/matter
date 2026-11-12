/**
 * WordPress dependencies
 */
import { TextControl, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import {
	ToggleGroupControl,
	ToggleGroupControlOption,
	ToolsPanelItem,
} from '../../components/compat';

/**
 * The tabs' settings, as ToolsPanel items: used by the tabs block and by tabs
 * of posts (a query shown as tabs).
 *
 * @param {Object}   props
 * @param {Object}   props.values Current settings (the block's attributes).
 * @param {Function} props.set    Receives changed settings.
 * @return {Element} Panel items.
 */
export function TabsSettings({ values, set }) {
	const orientation = values.orientation || 'horizontal';

	return (
		<>
			<ToolsPanelItem
				label={__('Name', 'matter')}
				hasValue={() => !!values.label}
				onDeselect={() => set({ label: undefined })}
				isShownByDefault
			>
				<TextControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={__('Name', 'matter')}
					help={__(
						'Describes the tab list to screen readers.',
						'matter'
					)}
					value={values.label ?? ''}
					onChange={(label) => set({ label })}
				/>
			</ToolsPanelItem>
			<ToolsPanelItem
				label={__('Orientation', 'matter')}
				hasValue={() => orientation !== 'horizontal'}
				onDeselect={() => set({ orientation: undefined })}
				isShownByDefault
			>
				<ToggleGroupControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					isBlock
					label={__('Orientation', 'matter')}
					value={orientation}
					onChange={(value) => set({ orientation: value })}
				>
					<ToggleGroupControlOption
						value="horizontal"
						label={__('Horizontal', 'matter')}
					/>
					<ToggleGroupControlOption
						value="vertical"
						label={__('Vertical', 'matter')}
					/>
				</ToggleGroupControl>
			</ToolsPanelItem>
			<ToolsPanelItem
				label={__('Link to tabs', 'matter')}
				hasValue={() => !!values.deepLink}
				onDeselect={() => set({ deepLink: undefined })}
				isShownByDefault
			>
				<ToggleControl
					__nextHasNoMarginBottom
					label={__('Link to tabs', 'matter')}
					help={__(
						'Update the address bar when a tab is chosen, so it can be shared.',
						'matter'
					)}
					checked={!!values.deepLink}
					onChange={(deepLink) => set({ deepLink })}
				/>
			</ToolsPanelItem>
			<ToolsPanelItem
				label={__('Dropdown on smaller screens', 'matter')}
				hasValue={() => !!values.dropdown}
				onDeselect={() => set({ dropdown: undefined })}
				isShownByDefault
			>
				<ToggleControl
					__nextHasNoMarginBottom
					label={__(
						'Show as a dropdown on smaller screens',
						'matter'
					)}
					help={__(
						'Replace the tabs with a dropdown menu where there is less room.',
						'matter'
					)}
					checked={!!values.dropdown}
					onChange={(dropdown) => set({ dropdown })}
				/>
			</ToolsPanelItem>
		</>
	);
}

// What resetting the panel clears.
export const TABS_SETTINGS = ['label', 'orientation', 'deepLink', 'dropdown'];
