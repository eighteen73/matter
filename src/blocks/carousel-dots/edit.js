/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	useBlockProps,
	withColors,
	__experimentalUseMultipleOriginColorsAndGradients as useMultipleOriginColorsAndGradients,
} from '@wordpress/block-editor';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import SingleColorControl from '../../components/single-color-control';
import { getDotColorStyles } from '../../utils/block-color';

function Edit( {
	attributes,
	setAttributes,
	dotColor,
	setDotColor,
	dotActiveColor,
	setDotActiveColor,
	style,
	clientId,
} ) {
	const colorGradientSettings = useMultipleOriginColorsAndGradients();

	const dotColorStyles = useMemo(
		() => getDotColorStyles( attributes, dotColor, dotActiveColor ),
		[
			attributes.dotColor,
			attributes.customDotColor,
			attributes.dotActiveColor,
			attributes.customDotActiveColor,
			dotColor?.slug,
			dotColor?.color,
			dotActiveColor?.slug,
			dotActiveColor?.color,
		]
	);

	const blockProps = useBlockProps( {
		className: 'embla__dots',
		style: {
			...style,
			...dotColorStyles,
		},
	} );

	function resetAllDotColors() {
		setDotColor( undefined );
		setDotActiveColor( undefined );
		setAttributes( {
			dotColor: undefined,
			customDotColor: undefined,
			dotActiveColor: undefined,
			customDotActiveColor: undefined,
		} );
	}

	return (
		<>
			<InspectorControls group="color">
				<SingleColorControl
					label={ __( 'Dot colour', 'eighteen73-blocks' ) }
					colorValue={ dotColor }
					setValue={ setDotColor }
					clientId={ clientId }
					colorGradientSettings={ colorGradientSettings }
					resetAllFilter={ resetAllDotColors }
				/>
				<SingleColorControl
					label={ __( 'Dot active colour', 'eighteen73-blocks' ) }
					colorValue={ dotActiveColor }
					setValue={ setDotActiveColor }
					clientId={ clientId }
					colorGradientSettings={ colorGradientSettings }
					resetAllFilter={ resetAllDotColors }
				/>
			</InspectorControls>

			<div { ...blockProps } />
		</>
	);
}

export default withColors( {
	dotColor: 'dot-color',
	dotActiveColor: 'dot-active-color',
} )( Edit );
