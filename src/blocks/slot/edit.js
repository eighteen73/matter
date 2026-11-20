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
import { useMemo } from '@wordpress/element';
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
 * A slot's `alignments` (e.g. [ "wide", "full" ]) are the alignments its
 * blocks offer in the toolbar, for blocks that support them; the theme styles
 * them in the slot. Without it, blocks in a slot offer left, centre and right.
 *
 * A slot with no blocks has `is-empty`, as one that renders nothing does on
 * the front end (Sections::render_default()).
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
	const {
		parentId,
		sectionName,
		hasInnerBlocks,
		innerNames,
		isFirstWithName,
	} = useSelect(
		(select) => {
			const {
				getBlockRootClientId,
				getBlockName,
				getBlocks,
				getBlockOrder,
				getBlockAttributes,
			} = select(blockEditorStore);
			const rootId = getBlockRootClientId(clientId);
			const first = getBlockOrder(rootId).find(
				(id) => getBlockAttributes(id)?.name === name
			);
			const blocks = getBlocks(clientId);

			return {
				parentId: rootId,
				sectionName: getBlockName(rootId),
				hasInnerBlocks: blocks.length > 0,
				// A string, so the slot re-renders only when they change.
				innerNames: blocks.map((block) => block.name).join(','),
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
			// As on the front end, where an empty slot renders nothing.
			!hasInnerBlocks && 'is-empty',
		]
			.filter(Boolean)
			.join(' '),
	});

	const isLocked = !!config.templateLock;

	// Whether the saved blocks are the template's first ones, by type (so the
	// template can only add to them).
	const templateNames = (config.template ?? []).map(([block]) => block);
	const continuesTemplate =
		innerNames !== '' &&
		innerNames
			.split(',')
			.every((block, index) => block === templateNames[index]);

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

	// A copy: the editor adds "none" to the list it's given.
	const alignments = Array.isArray(config.alignments)
		? config.alignments.join(',')
		: null;
	const layout = useMemo(
		() =>
			alignments === null
				? undefined
				: {
						type: 'default',
						alignments: alignments ? alignments.split(',') : [],
					},
		[alignments]
	);

	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		layout,
		// Nothing new goes into an orphaned slot; its content can be moved out.
		allowedBlocks: isOrphaned ? [] : allowedBlocks,
		// Core re-syncs a locked slot with its template, which is how a block
		// the theme adds to it reaches saved content. A template whose block
		// types no longer match the saved ones (one replaced by another type)
		// would replace what's saved, so it's applied only to an empty slot
		// or one whose saved blocks are the template's first.
		template:
			isLocked && (!hasInnerBlocks || continuesTemplate)
				? config.template
				: undefined,
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
