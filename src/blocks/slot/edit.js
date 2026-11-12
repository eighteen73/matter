/**
 * WordPress dependencies
 */
import { getBlockType, store as blocksStore } from '@wordpress/blocks';
import {
	InnerBlocks,
	Warning,
	store as blockEditorStore,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { Button } from '@wordpress/components';
import { useDispatch, useRegistry, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

/**
 * A slot reads its configuration (allowed blocks, template, lock) from the
 * parent block's `supports.matter.slots[ name ]`, so sections only need
 * block.json.
 *
 * Only locked slots (`templateLock`) keep their template in step: an
 * unlocked slot is filled from its template when it's created (useSlots), and
 * stays empty if the client empties it.
 *
 * A slot that's no longer declared (or a second one with the same name) is
 * orphaned: the front end doesn't output it, and the editor says so, so the
 * client can move its content into another slot or remove it.
 *
 * @param {Object} props
 * @param {Object} props.attributes      Block attributes.
 * @param {string} props.attributes.name Slot name.
 * @param {string} props.clientId        Block client ID.
 * @return {Element} Slot editor.
 */
export default function Edit({ attributes: { name }, clientId }) {
	const { parentId, sectionName, hasInnerBlocks, isFirstWithName } =
		useSelect(
			(select) => {
				const {
					getBlockRootClientId,
					getBlockName,
					getBlockCount,
					getBlockOrder,
					getBlockAttributes,
				} = select(blockEditorStore);
				const rootId = getBlockRootClientId(clientId);
				const first = getBlockOrder(rootId).find(
					(id) => getBlockAttributes(id)?.name === name
				);

				return {
					parentId: rootId,
					sectionName: getBlockName(rootId),
					hasInnerBlocks: getBlockCount(clientId) > 0,
					isFirstWithName: first === clientId,
				};
			},
			[clientId, name]
		);
	const registry = useRegistry();
	const { replaceInnerBlocks } = useDispatch(blockEditorStore);

	// Re-render when block types finish registering.
	useSelect((select) => select(blocksStore).getBlockTypes(), []);

	const slots = getBlockType(sectionName)?.supports?.matter?.slots;
	const isOrphaned = !!slots && (!(name in slots) || !isFirstWithName);
	const config = (!isOrphaned && slots?.[name]) || {};

	// The unfiltered default class (`blocks.getBlockDefaultClassName` may
	// change the section's own, e.g. for overlays), as on the front end.
	const baseClass = sectionName
		? `wp-block-${sectionName.replace(/^core\//, '').replace('/', '-')}`
		: '';

	const blockProps = useBlockProps({
		className: [
			baseClass && `${baseClass}__${name}`,
			isOrphaned && 'is-orphaned',
		]
			.filter(Boolean)
			.join(' '),
	});

	const isLocked = !!config.templateLock;

	// "Posts carousel", "Posts accordion" and "Posts tabs" are query blocks,
	// so a slot allowing the carousel, accordion or tabs allows those too.
	const queryBlocks = window.matterEditor?.queryBlocks ?? {};
	const allowedBlocks = Array.isArray(config.allowedBlocks)
		? [
				...new Set(
					config.allowedBlocks.flatMap((block) => [
						block,
						...(queryBlocks[block] ?? []),
					])
				),
			]
		: config.allowedBlocks;

	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		// Nothing new goes into an orphaned slot; its content can be moved out.
		allowedBlocks: isOrphaned ? [] : allowedBlocks,
		template: isLocked ? config.template : undefined,
		templateLock: isOrphaned ? false : (config.templateLock ?? false),
		renderAppender:
			isOrphaned || isLocked || hasInnerBlocks
				? undefined
				: InnerBlocks.ButtonBlockAppender,
	});

	const { children, ...wrapperProps } = innerBlocksProps;

	// Remove through the parent: its lock stops slots being removed by hand.
	const remove = () =>
		replaceInnerBlocks(
			parentId,
			registry
				.select(blockEditorStore)
				.getBlocks(parentId)
				.filter((block) => block.clientId !== clientId),
			false
		);

	return (
		<div {...wrapperProps}>
			{isOrphaned && (
				<Warning
					actions={[
						<Button
							key="remove"
							variant="secondary"
							onClick={remove}
						>
							{__('Remove', 'matter')}
						</Button>,
					]}
				>
					{__(
						'This content is no longer shown on the site, because this part of the section was removed. Move anything you want to keep into another part of the section, then remove this.',
						'matter'
					)}
				</Warning>
			)}
			{config.label && (
				<div className="wp-block-matter-slot__label">
					{config.label}
				</div>
			)}
			{children}
		</div>
	);
}
