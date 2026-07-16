/**
 * Add tab control for the block toolbar.
 *
 * Rendered from tabs and nested tab blocks so the control stays available
 * while editing labels or panel content (including contentOnly mode).
 */
import {
	BlockControls,
	store as blockEditorStore,
	useBlockEditContext,
} from '@wordpress/block-editor';
import { ToolbarButton, ToolbarGroup } from '@wordpress/components';
import { useSelect, useDispatch, select as dataSelect } from '@wordpress/data';
import { useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import {
	insertTabPair,
	addingTabLock,
} from '../blocks/tabs/utils/sync-tab-buttons';

/**
 * Walk ancestors to find the nearest matter/tabs client ID.
 *
 * @param {string}   clientId             Starting client ID.
 * @param {Function} getBlock             Get block by client ID.
 * @param {Function} getBlockRootClientId Get parent client ID.
 * @return {string|null} Tabs client ID or null.
 */
function findTabsClientId(clientId, getBlock, getBlockRootClientId) {
	let currentId = clientId;

	while (currentId) {
		const block = getBlock(currentId);

		if (block?.name === 'matter/tabs') {
			return currentId;
		}

		currentId = getBlockRootClientId(currentId);
	}

	return null;
}

/**
 * @return {Element|null} Toolbar control or null when unavailable.
 */
export default function AddTabToolbarButton() {
	const { clientId } = useBlockEditContext();

	const {
		tabsClientId,
		tabListClientId,
		tabPanelsClientId,
		panelCount,
		isQueryMode,
	} = useSelect(
		(select) => {
			const { getBlock, getBlockRootClientId, getBlocks } =
				select(blockEditorStore);

			const _tabsClientId = findTabsClientId(
				clientId,
				getBlock,
				getBlockRootClientId
			);

			if (!_tabsClientId) {
				return {
					tabsClientId: null,
					tabListClientId: null,
					tabPanelsClientId: null,
					panelCount: 0,
					isQueryMode: true,
				};
			}

			const tabsBlock = getBlock(_tabsClientId);
			const innerBlocks = tabsBlock?.innerBlocks ?? [];
			const tabListBlock = innerBlocks.find(
				(block) => block.name === 'matter/tab-list'
			);
			const tabPanelsBlock = innerBlocks.find(
				(block) => block.name === 'matter/tab-panels'
			);

			return {
				tabsClientId: _tabsClientId,
				tabListClientId: tabListBlock?.clientId ?? null,
				tabPanelsClientId: tabPanelsBlock?.clientId ?? null,
				panelCount: tabPanelsBlock
					? getBlocks(tabPanelsBlock.clientId).length
					: 0,
				isQueryMode: !!tabsBlock?.attributes?.isQueryMode,
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

	const handleAddTab = useCallback(async () => {
		if (
			!tabsClientId ||
			!tabPanelsClientId ||
			!tabListClientId ||
			addingTabLock.current
		) {
			return;
		}

		const insertAt = panelCount;
		addingTabLock.current = true;

		try {
			await insertTabPair({
				insertBlock,
				tabPanelsClientId,
				tabListClientId,
				insertAt,
				defaultLabel: __('Tab', 'matter'),
			});

			__unstableMarkNextChangeAsNotPersistent();
			updateBlockAttributes(tabsClientId, {
				editorActiveTabIndex: insertAt,
			});

			const buttons =
				dataSelect(blockEditorStore).getBlocks(tabListClientId);
			const newButton = buttons[insertAt];
			if (newButton) {
				selectBlock(newButton.clientId);
			} else {
				selectBlock(tabListClientId);
			}
		} finally {
			addingTabLock.current = false;
		}
	}, [
		tabsClientId,
		tabPanelsClientId,
		tabListClientId,
		panelCount,
		insertBlock,
		updateBlockAttributes,
		selectBlock,
		__unstableMarkNextChangeAsNotPersistent,
	]);

	if (isQueryMode || !tabsClientId) {
		return null;
	}

	return (
		<BlockControls group="other" __experimentalShareWithChildBlocks>
			<ToolbarGroup>
				<ToolbarButton
					onClick={handleAddTab}
					disabled={!tabPanelsClientId || !tabListClientId}
				>
					{__('Add tab', 'matter')}
				</ToolbarButton>
			</ToolbarGroup>
		</BlockControls>
	);
}
