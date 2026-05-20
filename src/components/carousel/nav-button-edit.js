/**
 * WordPress dependencies
 */
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { getButtonIconColorStyles } from '../../utils/block-color';
import ColorControl from '../color-control';

function NavButtonEdit({
	attributes,
	setAttributes,
	style,
	clientId,
	direction,
}) {
	const { arrowColor } = attributes;
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

	return (
		<>
			<InspectorControls group="color">
				<ColorControl
					label={__('Arrow colour', 'eighteen73-blocks')}
					value={arrowColor}
					onChange={(value, slug) =>
						setAttributes({ arrowColor: slug })
					}
					panelId={clientId}
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

export default function createNavButtonEdit(direction) {
	return function Edit(props) {
		return <NavButtonEdit {...props} direction={direction} />;
	};
}
