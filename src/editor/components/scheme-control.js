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

// A palette colour referenced inside another value, e.g. in `color-mix()`.
const PALETTE_REFERENCE =
	/var\(--wp--preset--color--([\w-]+)\s*(?:,[^()]*)?\)|var:preset\|color\|([\w-]+)/g;

/**
 * Resolve a theme.json value (`var:preset|color|base`, `var(--wp--custom--…)`,
 * a literal colour, or a CSS colour function such as `color-mix()` that
 * references palette colours) to something the inspector can paint. The
 * inspector sits outside the editor canvas, so theme CSS variables aren't
 * available: palette references are replaced with their resolved values.
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
		// Literal colour, or a colour function referencing palette colours.
		return value.replace(
			PALETTE_REFERENCE,
			(reference, slug, shortSlug) => {
				const color = palette?.find(
					(entry) => entry.slug === (slug ?? shortSlug)
				)?.color;

				return color
					? resolveColor(color, palette, custom, depth + 1)
					: reference;
			}
		);
	}

	const segments = shorthand ? path.split('|') : path.split('--');

	if (kind === 'preset') {
		const slug = segments[segments.length - 1];
		const color = palette?.find((entry) => entry.slug === slug)?.color;

		return color ? resolveColor(color, palette, custom, depth + 1) : value;
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
									tokens['text-heading'] ?? tokens.text,
									palette,
									custom
								),
								'--swatch-accent': resolveColor(
									tokens['background-fill'] ??
										tokens['text-link'],
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
