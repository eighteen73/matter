/**
 * WordPress dependencies
 */
import {
	useBlockProps,
	useInnerBlocksProps,
	BlockContextProvider,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { useMemo } from '@wordpress/element';

/**
 * Internal dependencies
 */
import Controls from './controls';
import useTabListItemsSync from './use-tab-list-items-sync';

const TABS_TEMPLATE = [['matter/tab-list'], ['matter/tab-panels']];

function Edit({ clientId, attributes, setAttributes }) {
	const { anchor, activeTabIndex, editorActiveTabIndex } = attributes;

	const { tabPanels, tabListClientId } = useSelect(
		(select) => {
			const { getBlocks } = select(blockEditorStore);
			const innerBlocks = getBlocks(clientId);

			const tabPanelsBlock = innerBlocks.find(
				(block) => block.name === 'matter/tab-panels'
			);
			const tabList = innerBlocks.find(
				(block) => block.name === 'matter/tab-list'
			);

			return {
				tabPanels: tabPanelsBlock?.innerBlocks ?? [],
				tabListClientId: tabList?.clientId ?? null,
			};
		},
		[clientId]
	);

	useTabListItemsSync({ tabPanels, tabListClientId });

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
		};
	}, [tabPanels, anchor, activeTabIndex, editorActiveTabIndex]);

	const blockProps = useBlockProps();

	const innerBlockProps = useInnerBlocksProps(blockProps, {
		__experimentalCaptureToolbars: true,
		template: TABS_TEMPLATE,
		templateLock: 'all',
		renderAppender: false,
	});

	return (
		<BlockContextProvider value={contextValue}>
			<div {...innerBlockProps}>
				<Controls
					clientId={clientId}
					attributes={attributes}
					setAttributes={setAttributes}
				/>
				{innerBlockProps.children}
			</div>
		</BlockContextProvider>
	);
}

export default Edit;
