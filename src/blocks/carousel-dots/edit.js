/**
 * WordPress dependencies
 */
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import ColorControl from '../../components/color-control';
import { getColorStyles, storeColorValue } from '../../utils/colors';

export default function Edit({ attributes, setAttributes, clientId }) {
	const { dotColor, dotActiveColor } = attributes;

	const colorStyles = getColorStyles(attributes, 'carousel');

	const blockProps = useBlockProps({
		className: 'embla__dots',
		style: colorStyles,
	});

	return (
		<>
			<InspectorControls group="color">
				<ColorControl
					label={__('Dot', 'eighteen73-blocks')}
					value={dotColor}
					onChange={(value, slug) =>
						setAttributes({
							dotColor: storeColorValue(slug, value),
						})
					}
					panelId={clientId}
				/>

				<ColorControl
					label={__('Active dot', 'eighteen73-blocks')}
					value={dotActiveColor}
					onChange={(value, slug) =>
						setAttributes({
							dotActiveColor: storeColorValue(slug, value),
						})
					}
					panelId={clientId}
				/>
			</InspectorControls>

			<div {...blockProps} />
		</>
	);
}
