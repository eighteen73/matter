/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';
import { useDispatch, useSelect } from '@wordpress/data';

/**
 * Add a slide to a carousel: a new, empty block like the last slide (e.g.
 * another card).
 *
 * @param {string} clientId Carousel client ID.
 * @return {Object} `lastSlide` (block), `slideCount` and `addSlide()`.
 */
export function useAddSlide(clientId) {
	const { lastSlide, slideCount } = useSelect(
		(select) => {
			const blocks = select(blockEditorStore).getBlocks(clientId);

			return {
				lastSlide: blocks[blocks.length - 1],
				slideCount: blocks.length,
			};
		},
		[clientId]
	);
	const { insertBlock } = useDispatch(blockEditorStore);

	const addSlide = () =>
		insertBlock(
			createBlock(lastSlide?.name ?? 'core/image'),
			slideCount,
			clientId
		);

	return { lastSlide, slideCount, addSlide };
}
