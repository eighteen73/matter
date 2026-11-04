/**
 * WordPress dependencies
 */
import {
	getBlockDefaultClassName,
	getBlockType,
	store as blocksStore,
} from '@wordpress/blocks';
import {
	InnerBlocks,
	store as blockEditorStore,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';

/**
 * A slot reads its configuration (allowed blocks, template, lock) from the
 * parent section's `supports.matter.slots[ name ]`, so sections only need
 * block.json.
 *
 * @param {Object} props
 * @param {Object} props.attributes      Block attributes.
 * @param {string} props.attributes.name Slot name.
 * @param {string} props.clientId        Block client ID.
 * @return {Element} Slot editor.
 */
export default function Edit({ attributes: { name }, clientId }) {
	const { sectionName, hasInnerBlocks } = useSelect(
		(select) => {
			const { getBlockRootClientId, getBlockName, getBlockCount } =
				select(blockEditorStore);

			return {
				sectionName: getBlockName(getBlockRootClientId(clientId)),
				hasInnerBlocks: getBlockCount(clientId) > 0,
			};
		},
		[clientId]
	);

	// Re-render when block types finish registering.
	useSelect((select) => select(blocksStore).getBlockTypes(), []);

	const config =
		getBlockType(sectionName)?.supports?.matter?.slots?.[name] ?? {};
	const baseClass = sectionName ? getBlockDefaultClassName(sectionName) : '';

	const blockProps = useBlockProps({
		className: baseClass ? `${baseClass}__${name}` : undefined,
	});

	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		allowedBlocks: config.allowedBlocks,
		template: config.template,
		templateLock: config.templateLock ?? false,
		renderAppender:
			config.templateLock || hasInnerBlocks
				? undefined
				: InnerBlocks.ButtonBlockAppender,
	});

	return <div {...innerBlocksProps} />;
}
