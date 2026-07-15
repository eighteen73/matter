/**
 * WordPress dependencies
 */
import {
	ToggleControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanel as ToolsPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function SchemaSettings({ attributes, setAttributes }) {
	const { hasSchema } = attributes;

	return (
		<ToolsPanel
			label={__('Schema Settings', 'matter')}
			resetAll={() => setAttributes({ hasSchema: false })}
		>
			<ToolsPanelItem
				hasValue={() => !!hasSchema}
				label={__('Output schema for FAQs', 'matter')}
				onDeselect={() => setAttributes({ hasSchema: false })}
				isShownByDefault
			>
				<ToggleControl
					label={__('Output schema for FAQs', 'matter')}
					help={__(
						'If using for FAQs, enable this for SEO.',
						'matter'
					)}
					checked={hasSchema}
					onChange={(value) => setAttributes({ hasSchema: value })}
				/>
			</ToolsPanelItem>
		</ToolsPanel>
	);
}
