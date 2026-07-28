import { Notice, Placeholder } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import FormSelect from './form-select';

export default function GravityFormPlaceholder({
	forms,
	blockIcon,
	formId,
	hasInvalidFormId,
	attributes,
	setAttributes,
	formOptions,
	previewHtml,
}) {
	if (previewHtml) {
		return null;
	}

	if (!forms.length) {
		return (
			<Placeholder
				icon={blockIcon}
				label={__('Gravity Form', 'matter')}
				instructions={__(
					'You must have at least one form to use the block.',
					'matter'
				)}
			/>
		);
	}

	if (!formId || hasInvalidFormId) {
		return (
			<Placeholder
				icon={blockIcon}
				label={__('Gravity Form', 'matter')}
				instructions={__(
					'Select and display one of your forms.',
					'matter'
				)}
			>
				{hasInvalidFormId && (
					<Notice status="warning" isDismissible={false}>
						{__(
							'The selected form has been deleted or trashed. Please select a new form.',
							'matter'
						)}
					</Notice>
				)}

				<FormSelect
					attributes={attributes}
					setAttributes={setAttributes}
					formOptions={formOptions}
				/>
			</Placeholder>
		);
	}

	return null;
}
