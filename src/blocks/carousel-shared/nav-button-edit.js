/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	useBlockProps,
	withColors,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalUseMultipleOriginColorsAndGradients as useMultipleOriginColorsAndGradients,
} from '@wordpress/block-editor';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import SingleColorControl from '../../components/single-color-control';
import { getButtonIconColorStyles } from '../../utils/block-color';

function NavButtonEdit({
	attributes,
	setAttributes,
	arrowColor,
	setArrowColor,
	style,
	clientId,
	direction,
}) {
	const colorGradientSettings = useMultipleOriginColorsAndGradients();
	const isNext = direction === 'next';

	const iconColorStyles = useMemo(
		() => getButtonIconColorStyles(attributes, arrowColor),
		[attributes, arrowColor]
	);

	const blockProps = useBlockProps({
		style: {
			...style,
			...iconColorStyles,
		},
	});

	function resetArrowColor() {
		setArrowColor(undefined);
		setAttributes({
			arrowColor: undefined,
			customArrowColor: undefined,
		});
	}

	return (
		<>
			<InspectorControls group="color">
				<SingleColorControl
					label={__('Arrow colour', 'eighteen73-blocks')}
					colorValue={arrowColor}
					setValue={setArrowColor}
					clientId={clientId}
					colorGradientSettings={colorGradientSettings}
					resetAllFilter={resetArrowColor}
				/>
			</InspectorControls>

			<div {...blockProps}>
				<button
					className={
						isNext
							? 'embla__button embla__button--next'
							: 'embla__button embla__button--previous'
					}
					data-wp-on--click={
						isNext ? 'actions.scrollNext' : 'actions.scrollPrev'
					}
				>
					<span className="embla__button-label">
						{isNext
							? __('Next slide', 'eighteen73-blocks')
							: __('Previous slide', 'eighteen73-blocks')}
					</span>
				</button>
			</div>
		</>
	);
}

const NavButtonEditWithColors = withColors({
	arrowColor: 'arrow-color',
})(NavButtonEdit);

export default function createNavButtonEdit(direction) {
	return function Edit(props) {
		return <NavButtonEditWithColors {...props} direction={direction} />;
	};
}
