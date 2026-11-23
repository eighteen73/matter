/**
 * WordPress dependencies
 */
import {
	SelectControl,
	TextControl,
	TextareaControl,
	ToggleControl,
} from '@wordpress/components';

/**
 * Internal dependencies
 */
import MediaField from './media-field';
import RepeaterField from './repeater-field';
import { withScheme } from '../with-scheme';

const INPUT_TYPES = {
	text: 'text',
	email: 'email',
	tel: 'tel',
};

/**
 * A single settings field.
 *
 * @param {Object}   props
 * @param {Object}   props.field    Field definition.
 * @param {*}        props.value    Current value.
 * @param {Function} props.onChange Change handler.
 * @param {Object}   props.media    Map of attachment ID => preview URL.
 * @return {Element} Field control.
 */
export default function Field({ field, value, onChange, media }) {
	const common = {
		label: field.label,
		help: field.help || undefined,
		__nextHasNoMarginBottom: true,
	};

	switch (field.type) {
		case 'textarea':
			return (
				<TextareaControl
					{...common}
					value={value ?? ''}
					onChange={onChange}
					rows={4}
				/>
			);

		case 'number':
			return (
				<TextControl
					{...common}
					__next40pxDefaultSize
					type="number"
					value={value ?? ''}
					onChange={(next) => {
						// A number too large to be one (`1e999`) stays text, so
						// saving says so rather than silently emptying it.
						const number = Number(next);
						if (next === '') {
							onChange(null);
						} else {
							onChange(Number.isFinite(number) ? number : next);
						}
					}}
				/>
			);

		case 'toggle':
			return (
				<ToggleControl
					{...common}
					checked={!!value}
					onChange={onChange}
				/>
			);

		case 'select':
			return (
				<SelectControl
					{...common}
					__next40pxDefaultSize
					value={value ?? ''}
					onChange={onChange}
					options={[
						{ label: '—', value: '' },
						...Object.entries(field.options).map(
							([optionValue, label]) => ({
								value: optionValue,
								label,
							})
						),
					]}
				/>
			);

		// A text field, not `type="url"`: the browser refused addresses typed
		// without `https://`, without saying why. It's added when the field
		// is left.
		case 'url':
			return (
				<TextControl
					{...common}
					__next40pxDefaultSize
					type="text"
					inputMode="url"
					autoComplete="url"
					spellCheck={false}
					placeholder="https://"
					value={value ?? ''}
					onChange={onChange}
					onBlur={() => {
						const next = withScheme(value);

						if (next !== (value ?? '')) {
							onChange(next);
						}
					}}
				/>
			);

		case 'media':
			return (
				<MediaField
					field={field}
					value={value}
					onChange={onChange}
					media={media}
				/>
			);

		case 'repeater':
			return (
				<RepeaterField
					field={field}
					value={value}
					onChange={onChange}
					media={media}
				/>
			);

		default:
			return (
				<TextControl
					{...common}
					__next40pxDefaultSize
					type={INPUT_TYPES[field.type] ?? 'text'}
					value={value ?? ''}
					onChange={onChange}
				/>
			);
	}
}
