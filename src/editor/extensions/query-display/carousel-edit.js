/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { useDispatch } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import {
	CarouselFrame,
	carouselClasses,
	useLiveCarousel,
	variantOptions,
} from '../../../carousel/editor/live-carousel';
import { ATTRIBUTE } from '../../../query-display/templates';
import { useLockedQuery } from '../../../query-display/use-locked-query';
import DisplayPanel from './panel';

/**
 * A query shown as a carousel: the live carousel around the query's editor,
 * as the front end wraps its output. Its slides are the theme's loop items.
 *
 * @param {Object}  props
 * @param {Element} props.BlockEdit The query's edit component.
 * @param {Object}  props.props     Its props.
 * @return {Element} Carousel.
 */
export default function CarouselEdit({ BlockEdit, props }) {
	const { attributes, setAttributes, clientId, isSelected } = props;
	const display = attributes[ATTRIBUTE];
	const styleClass = display.style ? `is-style-${display.style}` : '';
	const options = variantOptions('matter/carousel', styleClass);
	const live = useLiveCarousel(options);

	useLockedQuery(clientId);

	const set = (changes) =>
		setAttributes({ [ATTRIBUTE]: { ...display, ...changes } });

	// The whole carousel acts as the block: clicking its controls (outside
	// the query's own element) selects it too, and it has the outline.
	const { selectBlock } = useDispatch(blockEditorStore);

	return (
		<>
			{isSelected && <DisplayPanel display={display} set={set} />}
			{/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- Mouse only: keyboard users reach the block as usual. */}
			<div
				className={[
					'wp-block-matter-carousel',
					'matter-query-display',
					'is-query',
					attributes.align && `align${attributes.align}`,
					styleClass,
					display.scheme && `has-scheme has-scheme-${display.scheme}`,
					carouselClasses(live),
					isSelected && 'is-block-selected',
				]
					.filter(Boolean)
					.join(' ')}
				role="region"
				aria-roledescription={__('carousel', 'matter')}
				aria-label={display.label || undefined}
				onClick={() => !isSelected && selectBlock(clientId)}
			>
				<CarouselFrame carousel={live} options={options}>
					<div
						className="wp-block-matter-carousel__viewport"
						ref={live.ref}
					>
						<div className="wp-block-matter-carousel__track">
							<BlockEdit {...props} />
						</div>
					</div>
				</CarouselFrame>
			</div>
		</>
	);
}
