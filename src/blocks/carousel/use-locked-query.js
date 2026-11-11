/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { useRegistry, useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { carouselQueryAttributes } from './templates';

/**
 * Set up a carousel's query (Query Loop or Product Collection).
 *
 * - The query itself can be selected: clicking a slide selects it, and its
 *   sidebar has the native filters plus the carousel's settings (see
 *   editor/extensions/carousel-query.js). The carousel locks it in place.
 * - Everything inside it (template, loop item) can't be selected or edited:
 *   the design is the theme's. Its block editing mode is 'disabled'
 *   (block-editor's public `setBlockEditingMode`), unset again on cleanup and
 *   reapplied when the query's blocks change.
 * - A query from before carousels marked theirs gets the marker attributes.
 *
 * None of this is an edit: opening a page doesn't mark it as changed.
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

	// What the query still needs to be the carousel's, rechecked when its
	// attributes change.
	const missing = useSelect(
		(select) => {
			if (!queryId) {
				return '';
			}

			const { getBlockName, getBlockAttributes } =
				select(blockEditorStore);
			const changes = carouselQueryAttributes(
				getBlockName(queryId),
				getBlockAttributes(queryId) ?? {}
			);

			return Object.keys(changes).length ? JSON.stringify(changes) : '';
		},
		[queryId]
	);

	useEffect(() => {
		if (!queryId || !missing) {
			return;
		}

		const {
			updateBlockAttributes,
			__unstableMarkNextChangeAsNotPersistent: markNotPersistent,
		} = registry.dispatch(blockEditorStore);

		markNotPersistent();
		updateBlockAttributes(queryId, JSON.parse(missing));
	}, [registry, queryId, missing]);

	useEffect(() => {
		const clientIds = descendants.split(' ').filter(Boolean);

		if (!clientIds.length) {
			return;
		}

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
	}, [registry, descendants]);
}
