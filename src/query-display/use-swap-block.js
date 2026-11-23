/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { useRegistry } from '@wordpress/data';
import { useCallback } from '@wordpress/element';

/**
 * Replace a block with another, where the editor may not offer the new one
 * (e.g. a posts carousel, which is a Query Loop, in a section's slot or with
 * the theme's allowed blocks). Uses `replaceBlocks` when the block can be
 * inserted there, otherwise replaces it among its siblings.
 *
 * @return {Function} `( clientId, block, { persistent = true } )`.
 */
export function useSwapBlock() {
	const registry = useRegistry();

	return useCallback(
		(clientId, block, { persistent = true } = {}) => {
			const { canInsertBlockType, getBlockRootClientId, getBlocks } =
				registry.select(blockEditorStore);
			const {
				replaceBlocks,
				replaceInnerBlocks,
				selectBlock,
				__unstableMarkNextChangeAsNotPersistent: markNotPersistent,
			} = registry.dispatch(blockEditorStore);
			const rootClientId = getBlockRootClientId(clientId) ?? '';

			if (!persistent) {
				markNotPersistent();
			}

			if (canInsertBlockType(block.name, rootClientId)) {
				replaceBlocks(clientId, block);
				return;
			}

			replaceInnerBlocks(
				rootClientId,
				getBlocks(rootClientId).map((sibling) =>
					sibling.clientId === clientId ? block : sibling
				),
				false
			);
			selectBlock(block.clientId);
		},
		[registry]
	);
}
