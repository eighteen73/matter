/**
 * WordPress dependencies
 */
import {
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanel as ToolsPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import FormSelect from './form-select';

export default function GravityFormInspectorControls({
	attributes,
	setAttributes,
	formOptions,
}) {
	const { formId } = attributes;

	return (
		<InspectorControls>
			<ToolsPanel
				label={__('Settings', 'matter')}
				resetAll={() => {
					setAttributes({});
				}}
			>
				<ToolsPanelItem
					label={__('Form', 'matter')}
					hasValue={() => !!formId}
					onDeselect={() => setAttributes({ formId: '' })}
					isShownByDefault
				>
					<FormSelect
						attributes={attributes}
						setAttributes={setAttributes}
						formOptions={formOptions}
					/>
				</ToolsPanelItem>
			</ToolsPanel>
		</InspectorControls>
	);
}
