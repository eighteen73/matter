/**
 * WordPress dependencies
 */
import {
	useBlockProps,
	useInnerBlocksProps,
	BlockContextProvider,
	store as blockEditorStore,
	InspectorControls,
} from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { useMemo } from '@wordpress/element';
import {
	ToggleControl,
	Notice,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanel as ToolsPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import './editor.scss';
import { useTabButtonsSync, addingTabLock } from './utils/sync-tab-buttons';
import {
	buildTabsListFromPosts,
	buildManualTabEntry,
	findQueryBlock,
	getQueryPostsForEditor,
} from './utils/query-tabs-list';
import AddTabToolbarButton from '../../components/add-tab-toolbar-button';
import BlockVariationPicker from '../../components/block-variation-picker';
import BreakpointSelectorControl from '../../components/breakpoint-selector-control';
import useBlockId from '../../utils/use-block-id';

const TABS_TEMPLATE = [['matter/tab-list'], ['matter/tab-panels']];

function Edit({ clientId, attributes, setAttributes }) {
	const {
		anchor,
		generatedId,
		activeTabIndex,
		editorActiveTabIndex,
		deepLinking,
		deepLinkingUpdateHistory,
		collapses,
		collapsesOn,
		isQueryMode,
		layout,
		stackOnMobile,
		stackedBreakpoint,
	} = attributes;

	const { duplicateAnchor } = useBlockId({
		blockName: 'matter/tabs',
		prefix: 'matter-tabs',
		attributes,
		setAttributes,
		clientId,
	});

	const tabsId = anchor || generatedId || '';

	const { tabPanels, tabButtons, tabPanelsClientId, tabListClientId } =
		useSelect(
			(select) => {
				const { getBlocks } = select(blockEditorStore);
				const innerBlocks = getBlocks(clientId);

				const tabPanelsBlock = innerBlocks.find(
					(block) => block.name === 'matter/tab-panels'
				);
				const tabListBlock = innerBlocks.find(
					(block) => block.name === 'matter/tab-list'
				);

				return {
					tabPanels: tabPanelsBlock?.innerBlocks ?? [],
					tabButtons: tabListBlock?.innerBlocks ?? [],
					tabPanelsClientId: tabPanelsBlock?.clientId ?? null,
					tabListClientId: tabListBlock?.clientId ?? null,
				};
			},
			[clientId]
		);

	useTabButtonsSync({
		tabListClientId,
		tabPanelsClientId,
		isAddingTabRef: addingTabLock,
		enabled: !isQueryMode,
	});

	const queryBlock = useMemo(() => findQueryBlock(tabPanels), [tabPanels]);

	const queryPosts = useSelect(
		(select) => {
			if (!isQueryMode || !queryBlock) {
				return [];
			}

			return getQueryPostsForEditor(queryBlock.attributes, select);
		},
		[isQueryMode, queryBlock]
	);

	const contextValue = useMemo(() => {
		const tabList = isQueryMode
			? buildTabsListFromPosts(queryPosts, tabsId)
			: tabButtons.map((button, index) =>
					buildManualTabEntry({
						button,
						panel: tabPanels[index],
						index,
						tabsId,
					})
				);

		return {
			'matter/tabs-list': tabList,
			'matter/tabs-id': tabsId,
			'matter/tabs-activeTabIndex': activeTabIndex,
			'matter/tabs-editorActiveTabIndex': editorActiveTabIndex,
			'matter/tabs-collapses': collapses,
			'matter/tabs-collapsesOn': collapsesOn,
			'matter/tabs-isQueryMode': isQueryMode,
		};
	}, [
		isQueryMode,
		queryPosts,
		tabButtons,
		tabPanels,
		tabsId,
		activeTabIndex,
		editorActiveTabIndex,
		collapses,
		collapsesOn,
	]);

	const blockProps = useBlockProps();

	const innerBlockProps = useInnerBlocksProps(blockProps, {
		__experimentalCaptureToolbars: true,
		template: TABS_TEMPLATE,
		templateLock: 'all',
		renderAppender: false,
	});

	const innerBlocks = useSelect((select) =>
		select('core/block-editor').getBlock(clientId)
			? select('core/block-editor').getBlock(clientId).innerBlocks
			: []
	);

	if (innerBlocks.length === 0) {
		return (
			<BlockVariationPicker
				blockName="matter/tabs"
				setAttributes={setAttributes}
				clientId={clientId}
				defaultTemplate={TABS_TEMPLATE}
			/>
		);
	}

	return (
		<>
			{duplicateAnchor && (
				<Notice status="warning" isDismissible={false}>
					{__(
						'Another tabs block is using this anchor. Choose a unique anchor so programmatic controls target the correct tabs.',
						'matter'
					)}
				</Notice>
			)}
			<AddTabToolbarButton />
			<InspectorControls>
				<ToolsPanel label={__('Settings', 'matter')}>
					<ToolsPanelItem
						hasValue={() => !!collapses}
						label={__('Collapse', 'matter')}
						onDeselect={() => setAttributes({ collapses: false })}
						isShownByDefault
					>
						<ToggleControl
							label={__('Collapse', 'matter')}
							help={__(
								'Collapse tabs on smaller screens.',
								'matter'
							)}
							checked={collapses}
							onChange={(value) =>
								setAttributes({ collapses: value })
							}
						/>
					</ToolsPanelItem>

					{collapses && (
						<ToolsPanelItem
							hasValue={() => !!collapsesOn}
							label={__('Collapse up to', 'matter')}
							onDeselect={() =>
								setAttributes({ collapsesOn: 'lg' })
							}
							isShownByDefault
						>
							<BreakpointSelectorControl
								value={collapsesOn}
								onChange={(value) =>
									setAttributes({ collapsesOn: value })
								}
								label={__('Collapse up to', 'matter')}
							/>
						</ToolsPanelItem>
					)}

					{layout?.orientation === 'horizontal' && (
						<>
							<ToolsPanelItem
								hasValue={() => !!stackOnMobile}
								label={__('Stack on mobile', 'matter')}
								onDeselect={() =>
									setAttributes({ stackOnMobile: false })
								}
								isShownByDefault
							>
								<ToggleControl
									label={__('Stack on mobile', 'matter')}
									help={__(
										'Stack tabs on smaller screens.',
										'matter'
									)}
									checked={stackOnMobile}
									onChange={(value) => {
										setAttributes({ stackOnMobile: value });
									}}
								/>
							</ToolsPanelItem>

							{stackOnMobile && (
								<ToolsPanelItem
									hasValue={() => !!stackedBreakpoint}
									label={__('Stacked breakpoint', 'matter')}
									onDeselect={() =>
										setAttributes({
											stackedBreakpoint: 'lg',
										})
									}
									isShownByDefault
								>
									<BreakpointSelectorControl
										value={stackedBreakpoint}
										onChange={(value) =>
											setAttributes({
												stackedBreakpoint: value,
											})
										}
										label={__(
											'Stacked breakpoint',
											'matter'
										)}
									/>
								</ToolsPanelItem>
							)}
						</>
					)}

					<ToolsPanelItem
						hasValue={() => !!deepLinking}
						label={__('Deep Linking', 'matter')}
						onDeselect={() => setAttributes({ deepLinking: false })}
						isShownByDefault
					>
						<ToggleControl
							label={__('Deep Linking', 'matter')}
							help={__('Enable deep linking.', 'matter')}
							checked={deepLinking}
							onChange={(value) =>
								setAttributes({ deepLinking: value })
							}
						/>
					</ToolsPanelItem>

					{deepLinking && (
						<ToolsPanelItem
							hasValue={() => !!deepLinkingUpdateHistory}
							label={__('Update History', 'matter')}
							onDeselect={() =>
								setAttributes({
									deepLinkingUpdateHistory: false,
								})
							}
							isShownByDefault
						>
							<ToggleControl
								label={__('Update History', 'matter')}
								help={__(
									'Update history on deep linking. If enabled, the URL will be updated when the tab is changed.',
									'matter'
								)}
								checked={deepLinkingUpdateHistory}
								onChange={(value) =>
									setAttributes({
										deepLinkingUpdateHistory: value,
									})
								}
							/>
						</ToolsPanelItem>
					)}
				</ToolsPanel>
			</InspectorControls>

			<BlockContextProvider value={contextValue}>
				<div {...innerBlockProps}>{innerBlockProps.children}</div>
			</BlockContextProvider>
		</>
	);
}

export default Edit;
