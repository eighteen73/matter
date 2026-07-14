import {
	BlockControls,
	BlockContextProvider,
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { Notice, ToolbarButton, ToolbarGroup } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import useBlockId from '../../utils/use-block-id';

import clsx from 'clsx';

import './editor.scss';

const TEMPLATE = [
	['matter/trigger'],
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
	const { editorIsOpen } = attributes;
	const { updateBlockAttributes, __unstableMarkNextChangeAsNotPersistent } =
		useDispatch(blockEditorStore);

	const { hasSelection } = useSelect(
		(select) => {
			const blockEditor = select(blockEditorStore);

			return {
				hasSelection:
					blockEditor.isBlockSelected(clientId) ||
					blockEditor.hasSelectedInnerBlock(clientId, true),
			};
		},
		[clientId]
	);

	const { duplicateAnchor, blockId } = useBlockId({
		blockName: 'matter/drawer',
		prefix: 'matter-drawer',
		attributes,
		setAttributes,
		clientId,
	});

	const contextValue = useMemo(
		() => ({
			'matter/drawer-id': blockId,
			'matter/drawer-is-open': editorIsOpen,
		}),
		[blockId, editorIsOpen]
	);

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

	const innerBlocksProps = useInnerBlocksProps(
		{},
		{
			template: TEMPLATE,
			orientation: 'vertical',
			renderAppender: false,
		}
	);

	const toggleEditorPreview = () => {
		__unstableMarkNextChangeAsNotPersistent();
		updateBlockAttributes(clientId, {
			editorIsOpen: !editorIsOpen,
		});
	};

	return (
		<>
			<BlockControls __experimentalShareWithChildBlocks>
				<ToolbarGroup>
					<ToolbarButton onClick={toggleEditorPreview}>
						{editorIsOpen
							? __('Close drawer', 'matter')
							: __('Open drawer', 'matter')}
					</ToolbarButton>
				</ToolbarGroup>
			</BlockControls>

			<div {...blockProps}>
				{duplicateAnchor && (
					<Notice status="warning" isDismissible={false}>
						{__(
							'Another drawer block is using this anchor. Choose a unique anchor so triggers target the correct drawer.',
							'matter'
						)}
					</Notice>
				)}

				<BlockContextProvider value={contextValue}>
					<div {...innerBlocksProps} />
				</BlockContextProvider>
			</div>
		</>
	);
}
