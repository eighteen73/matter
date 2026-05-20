/**
 * WordPress dependencies
 */
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { getDotColorStyles } from '../../utils/block-color';
import ColorControl from '../../components/color-control';

export default function Edit({ attributes, setAttributes, style, clientId }) {
	const { dotColor, dotActiveColor } = attributes;

	const dotColorStyles = useMemo(
		() => getDotColorStyles(attributes, dotColor, dotActiveColor),
		[attributes, dotColor, dotActiveColor]
	);

	const blockProps = useBlockProps({
		className: 'embla__dots',
		style: {
			...style,
			...dotColorStyles,
		},
	});

	return (
		<>
			<InspectorControls group="color">
				<ColorControl
					label={__('Dot colour', 'eighteen73-blocks')}
					value={dotColor}
					onChange={(value, slug) =>
						setAttributes({ dotColor: slug })
					}
					panelId={clientId}
				/>

				<ColorControl
					label={__('Dot active colour', 'eighteen73-blocks')}
					value={dotActiveColor}
					onChange={(value, slug) =>
						setAttributes({ dotActiveColor: slug })
					}
					panelId={clientId}
				/>
			</InspectorControls>

			<div {...blockProps} />
		</>
	);
}
