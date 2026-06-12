/**
 * WordPress dependencies
 */
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import ColorControl from '../../../components/color-control';
import { getColorStyles, storeColorValue } from '../../../utils/colors';

function NavButtonEdit({ attributes, setAttributes, clientId, direction }) {
	const { iconColor } = attributes;

	const colorStyles = getColorStyles(attributes, 'carousel');

	const isNext = direction === 'next';

	const blockProps = useBlockProps({
		style: colorStyles,
	});

	return (
		<>
			<InspectorControls group="color">
				<ColorControl
					label={__('Icon', 'eighteen73-blocks')}
					value={iconColor}
					onChange={(value, slug) =>
						setAttributes({
							iconColor: storeColorValue(slug, value),
						})
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
