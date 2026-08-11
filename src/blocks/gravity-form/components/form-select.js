/**
 * WordPress dependencies
 */
import { SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import FormSelectHelp from './form-select-help';

export default function FormSelect({ attributes, setAttributes, formOptions }) {
	const { formId } = attributes;

	return (
		<SelectControl
			label={__('Form', 'matter')}
			value={formId}
			options={formOptions}
			onChange={(value) => setAttributes({ formId: value })}
			help={<FormSelectHelp formId={formId} />}
		/>
	);
}
