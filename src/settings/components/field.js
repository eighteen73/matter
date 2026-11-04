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

const INPUT_TYPES = {
	text: 'text',
	email: 'email',
	url: 'url',
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
					onChange={(next) =>
						onChange(next === '' ? null : Number(next))
					}
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
