/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	useBlockProps,
	withColors,
	__experimentalUseMultipleOriginColorsAndGradients as useMultipleOriginColorsAndGradients,
} from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import SingleColorControl from '../../components/single-color-control';
import { getProgressBarColorStyles } from '../../utils/block-color';

function Edit( {
	attributes,
	setAttributes,
	barColor,
	setBarColor,
	style,
	clientId,
} ) {
	const { indicateCurrentPosition } = attributes;
	const colorGradientSettings = useMultipleOriginColorsAndGradients();

	const barColorStyles = useMemo(
		() => getProgressBarColorStyles( attributes, barColor ),
		[
			attributes.barColor,
			attributes.customBarColor,
			barColor?.slug,
			barColor?.color,
		]
	);

	const blockProps = useBlockProps( {
		className: 'embla__progress',
		style: {
			...style,
			...barColorStyles,
		},
	} );

	function resetBarColor() {
		setBarColor( undefined );
		setAttributes( {
			barColor: undefined,
			customBarColor: undefined,
		} );
	}

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Settings', 'eighteen73-blocks' ) }
					initialOpen={ true }
				>
					<ToggleControl
						label={ __(
							'Indicate current position',
							'eighteen73-blocks'
						) }
						checked={ indicateCurrentPosition }
						onChange={ () =>
							setAttributes( {
								indicateCurrentPosition:
									! indicateCurrentPosition,
							} )
						}
					/>
				</PanelBody>
			</InspectorControls>

			<InspectorControls group="color">
				<SingleColorControl
					label={ __( 'Bar colour', 'eighteen73-blocks' ) }
					colorValue={ barColor }
					setValue={ setBarColor }
					clientId={ clientId }
					colorGradientSettings={ colorGradientSettings }
					resetAllFilter={ resetBarColor }
				/>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="embla__progress__bar" />
			</div>
		</>
	);
}

export default withColors( {
	barColor: 'bar-color',
} )( Edit );
