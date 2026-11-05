/**
 * WordPress dependencies
 */
import { getBlockType, store as blocksStore } from '@wordpress/blocks';
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
	// The unfiltered default class (`blocks.getBlockDefaultClassName` may
	// change the section's own, e.g. for overlays), as on the front end.
	const baseClass = sectionName
		? `wp-block-${sectionName.replace(/^core\//, '').replace('/', '-')}`
		: '';

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

	const { children, ...wrapperProps } = innerBlocksProps;

	return (
		<div {...wrapperProps}>
			{config.label && (
				<div className="wp-block-matter-slot__label">
					{config.label}
				</div>
			)}
			{children}
		</div>
	);
}
