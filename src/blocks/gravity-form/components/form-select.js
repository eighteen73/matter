import { SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function FormSelect({ attributes, setAttributes, formOptions }) {
	const { formId } = attributes;

	return (
		<SelectControl
			label={__('Form', 'matter')}
			value={formId}
			options={formOptions}
			onChange={(value) => setAttributes({ formId: value })}
		/>
	);
}
