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
import { useSelect, useDispatch } from '@wordpress/data';
import { useMemo, useCallback, useRef } from '@wordpress/element';
import {
	PanelBody,
	ToggleControl,
	Button,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControl as ToggleGroupControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import breakpoints from '../../constants/breakpoints';
import { useTabButtonsSync, insertTabPair } from './utils/sync-tab-buttons';

const TABS_TEMPLATE = [['matter/tab-list'], ['matter/tab-panels']];

function Edit({ clientId, attributes, setAttributes }) {
	const {
		anchor,
		activeTabIndex,
		editorActiveTabIndex,
		deepLinking,
		deepLinkingUpdateHistory,
		collapses,
		collapsesOn,
	} = attributes;

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

	const {
		insertBlock,
		updateBlockAttributes,
		selectBlock,
		__unstableMarkNextChangeAsNotPersistent,
	} = useDispatch(blockEditorStore);

	const isAddingTabRef = useRef(false);

	useTabButtonsSync({ tabListClientId, tabPanelsClientId, isAddingTabRef });

	const handleAddTabAfter = useCallback(
		(newTabIndex) => {
			__unstableMarkNextChangeAsNotPersistent();
			updateBlockAttributes(clientId, {
				editorActiveTabIndex: newTabIndex,
			});

			if (tabListClientId) {
				selectBlock(tabListClientId);
			}
		},
		[
			clientId,
			tabListClientId,
			updateBlockAttributes,
			selectBlock,
			__unstableMarkNextChangeAsNotPersistent,
		]
	);

	const handleAddTab = useCallback(async () => {
		if (!tabPanelsClientId || !tabListClientId) {
			return;
		}

		const insertAt = tabPanels.length;

		isAddingTabRef.current = true;

		try {
			await insertTabPair({
				insertBlock,
				tabPanelsClientId,
				tabListClientId,
				insertAt,
				defaultLabel: __('Tab'),
			});

			handleAddTabAfter(insertAt);
		} finally {
			isAddingTabRef.current = false;
		}
	}, [
		tabPanels.length,
		tabPanelsClientId,
		tabListClientId,
		insertBlock,
		handleAddTabAfter,
	]);

	const contextValue = useMemo(() => {
		const tabList = tabButtons.map((button, index) => {
			const panel = tabPanels[index];

			return {
				id: panel?.attributes?.anchor || `tab-${index}`,
				label: button.attributes.label || '',
				clientId: button.clientId,
				panelClientId: panel?.clientId,
				index,
			};
		});

		return {
			'matter/tabs-list': tabList,
			'matter/tabs-id': anchor,
			'matter/tabs-activeTabIndex': activeTabIndex,
			'matter/tabs-editorActiveTabIndex': editorActiveTabIndex,
			'matter/tabs-collapses': collapses,
			'matter/tabs-collapsesOn': collapsesOn,
		};
	}, [
		tabButtons,
		tabPanels,
		anchor,
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

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Settings', 'matter')}>
					<ToggleControl
						label={__('Collapse', 'matter')}
						help={__('Collapse tabs on smaller screens.', 'matter')}
						checked={collapses}
						onChange={(value) =>
							setAttributes({ collapses: value })
						}
					/>

					{collapses && (
						<ToggleGroupControl
							label={__('Collapse up to')}
							onChange={(value) => {
								setAttributes({ collapsesOn: value });
							}}
							value={collapsesOn}
							isBlock
							style={{ width: '100%' }}
						>
							{Object.entries(breakpoints).map(
								([name, breakpoint]) => (
									<ToggleGroupControlOption
										key={name}
										value={name}
										label={breakpoint.label.toUpperCase()}
									/>
								)
							)}
						</ToggleGroupControl>
					)}

					<ToggleControl
						label={__('Deep Linking', 'matter')}
						help={__('Enable deep linking.', 'matter')}
						checked={deepLinking}
						onChange={(value) =>
							setAttributes({ deepLinking: value })
						}
					/>

					{deepLinking && (
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
					)}
				</PanelBody>
			</InspectorControls>

			<BlockContextProvider value={contextValue}>
				<div {...innerBlockProps}>{innerBlockProps.children}</div>

				<Button
					variant="secondary"
					text={__('Add tab', 'matter')}
					onClick={handleAddTab}
					disabled={!tabPanelsClientId || !tabListClientId}
					style={{
						width: '50%',
						justifyContent: 'center',
						marginTop: '1rem',
						marginLeft: 'auto',
						marginRight: 'auto',
						display: 'flex',
					}}
				/>
			</BlockContextProvider>
		</>
	);
}

export default Edit;
