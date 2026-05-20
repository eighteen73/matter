/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	useBlockProps,
	withColors,
} from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { getProgressBarColorStyles } from '../../utils/block-color';
import ColorControl from '../../components/color-control';

function Edit({ attributes, setAttributes, style, clientId }) {
	const { indicateCurrentPosition, barColor } = attributes;

	const barColorStyles = useMemo(
		() => getProgressBarColorStyles(attributes, barColor),
		[attributes, barColor]
	);

	const blockProps = useBlockProps({
		className: 'embla__progress',
		style: {
			...style,
			...barColorStyles,
		},
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
					label={__('Bar colour', 'eighteen73-blocks')}
					value={barColor}
					onChange={(value, slug) =>
						setAttributes({ barColor: slug })
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

export default withColors({
	barColor: 'bar-color',
})(Edit);
