import { __ } from '@wordpress/i18n';
import { ExternalLink } from '@wordpress/components';
import { addQueryArgs } from '@wordpress/url';
import { createInterpolateElement } from '@wordpress/element';

export default function FormSelectHelp({ formId }) {
	const adminUrl = window.matterGravityForm?.adminUrl ?? '';

	if (!formId) {
		return __('Select a form to display.', 'matter');
	}

	if (!adminUrl) {
		return null;
	}

	const editFormUrl = addQueryArgs(adminUrl, {
		page: 'gf_edit_forms',
		id: formId,
	});

	const formSettingsUrl = addQueryArgs(adminUrl, {
		page: 'gf_edit_forms',
		id: formId,
		view: 'settings',
	});

	const editFormHelp = createInterpolateElement(
		__('Edit form in the <a>Form editor</a>', 'matter'),
		{
			a: <ExternalLink href={editFormUrl} />,
		}
	);

	const formSettingsHelp = createInterpolateElement(
		__('Edit form settings in the <a>Form settings</a>', 'matter'),
		{
			a: <ExternalLink href={formSettingsUrl} />,
		}
	);

	return (
		<>
			{editFormHelp}
			<br />
			{formSettingsHelp}
		</>
	);
}
