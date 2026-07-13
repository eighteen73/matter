/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { generateBlockId, hasDuplicatePublicId } from './block-ids';

/**
 * Keep a stable block ID in sync from anchor / generatedId.
 *
 * @param {Object}   options
 * @param {string}   options.blockName     Block name (reserved for callers / future use).
 * @param {string}   options.prefix        Prefix passed to generateBlockId.
 * @param {Object}   options.attributes    Block attributes.
 * @param {Function} options.setAttributes Update block attributes.
 * @param {string}   options.clientId      Block client ID.
 * @return {{ duplicateAnchor: boolean, blockId: string }} Duplicate-anchor flag and resolved ID.
 */
export default function useBlockId({
	blockName, // eslint-disable-line no-unused-vars -- kept for call-site clarity.
	prefix,
	attributes,
	setAttributes,
	clientId,
}) {
	const { anchor, generatedId } = attributes;

	const blocks = useSelect(
		(select) => select(blockEditorStore).getBlocks(),
		[]
	);

	const duplicateGeneratedId = hasDuplicatePublicId(
		blocks,
		clientId,
		!anchor ? generatedId : ''
	);
	const duplicateAnchor = hasDuplicatePublicId(blocks, clientId, anchor);

	useEffect(() => {
		if (!generatedId || (!anchor && duplicateGeneratedId)) {
			setAttributes({
				generatedId: generateBlockId(prefix),
			});
		}
	}, [anchor, duplicateGeneratedId, generatedId, prefix, setAttributes]);

	return {
		duplicateAnchor,
		blockId: anchor || generatedId || '',
	};
}
