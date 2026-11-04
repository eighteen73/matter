/**
 * WordPress dependencies
 */
import { useSettings } from '@wordpress/block-editor';
import {
	BaseControl,
	Button,
	useBaseControlProps,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

const { schemes = [] } = window.matterEditor ?? {};

/**
 * Resolve a theme.json value (`var:preset|color|base`, `var(--wp--custom--…)`
 * or a literal colour) to something the inspector can paint. The inspector
 * sits outside the editor canvas, so theme CSS variables aren't available.
 *
 * @param {string} value   Raw value.
 * @param {Array}  palette Theme palette.
 * @param {Object} custom  Theme custom settings.
 * @param {number} depth   Recursion guard.
 * @return {string} CSS colour.
 */
const resolveColor = (value, palette, custom, depth = 0) => {
	if (typeof value !== 'string' || depth > 5) {
		return 'transparent';
	}

	const shorthand = value.match(/^var:(preset|custom)\|(.+)$/);
	const variable = value.match(/^var\(--wp--(preset|custom)--([^),]+)/);
	const [, kind, path] = shorthand || variable || [];

	if (!kind) {
		return value;
	}

	const segments = shorthand ? path.split('|') : path.split('--');

	if (kind === 'preset') {
		const slug = segments[segments.length - 1];

		return palette?.find((color) => color.slug === slug)?.color ?? value;
	}

	const resolved = segments.reduce((node, key) => node?.[key], custom);

	return resolveColor(resolved, palette, custom, depth + 1);
};

/**
 * Visual colour scheme picker.
 *
 * Choosing the active scheme again clears it, so the block inherits the
 * scheme of whatever it's placed in.
 *
 * @param {Object}   props
 * @param {string}   props.value    Selected scheme slug.
 * @param {Function} props.onChange Receives a slug, or undefined to inherit.
 * @return {Element} Scheme control.
 */
export default function SchemeControl({ value, onChange }) {
	const [palette, custom] = useSettings('color.palette.theme', 'custom');
	const { baseControlProps } = useBaseControlProps({
		label: __('Colour scheme', 'matter'),
		help: value
			? __('Select the active scheme again to inherit.', 'matter')
			: __('Inherits the surrounding colour scheme.', 'matter'),
		__nextHasNoMarginBottom: true,
	});

	if (!schemes.length) {
		return null;
	}

	return (
		<BaseControl {...baseControlProps}>
			<div className="matter-scheme-control">
				{schemes.map(({ slug, label, tokens }) => {
					const isSelected = value === slug;

					return (
						<Button
							key={slug}
							className="matter-scheme-control__swatch"
							aria-pressed={isSelected}
							label={
								isSelected
									? sprintf(
											/* translators: %s: colour scheme name */
											__('%s (selected)', 'matter'),
											label
										)
									: label
							}
							showTooltip
							onClick={() =>
								onChange(isSelected ? undefined : slug)
							}
							style={{
								'--swatch-background': resolveColor(
									tokens.background,
									palette,
									custom
								),
								'--swatch-text': resolveColor(
									tokens.heading ?? tokens.text,
									palette,
									custom
								),
								'--swatch-accent': resolveColor(
									tokens['button-background'] ?? tokens.link,
									palette,
									custom
								),
							}}
						>
							<span aria-hidden="true">Aa</span>
						</Button>
					);
				})}
			</div>
		</BaseControl>
	);
}
