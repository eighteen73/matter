/**
 * Image crop for galleries and image carousels: one of the theme's aspect
 * ratio presets, chosen on the parent block and applied to every image
 * through `--image-aspect-ratio` (see includes/classes/AspectRatio.php).
 */

/**
 * WordPress dependencies
 */
import { useSettings } from '@wordpress/block-editor';
import { SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const kebabCase = (slug) =>
	slug
		.replace(/([a-z])([A-Z0-9])/g, '$1-$2')
		.replace(/[\s_]+/g, '-')
		.toLowerCase();

/**
 * The theme's aspect ratio presets (and core's, if the theme allows them).
 *
 * @return {Array} Presets ({ name, slug, ratio }).
 */
export function useAspectRatios() {
	const [themeRatios, defaultRatios, showDefaults] = useSettings(
		'dimensions.aspectRatios.theme',
		'dimensions.aspectRatios.default',
		'dimensions.defaultAspectRatios'
	);

	return [
		...(themeRatios ?? []),
		...(showDefaults ? (defaultRatios ?? []) : []),
	];
}

/**
 * Inline style setting `--image-aspect-ratio`, as the server renders it.
 *
 * @param {string} slug    Preset slug, or 'auto'.
 * @param {Array}  presets Presets from useAspectRatios().
 * @return {Object|undefined} Style.
 */
export function aspectRatioStyle(slug, presets) {
	if (slug === 'auto') {
		return { '--image-aspect-ratio': 'auto' };
	}

	return presets.some((preset) => preset.slug === slug)
		? {
				'--image-aspect-ratio': `var(--wp--preset--aspect-ratio--${kebabCase(
					slug
				)})`,
			}
		: undefined;
}

/**
 * @param {Object}   props
 * @param {string}   props.value    Preset slug, or 'auto'.
 * @param {Array}    props.presets  Presets from useAspectRatios().
 * @param {Function} props.onChange Called with a slug.
 * @return {Element} Control.
 */
export function AspectRatioControl({ value, presets, onChange }) {
	return (
		<SelectControl
			__nextHasNoMarginBottom
			__next40pxDefaultSize
			label={__('Aspect ratio', 'matter')}
			help={
				value === 'auto'
					? __('Images keep their own shape.', 'matter')
					: __('Every image is cropped to match.', 'matter')
			}
			value={value}
			options={[
				{ label: __('Original', 'matter'), value: 'auto' },
				...presets.map((preset) => ({
					label: preset.name,
					value: preset.slug,
				})),
			]}
			onChange={onChange}
		/>
	);
}
