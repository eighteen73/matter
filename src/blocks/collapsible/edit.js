import {
	BlockControls,
	BlockContextProvider,
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	Notice,
	ToolbarButton,
	ToolbarGroup,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanel as ToolsPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControl as ToggleGroupControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import clsx from 'clsx';

import useBlockId from '../../utils/use-block-id';

const TEMPLATE = [
	['matter/trigger'],
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
	const { editorIsOpen, type } = attributes;
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
		blockName: 'matter/collapsible',
		prefix: 'matter-collapsible',
		attributes,
		setAttributes,
		clientId,
	});

	const contextValue = useMemo(
		() => ({
			'matter/collapsible-id': blockId,
			'matter/collapsible-is-open': editorIsOpen,
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
		className: clsx(
			editorIsOpen ? 'is-open' : undefined,
			`is-type-${type}`
		),
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
				<ToolsPanel
					label={__('Settings', 'matter')}
					resetAll={() => setAttributes({ type: 'popover' })}
				>
					<ToolsPanelItem
						hasValue={() => !!type}
						label={__('Type', 'matter')}
						onDeselect={() => setAttributes({ type: 'popover' })}
						isShownByDefault
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

			<div {...blockProps}>
				{duplicateAnchor && (
					<Notice status="warning" isDismissible={false}>
						{__(
							'Another collapsible block is using this anchor. Choose a unique anchor so triggers target the correct panel.',
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
