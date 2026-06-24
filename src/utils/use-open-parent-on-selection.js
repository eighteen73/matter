import { store as blockEditorStore } from '@wordpress/block-editor';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useRef } from '@wordpress/element';

/**
 * Opens the parent overlay block when this content block (or a nested block) is selected.
 *
 * @param {string}  clientId Block client ID.
 * @param {boolean} isOpen   Whether the parent overlay is currently open.
 */
export function useOpenParentOnSelection(clientId, isOpen) {
	const parentClientId = useSelect(
		(select) => select(blockEditorStore).getBlockRootClientId(clientId),
		[clientId]
	);

	const hasSelection = useSelect(
		(select) => {
			const blockEditor = select(blockEditorStore);

			return (
				blockEditor.isBlockSelected(clientId) ||
				blockEditor.hasSelectedInnerBlock(clientId, true)
			);
		},
		[clientId]
	);

	const { updateBlockAttributes, __unstableMarkNextChangeAsNotPersistent } =
		useDispatch(blockEditorStore);

	const hadSelectionRef = useRef(false);

	useEffect(() => {
		if (
			hasSelection &&
			!hadSelectionRef.current &&
			!isOpen &&
			parentClientId
		) {
			__unstableMarkNextChangeAsNotPersistent();
			updateBlockAttributes(parentClientId, { editorIsOpen: true });
		}

		hadSelectionRef.current = hasSelection;
	}, [
		__unstableMarkNextChangeAsNotPersistent,
		hasSelection,
		isOpen,
		parentClientId,
		updateBlockAttributes,
	]);
}
