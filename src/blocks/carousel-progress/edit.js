/**
 * WordPress dependencies
 */
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import ColorControl from '../../components/color-control';
import { getBlockStyles } from '../../utils/block-styles';
import { storeColorValue } from '../../utils/colors';

export default function Edit({ attributes, setAttributes, clientId }) {
	const { indicateCurrentPosition, barColor } = attributes;

	const colorStyles = getBlockStyles(attributes, 'carousel');

	const blockProps = useBlockProps({
		className: 'embla__progress',
		style: colorStyles,
	});

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Settings', 'matter')} initialOpen={true}>
					<ToggleControl
						label={__('Indicate current position', 'matter')}
						checked={indicateCurrentPosition}
						onChange={() =>
							setAttributes({
								indicateCurrentPosition:
									!indicateCurrentPosition,
							})
						}
					/>
				</PanelBody>
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
