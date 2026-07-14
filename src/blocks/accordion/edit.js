/**
 * WordPress dependencies
 */
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	BlockControls,
	HeadingLevelDropdown,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	ToggleControl,
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
import { __ } from '@wordpress/i18n';
import { useDispatch, useSelect } from '@wordpress/data';
import { createBlock } from '@wordpress/blocks';
import { useEffect } from '@wordpress/element';

/**
 * Internal dependencies
 */
import './editor.scss';
import BlockVariationPicker from '../../components/block-variation-picker';
import useBlockId from '../../utils/use-block-id';
import { ITEM_TEMPLATE } from './variations';

const DEFAULT_TEMPLATE = [ITEM_TEMPLATE];

function Edit({ clientId, attributes, setAttributes, isSelected }) {
	const {
		autoclose,
		iconPosition,
		showIcon,
		headingLevel,
		isQueryMode,
		openFirstItem,
	} = attributes;

	const { insertBlock, updateBlockAttributes } =
		useDispatch(blockEditorStore);

	const { duplicateAnchor } = useBlockId({
		blockName: 'matter/accordion',
		prefix: 'matter-accordion',
		attributes,
		setAttributes,
		clientId,
	});

	const innerBlocks = useSelect(
		(select) => select(blockEditorStore).getBlocks(clientId),
		[clientId]
	);

	const hasQueryLoop = innerBlocks.some(
		(block) => block.name === 'core/query'
	);
	const isQuery = isQueryMode || hasQueryLoop;
	const firstItem = innerBlocks.find(
		(block) => block.name === 'matter/accordion-item'
	);

	useEffect(() => {
		if (hasQueryLoop !== isQueryMode) {
			setAttributes({ isQueryMode: hasQueryLoop });
		}
	}, [hasQueryLoop, isQueryMode, setAttributes]);

	const syncFirstItemOpen = (value) => {
		setAttributes({ openFirstItem: value });

		if (!isQuery && firstItem) {
			updateBlockAttributes(firstItem.clientId, {
				openByDefault: value,
			});
		}
	};

	const blockProps = useBlockProps({
		role: 'group',
	});

	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		template: isQuery ? undefined : DEFAULT_TEMPLATE,
		templateInsertUpdatesSelection: true,
		defaultBlock: isQuery ? undefined : { name: 'matter/accordion-item' },
		directInsert: !isQuery,
		renderAppender: false,
		allowedBlocks: isQuery ? ['core/query'] : ['matter/accordion-item'],
	});

	const addAccordionItem = () => {
		const newItem = createBlock('matter/accordion-item', {}, [
			createBlock('matter/accordion-heading', {}),
			createBlock('matter/accordion-panel', {}, [
				createBlock('core/paragraph', {
					placeholder: __('Type / to add content…', 'matter'),
				}),
			]),
		]);
		insertBlock(newItem, undefined, clientId);
	};

	if (innerBlocks.length === 0) {
		return (
			<BlockVariationPicker
				blockName="matter/accordion"
				setAttributes={setAttributes}
				clientId={clientId}
				defaultTemplate={DEFAULT_TEMPLATE}
			/>
		);
	}

	return (
		<>
			{duplicateAnchor && (
				<Notice status="warning" isDismissible={false}>
					{__(
						'Another accordion block is using this anchor. Choose a unique anchor so programmatic controls target the correct accordion.',
						'matter'
					)}
				</Notice>
			)}
			{isSelected && !isQuery && (
				<BlockControls>
					<ToolbarGroup>
						<ToolbarButton onClick={addAccordionItem}>
							{__('Add item', 'matter')}
						</ToolbarButton>
					</ToolbarGroup>
				</BlockControls>
			)}
			<BlockControls group="block">
				<HeadingLevelDropdown
					value={headingLevel}
					onChange={(value) => setAttributes({ headingLevel: value })}
				/>
			</BlockControls>
			<InspectorControls>
				<ToolsPanel
					label={__('Settings', 'matter')}
					resetAll={() => {
						setAttributes({
							autoclose: false,
							openFirstItem: true,
							showIcon: true,
							iconPosition: 'right',
						});

						if (!isQuery && firstItem) {
							updateBlockAttributes(firstItem.clientId, {
								openByDefault: true,
							});
						}
					}}
				>
					<ToolsPanelItem
						hasValue={() => !!autoclose}
						label={__('Auto-close', 'matter')}
						onDeselect={() => setAttributes({ autoclose: false })}
						isShownByDefault
					>
						<ToggleControl
							__nextHasNoMarginBottom
							label={__('Auto-close', 'matter')}
							help={__(
								'Automatically close accordion items when a new one is opened.',
								'matter'
							)}
							checked={autoclose}
							onChange={(value) =>
								setAttributes({ autoclose: value })
							}
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						hasValue={() => !!openFirstItem}
						label={__('Open first item', 'matter')}
						onDeselect={() => syncFirstItemOpen(false)}
						isShownByDefault
					>
						<ToggleControl
							__nextHasNoMarginBottom
							label={__('Open first item', 'matter')}
							help={__(
								'Open the first item by default.',
								'matter'
							)}
							checked={openFirstItem}
							onChange={syncFirstItemOpen}
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						hasValue={() => !showIcon}
						label={__('Show icon', 'matter')}
						onDeselect={() => setAttributes({ showIcon: true })}
						isShownByDefault
					>
						<ToggleControl
							__nextHasNoMarginBottom
							label={__('Show icon', 'matter')}
							help={__(
								'Display a plus icon next to the accordion heading.',
								'matter'
							)}
							checked={showIcon}
							onChange={(value) =>
								setAttributes({
									showIcon: value,
									iconPosition: value
										? iconPosition
										: 'right',
								})
							}
						/>
					</ToolsPanelItem>
					{showIcon && (
						<ToolsPanelItem
							hasValue={() => iconPosition !== 'right'}
							label={__('Icon position', 'matter')}
							onDeselect={() =>
								setAttributes({ iconPosition: 'right' })
							}
							isShownByDefault
						>
							<ToggleGroupControl
								__nextHasNoMarginBottom
								__next40pxDefaultSize
								label={__('Icon position', 'matter')}
								value={iconPosition}
								onChange={(value) =>
									setAttributes({
										iconPosition: value,
									})
								}
								isBlock
							>
								<ToggleGroupControlOption
									value="left"
									label={__('Left', 'matter')}
								/>
								<ToggleGroupControlOption
									value="right"
									label={__('Right', 'matter')}
								/>
							</ToggleGroupControl>
						</ToolsPanelItem>
					)}
				</ToolsPanel>
			</InspectorControls>
			<div {...innerBlocksProps} />
		</>
	);
}

export default Edit;
