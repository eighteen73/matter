/**
 * Enter at the end of a title (an accordion item's question, a tab's name)
 * moves to its content, as a person expects, rather than adding a line to
 * the title.
 */

/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';
import { useRegistry } from '@wordpress/data';

/**
 * Props for a title's RichText: no line breaks, and Enter at its end goes to
 * the start of the block's first inner block (a new paragraph if it has none).
 * `__unstableOnSplitAtEnd` is RichText's prop for this, as core's blocks use.
 *
 * @param {string} clientId Block whose content follows the title.
 * @return {Object} RichText props.
 */
export function useEnterContent(clientId) {
	const registry = useRegistry();

	return {
		disableLineBreaks: true,
		__unstableOnSplitAtEnd: () => {
			const { getBlockOrder } = registry.select(blockEditorStore);
			const { insertBlock, selectBlock } =
				registry.dispatch(blockEditorStore);
			const [first] = getBlockOrder(clientId);

			if (first) {
				selectBlock(first, 0);
			} else {
				insertBlock(createBlock('core/paragraph'), 0, clientId);
			}
		},
	};
}
