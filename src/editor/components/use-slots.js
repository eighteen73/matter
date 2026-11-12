/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import {
	createBlock,
	createBlocksFromInnerBlocksTemplate,
	getBlockType,
} from '@wordpress/blocks';
import { useRegistry, useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { reconcileSlots } from './slots';

/**
 * A block's declared slots (`supports.matter.slots`), keyed by name in order.
 *
 * @param {string} name Block name.
 * @return {Object|undefined} Slots.
 */
export const getSlots = (name) => getBlockType(name)?.supports?.matter?.slots;

/**
 * A new slot block for a name, filled from its declared template.
 *
 * @param {Object} slots Declared slots.
 * @return {Function} Name => block.
 */
const slotCreator = (slots) => (name) =>
	createBlock(
		'matter/slot',
		{ name },
		createBlocksFromInnerBlocksTemplate(slots[name]?.template ?? [])
	);

/**
 * Keep a block's slots in step with its declared slots, by name. Runs when
 * the block is shown and when its declared slots change. Nothing happens when
 * the slots already match; when they don't, the fix isn't an undo step (as
 * core's own template sync), but the post has changed and saving keeps it.
 *
 * @param {string} clientId Block client ID.
 * @param {string} name     Block name.
 */
export default function useSlots(clientId, name) {
	const registry = useRegistry();
	const slots = getSlots(name);

	// The slots present, by name: re-check when they change (e.g. undo back
	// to before they were created), as core's template sync does.
	const present = useSelect(
		(select) => {
			const { getBlockOrder, getBlockAttributes } =
				select(blockEditorStore);

			return getBlockOrder(clientId)
				.map((id) => getBlockAttributes(id)?.name ?? '')
				.join('|');
		},
		[clientId]
	);

	useEffect(() => {
		if (!slots) {
			return;
		}

		const next = reconcileSlots(
			registry.select(blockEditorStore).getBlocks(clientId),
			slots,
			slotCreator(slots)
		);

		if (!next) {
			return;
		}

		const {
			replaceInnerBlocks,
			__unstableMarkNextChangeAsNotPersistent: markNotPersistent,
		} = registry.dispatch(blockEditorStore);

		markNotPersistent({ history: 'ignore' });
		replaceInnerBlocks(clientId, next, false);
	}, [registry, clientId, slots, present]);
}
