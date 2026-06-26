/**
 * WordPress dependencies
 */
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	ToggleControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanel as ToolsPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useMemo } from '@wordpress/element';

/**
 * Internal dependencies
 */
import ColorControl from '../../components/color-control';
import { getBlockStyles } from '../../utils/block-styles';
import { storeColorValue } from '../../utils/colors';

export default function Edit({ attributes, setAttributes, clientId }) {
	const { indicateCurrentPosition, barColor } = attributes;

	const cssVarStyles = useMemo(
		() => getBlockStyles(attributes, 'carousel-progress'),
		[attributes]
	);

	const blockProps = useBlockProps({
		className: 'embla__progress',
		style: cssVarStyles,
	});

	return (
		<>
			<InspectorControls group="settings">
				<ToolsPanel label={__('Settings', 'matter')}>
					<ToolsPanelItem
						label={__('Indicate current position', 'matter')}
						hasValue={() => !!indicateCurrentPosition}
						onDeselect={() =>
							setAttributes({ indicateCurrentPosition: false })
						}
						isShownByDefault
					>
						<ToggleControl
							label={__('Indicate current position', 'matter')}
							checked={!!indicateCurrentPosition}
							onChange={(value) =>
								setAttributes({
									indicateCurrentPosition: value,
								})
							}
						/>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>

			<InspectorControls group="color">
				<ColorControl
					label={__('Bar', 'matter')}
					value={barColor}
					attributeName="barColor"
					onChange={(value, slug) =>
						setAttributes({
							barColor: storeColorValue(slug, value),
						})
					}
					panelId={clientId}
				/>
			</InspectorControls>

			<div {...blockProps}>
				<div className="embla__progress__bar" />
			</div>
		</>
	);
}
