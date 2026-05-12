import { useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

/**
 * @return {Element} Element to render.
 */
export default function Edit() {
	const blockProps = useBlockProps();

	return (
		<div {...blockProps}>
			<button
				className="embla__button embla__button--previous"
				data-wp-on--click="actions.scrollPrev"
			>
				<span className="embla__button-label">
					{__('Previous slide', 'eighteen73-blocks')}
				</span>
			</button>
		</div>
	);
}
