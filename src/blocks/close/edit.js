import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	TextControl,
	ToggleControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanel as ToolsPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Update block attributes.
 * @return {Element} Element to render.
 */
export default function Edit({ attributes, setAttributes }) {
	const { label, showLabel } = attributes;
	const buttonLabel = label || __('Close', 'matter');
	const blockProps = useBlockProps({
		'aria-label': buttonLabel,
	});

	return (
		<>
			<InspectorControls>
				<ToolsPanel
					label={__('Settings', 'matter')}
					resetAll={() =>
						setAttributes({ label: 'Close', showLabel: false })
					}
				>
					<ToolsPanelItem
						label={__('Label', 'matter')}
						hasValue={() => !!label}
						onDeselect={() => setAttributes({ label: 'Close' })}
						isShownByDefault
					>
						<TextControl
							label={__('Label', 'matter')}
							value={label}
							onChange={(value) =>
								setAttributes({ label: value })
							}
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={__('Show label', 'matter')}
						hasValue={() => !!showLabel}
						onDeselect={() => setAttributes({ showLabel: false })}
						isShownByDefault
					>
						<ToggleControl
							label={__('Show label', 'matter')}
							checked={showLabel}
							onChange={(value) =>
								setAttributes({ showLabel: value })
							}
						/>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>

			<button {...blockProps}>
				{showLabel && (
					<span className="wp-block-matter-close__label">
						{buttonLabel}
					</span>
				)}
			</button>
		</>
	);
}
