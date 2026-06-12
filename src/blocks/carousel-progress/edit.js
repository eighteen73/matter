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
import { getColorStyles, storeColorValue } from '../../utils/colors';

export default function Edit({ attributes, setAttributes, clientId }) {
	const { indicateCurrentPosition, barColor } = attributes;

	const colorStyles = getColorStyles(attributes, 'carousel');

	const blockProps = useBlockProps({
		className: 'embla__progress',
		style: colorStyles,
	});

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={__('Settings', 'eighteen73-blocks')}
					initialOpen={true}
				>
					<ToggleControl
						label={__(
							'Indicate current position',
							'eighteen73-blocks'
						)}
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
					label={__('Bar', 'eighteen73-blocks')}
					value={barColor}
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
