/**
 * WordPress dependencies
 */
import { BlockControls } from '@wordpress/block-editor';
import { ToolbarButton } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { pencil, settings } from '@wordpress/icons';
import { addQueryArgs } from '@wordpress/url';

/**
 * Block toolbar links to the Gravity Forms editor and settings screens.
 *
 * @param {Object} props        Component props.
 * @param {string} props.formId Selected form ID.
 * @return {Element|null} Toolbar controls, or null when no form is selected.
 */
export default function GravityFormBlockControls({ formId }) {
	if (!formId) {
		return null;
	}

	const adminUrl = window.matterGravityForm?.adminUrl ?? '';

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

	return (
		<BlockControls group="other">
			<ToolbarButton
				as="a"
				href={editFormUrl}
				target="_blank"
				rel="noopener noreferrer"
				icon={pencil}
				showTooltip
				label={__('Edit Form', 'matter')}
			/>

			<ToolbarButton
				as="a"
				href={formSettingsUrl}
				target="_blank"
				rel="noopener noreferrer"
				icon={settings}
				showTooltip
				label={__('Form Settings', 'matter')}
			/>
		</BlockControls>
	);
}
