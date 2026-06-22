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
	PanelBody,
	ToggleControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControl as ToggleGroupControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import AddTabToolbarControl from '../tab-panel/add-tab-toolbar-control';
import RemoveTabToolbarControl from '../tab-panel/remove-tab-toolbar-control';
import breakpoints from '../../constants/breakpoints';

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

	const { tabPanels } = useSelect(
		(select) => {
			const { getBlocks } = select(blockEditorStore);
			const innerBlocks = getBlocks(clientId);

			const tabPanelsBlock = innerBlocks.find(
				(block) => block.name === 'matter/tab-panels'
			);

			return {
				tabPanels: tabPanelsBlock?.innerBlocks ?? [],
			};
		},
		[clientId]
	);

	/**
	 * Memoize context value to prevent unnecessary re-renders.
	 */
	const contextValue = useMemo(() => {
		/**
		 * Compute tabs list from innerblocks to provide via context.
		 * This traverses the tab-panels block to find all tab-panel blocks
		 * and extracts their label and anchor for the tab-list to consume.
		 */
		const tabList = tabPanels.map((tab, index) => ({
			id: tab.attributes.anchor || `tab-${index}`,
			label: tab.attributes.label || '',
			clientId: tab.clientId,
			index,
		}));

		return {
			'matter/tabs-list': tabList,
			'matter/tabs-id': anchor,
			'matter/tabs-activeTabIndex': activeTabIndex,
			'matter/tabs-editorActiveTabIndex': editorActiveTabIndex,
			'matter/tabs-collapses': collapses,
			'matter/tabs-collapsesOn': collapsesOn,
		};
	}, [
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
				<div {...innerBlockProps}>
					<AddTabToolbarControl tabsClientId={clientId} />
					<RemoveTabToolbarControl tabsClientId={clientId} />

					{innerBlockProps.children}
				</div>
			</BlockContextProvider>
		</>
	);
}

export default Edit;
