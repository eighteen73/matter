/**
 * WordPress dependencies
 */
import { useSettings } from '@wordpress/block-editor';
import { RangeControl, SelectControl } from '@wordpress/components';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const RANGE_CONTROL_MAX_SIZE = 8;

const getSliderIndex = (value, presets) => {
	if (!value) {
		return 0;
	}

	const index = presets.findIndex((preset) => preset.slug === value);

	return index === -1 ? 0 : index;
};

const getSlugFromIndex = (index, presets) => presets[index]?.slug ?? '';

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
	const [spacingPresets] = useSettings([
		'spacing',
		'spacingSizes',
		'theme',
	]) || [[]];

	const presets = useMemo(
		() => [
			{ name: __('None', 'eighteen73-blocks'), slug: '', size: 0 },
			...(spacingPresets || []).map((preset) => ({
				name: preset.name,
				slug: preset.slug || '',
				size: preset.size,
			})),
		],
		[spacingPresets]
	);

	const currentIndex = getSliderIndex(value, presets);
	const showRangeControl = presets.length <= RANGE_CONTROL_MAX_SIZE;
	const spacingOptions = presets
		.map((preset) => ({
			value: preset.slug,
			label: preset.name || String(preset.slug || '').toUpperCase(),
		}))
		.filter((option) => option.value !== undefined && option.label);

	if (showRangeControl) {
		return (
			<RangeControl
				aria-valuenow={currentIndex}
				aria-valuetext={presets[currentIndex]?.name}
				label={label}
				value={currentIndex}
				onChange={(nextValue) => {
					if (onChange) {
						onChange(getSlugFromIndex(nextValue, presets));
					}
				}}
				marks={presets.slice(1, -1).map((_, index) => ({
					value: index + 1,
					label: undefined,
				}))}
				min={0}
				max={presets.length - 1}
				step={1}
				renderTooltipContent={(nextValue) => presets[nextValue]?.name}
				withInputField={false}
				__next40pxDefaultSize
			/>
		);
	}

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
