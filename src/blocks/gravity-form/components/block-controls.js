/**
 * WordPress dependencies
 */
import { BlockControls } from '@wordpress/block-editor';
import { ToolbarButton } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { pencil } from '@wordpress/icons';

/**
 * Block toolbar links to the Gravity Forms editor and settings screens.
 *
 * @param {Object}   props               Component props.
 * @param {string}   props.formId        Selected form ID.
 * @param {Function} props.setAttributes Set block attributes.
 * @return {Element|null} Toolbar controls, or null when no form is selected.
 */
export default function GravityFormBlockControls({ formId, setAttributes }) {
	if (!formId) {
		return null;
	}

	const resetForm = () => {
		setAttributes({ formId: '' });
	};

	return (
		<BlockControls group="other">
			<ToolbarButton
				icon={pencil}
				showTooltip
				label={__('Select a Form', 'matter')}
				onClick={resetForm}
			/>
		</BlockControls>
	);
}
