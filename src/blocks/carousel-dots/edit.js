/**
 * WordPress dependencies
 */
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import { useMemo } from '@wordpress/element';

/**
 * Internal dependencies
 */
import ColorControl from '../../components/color-control';
import { getBlockStyles } from '../../utils/block-styles';
import { storeColorValue } from '../../utils/colors';

export default function Edit({ attributes, setAttributes, clientId }) {
	const { dotColor, dotActiveColor } = attributes;

	const cssVarStyles = useMemo(
		() => getBlockStyles(attributes, 'carousel-dots'),
		[attributes]
	);

	const blockProps = useBlockProps({
		className: 'embla__dots',
		style: cssVarStyles,
	});

	return (
		<>
			<InspectorControls group="color">
				<ColorControl
					label={__('Dot', 'matter')}
					value={dotColor}
					attributeName="dotColor"
					onChange={(value, slug) =>
						setAttributes({
							dotColor: storeColorValue(slug, value),
						})
					}
					panelId={clientId}
				/>

				<ColorControl
					label={__('Active dot', 'matter')}
					value={dotActiveColor}
					attributeName="dotActiveColor"
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
