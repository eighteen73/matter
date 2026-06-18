import {
	BlockControls,
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	Notice,
	ToolbarButton,
	ToolbarGroup,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
	SelectControl,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import clsx from 'clsx';

import {
	generateBlockId,
	hasDuplicateAttributeValue,
} from '../../utils/block-ids';

const TEMPLATE = [
	['matter/trigger', { lock: { remove: true } }],
	['matter/collapsible-content', { lock: { remove: true } }],
];

/**
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Update block attributes.
 * @param {string}   props.clientId      Block client ID.
 * @return {Element} Element to render.
 */
export default function Edit({ attributes, setAttributes, clientId }) {
	const { anchor, editorIsOpen, generatedId, targetId, type } = attributes;
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
		'matter/collapsible',
		'generatedId',
		generatedId
	);

	const duplicateAnchor = hasDuplicateAttributeValue(
		blocks,
		clientId,
		'matter/collapsible',
		'anchor',
		anchor
	);

	useEffect(() => {
		if (!generatedId || (!anchor && duplicateGeneratedId)) {
			const nextGeneratedId = generateBlockId('matter-collapsible');

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
		className: clsx(
			editorIsOpen ? 'is-open' : undefined,
			`is-type-${type}`
		),
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
							? __('Close collapsible', 'matter')
							: __('Open collapsible', 'matter')}
					</ToolbarButton>
				</ToolbarGroup>
			</BlockControls>

			<InspectorControls>
				<ToolsPanel>
					<ToolsPanelItem
						hasValue={() => !!type}
						label={__('Type', 'matter')}
						onDeselect={() => setAttributes({ type: 'popover' })}
					>
						<ToggleGroupControl
							label={__('Type', 'matter')}
							value={type}
							onChange={(value) => setAttributes({ type: value })}
							isBlock
							help={
								type === 'popover'
									? __(
											'Open the collapsible content over the content of the page.',
											'matter'
										)
									: __(
											'Open the collapsible content inline with the content of the page.',
											'matter'
										)
							}
						>
							<ToggleGroupControlOption
								value="popover"
								label={__('Popover', 'matter')}
							/>
							<ToggleGroupControlOption
								value="inline"
								label={__('Inline', 'matter')}
							/>
						</ToggleGroupControl>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>

			<div {...innerBlocksProps}>
				{duplicateAnchor && (
					<Notice status="warning" isDismissible={false}>
						{__(
							'Another collapsible block is using this anchor. Choose a unique anchor so triggers target the correct panel.',
							'matter'
						)}
					</Notice>
				)}
				{children}
			</div>
		</>
	);
}
