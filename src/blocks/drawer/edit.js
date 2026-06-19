import {
	BlockControls,
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { Notice, ToolbarButton, ToolbarGroup } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import {
	generateBlockId,
	hasDuplicateAttributeValue,
} from '../../utils/block-ids';

import clsx from 'clsx';

import './editor.scss';

const TEMPLATE = [
	['matter/trigger', { lock: { remove: true } }],
	['matter/drawer-content', { lock: { remove: true } }],
];

/**
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Update block attributes.
 * @param {string}   props.clientId      Block client ID.
 * @return {Element} Element to render.
 */
export default function Edit({ attributes, setAttributes, clientId }) {
	const { anchor, editorIsOpen, generatedId, targetId } = attributes;
	const { updateBlockAttributes, __unstableMarkNextChangeAsNotPersistent } =
		useDispatch(blockEditorStore);

	const { blocks, hasSelection } = useSelect(
		(select) => {
			const blockEditor = select(blockEditorStore);

			return {
				blocks: blockEditor.getBlocks(),
				hasSelection:
					blockEditor.isBlockSelected(clientId) ||
					blockEditor.hasSelectedInnerBlock(clientId, true),
			};
		},
		[clientId]
	);

	const duplicateGeneratedId = hasDuplicateAttributeValue(
		blocks,
		clientId,
		'matter/drawer',
		'generatedId',
		generatedId
	);

	const duplicateAnchor = hasDuplicateAttributeValue(
		blocks,
		clientId,
		'matter/drawer',
		'anchor',
		anchor
	);

	useEffect(() => {
		if (!generatedId || (!anchor && duplicateGeneratedId)) {
			const nextGeneratedId = generateBlockId('matter-drawer');

			setAttributes({
				generatedId: nextGeneratedId,
				targetId: anchor || nextGeneratedId,
			});
			return;
		}

		const nextTargetId = anchor || generatedId;

		if (targetId !== nextTargetId) {
			setAttributes({ targetId: nextTargetId });
		}
	}, [anchor, duplicateGeneratedId, generatedId, setAttributes, targetId]);

	useEffect(() => {
		if (hasSelection || !editorIsOpen) {
			return;
		}

		__unstableMarkNextChangeAsNotPersistent();
		updateBlockAttributes(clientId, {
			editorIsOpen: false,
		});
	}, [
		__unstableMarkNextChangeAsNotPersistent,
		clientId,
		editorIsOpen,
		hasSelection,
		updateBlockAttributes,
	]);

	const blockProps = useBlockProps({
		className: clsx({
			'is-open': editorIsOpen,
		}),
	});

	const { children, ...innerBlocksProps } = useInnerBlocksProps(blockProps, {
		template: TEMPLATE,
		templateLock: 'insert',
	});

	const toggleEditorPreview = () => {
		__unstableMarkNextChangeAsNotPersistent();
		updateBlockAttributes(clientId, {
			editorIsOpen: !editorIsOpen,
		});
	};

	return (
		<>
			<BlockControls>
				<ToolbarGroup>
					<ToolbarButton onClick={toggleEditorPreview}>
						{editorIsOpen
							? __('Close drawer', 'matter')
							: __('Open drawer', 'matter')}
					</ToolbarButton>
				</ToolbarGroup>
			</BlockControls>

			<div {...innerBlocksProps}>
				{duplicateAnchor && (
					<Notice status="warning" isDismissible={false}>
						{__(
							'Another drawer block is using this anchor. Choose a unique anchor so triggers target the correct drawer.',
							'matter'
						)}
					</Notice>
				)}
				{children}
			</div>
		</>
	);
}
