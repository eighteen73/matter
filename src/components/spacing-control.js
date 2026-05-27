/**
 * WordPress dependencies
 */
import { useSettings } from '@wordpress/block-editor';
import { SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * SpacingControl Component
 *
 * A preset-only spacing selector backed by theme spacing sizes.
 *
 * @param {Object}   props          Component properties.
 * @param {string}   props.label    Label for the control.
 * @param {string}   props.value    Current spacing slug value.
 * @param {Function} props.onChange Callback when value changes.
 * @return {JSX.Element} The SpacingControl component.
 */
const SpacingControl = ({ label, value, onChange }) => {
	const spacingPresetsRaw = useSettings([
		'spacing',
		'spacingSizes',
		'theme',
	]) || [[]];
	const spacingPresets = spacingPresetsRaw[0];

	const spacingOptions = [
		{ value: '', label: __('None', 'eighteen73-blocks') },
		...spacingPresets.map((preset) => ({
			value: preset.slug || '',
			label: preset.name || String(preset.slug || '').toUpperCase(),
		})),
	].filter((option) => option.value !== undefined && option.label);

	return (
		<SelectControl
			label={label}
			value={value || ''}
			options={spacingOptions}
			onChange={(nextValue) => {
				if (onChange) {
					onChange(nextValue || '');
				}
			}}
		/>
	);
};

export default SpacingControl;
