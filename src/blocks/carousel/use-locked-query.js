/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { useRegistry, useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';

/**
 * Lock a carousel's query (Query Loop or Product Collection) and everything
 * in it, so its blocks can't be selected or edited in the canvas: clicking a
 * slide selects the carousel, whose inspector edits the query instead.
 *
 * Sets the block editing mode of the query and each descendant to
 * 'disabled' (block-editor's public `setBlockEditingMode`), and unsets them
 * again on cleanup. Reapplied whenever the query's blocks change. Not saved
 * with the post, so it isn't an undo step either.
 *
 * @param {string|undefined} queryId Client ID of the query block, if any.
 */
export function useLockedQuery(queryId) {
	const registry = useRegistry();

	// As a string, so edits elsewhere in the post don't reapply the lock.
	const descendants = useSelect(
		(select) =>
			queryId
				? select(blockEditorStore)
						.getClientIdsOfDescendants(queryId)
						.join(' ')
				: '',
		[queryId]
	);

	useEffect(() => {
		if (!queryId) {
			return;
		}

		const clientIds = [queryId, ...descendants.split(' ').filter(Boolean)];
		const {
			setBlockEditingMode,
			unsetBlockEditingMode,
			__unstableMarkNextChangeAsNotPersistent: markNotPersistent,
		} = registry.dispatch(blockEditorStore);

		registry.batch(() => {
			clientIds.forEach((id) => {
				markNotPersistent();
				setBlockEditingMode(id, 'disabled');
			});
		});

		return () => {
			registry.batch(() => {
				clientIds.forEach((id) => {
					markNotPersistent();
					unsetBlockEditingMode(id);
				});
			});
		};
	}, [registry, queryId, descendants]);
}
