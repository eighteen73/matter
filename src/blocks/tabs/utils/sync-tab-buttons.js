/**
 * WordPress dependencies
 */
import { createBlock } from '@wordpress/blocks';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { useSelect, useDispatch, select } from '@wordpress/data';
import { useEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Tab panels are the source of truth; tab-list buttons mirror their count,
 * order, and panel links. Legacy content without buttons is migrated on load.
 */

function migrateLegacyButtons({
	tabPanels,
	tabListClientId,
	replaceInnerBlocks,
	updateBlockAttributes,
}) {
	const migratedButtons = tabPanels.map((panel) =>
		createBlock('matter/tab-button', {
			label: panel.attributes.label || '',
			tabPanelClientId: panel.clientId,
		})
	);

	replaceInnerBlocks(tabListClientId, migratedButtons, false);

	tabPanels.forEach((panel) => {
		if (panel.attributes.label) {
			updateBlockAttributes(panel.clientId, {
				label: undefined,
			});
		}
	});
}

function insertMissingButton({
	tabButtons,
	tabPanels,
	tabListClientId,
	insertBlock,
}) {
	const insertAt = tabButtons.length;
	const panel = tabPanels[insertAt];

	return insertBlock(
		createBlock('matter/tab-button', {
			label: __('Tab', 'matter'),
			tabPanelClientId: panel?.clientId,
		}),
		insertAt,
		tabListClientId,
		false
	);
}

function findOrphanButton({ tabButtons, prevPanelIds, currentPanelIds }) {
	const panelClientIds = new Set(currentPanelIds);
	const removedPanelIds = prevPanelIds.filter(
		(id) => !currentPanelIds.includes(id)
	);

	for (const removedId of removedPanelIds) {
		const linkedButton = tabButtons.find(
			(button) => button.attributes.tabPanelClientId === removedId
		);

		if (linkedButton) {
			return linkedButton;
		}

		const removedIndex = prevPanelIds.indexOf(removedId);

		if (removedIndex >= 0 && tabButtons[removedIndex]) {
			return tabButtons[removedIndex];
		}
	}

	const unlinkedButton = tabButtons.find(
		(button) =>
			button.attributes.tabPanelClientId &&
			!panelClientIds.has(button.attributes.tabPanelClientId)
	);

	if (unlinkedButton) {
		return unlinkedButton;
	}

	// Last resort when panel links are stale after reorder/remove edge cases.
	return tabButtons[tabButtons.length - 1] ?? null;
}

function relinkStaleButtons({ tabButtons, tabPanels, updateBlockAttributes }) {
	tabButtons.forEach((button, index) => {
		const panel = tabPanels[index];

		if (panel && button.attributes.tabPanelClientId !== panel.clientId) {
			updateBlockAttributes(button.clientId, {
				tabPanelClientId: panel.clientId,
			});
		}
	});
}

function reorderButtons({
	tabButtons,
	currentPanelIds,
	tabListClientId,
	moveBlockToPosition,
}) {
	const outOfOrderButton = tabButtons.find((button, index) => {
		const expectedPanelId = currentPanelIds[index];
		return button.attributes.tabPanelClientId !== expectedPanelId;
	});

	if (!outOfOrderButton) {
		return null;
	}

	const targetIndex = currentPanelIds.indexOf(
		outOfOrderButton.attributes.tabPanelClientId
	);

	if (targetIndex < 0) {
		return null;
	}

	return moveBlockToPosition(
		outOfOrderButton.clientId,
		targetIndex,
		tabListClientId
	);
}

/**
 * Keep tab-list tab-button inner blocks in sync with tab-panels tab-panel blocks.
 *
 * @param {Object}      options
 * @param {string|null} options.tabListClientId
 * @param {string|null} options.tabPanelsClientId
 * @param {Object}      options.isAddingTabRef
 * @param {boolean}     options.enabled
 */
export function useTabButtonsSync({
	tabListClientId,
	tabPanelsClientId,
	isAddingTabRef,
	enabled = true,
}) {
	const { tabPanels, tabButtons } = useSelect(
		(storeSelect) => {
			if (!tabListClientId || !tabPanelsClientId) {
				return { tabPanels: [], tabButtons: [] };
			}

			const { getBlocks } = storeSelect(blockEditorStore);

			return {
				tabPanels: getBlocks(tabPanelsClientId),
				tabButtons: getBlocks(tabListClientId),
			};
		},
		[tabListClientId, tabPanelsClientId]
	);

	const {
		insertBlock,
		removeBlock,
		replaceInnerBlocks,
		moveBlockToPosition,
		updateBlockAttributes,
	} = useDispatch(blockEditorStore);

	const isSyncingRef = useRef(false);
	const prevPanelIdsRef = useRef([]);
	const panelIdsKey = tabPanels.map((block) => block.clientId).join('|');
	const buttonIdsKey = tabButtons.map((block) => block.clientId).join('|');

	useEffect(() => {
		if (!enabled) {
			return;
		}

		const prevPanelIds = prevPanelIdsRef.current;

		if (
			!tabListClientId ||
			!tabPanelsClientId ||
			isSyncingRef.current ||
			isAddingTabRef?.current
		) {
			return;
		}

		const currentPanelIds = tabPanels.map((panel) => panel.clientId);

		if (tabButtons.length === 0 && tabPanels.length > 0) {
			isSyncingRef.current = true;

			migrateLegacyButtons({
				tabPanels,
				tabListClientId,
				replaceInnerBlocks,
				updateBlockAttributes,
			});

			isSyncingRef.current = false;
			prevPanelIdsRef.current = currentPanelIds;
			return;
		}

		if (tabButtons.length < tabPanels.length) {
			isSyncingRef.current = true;

			insertMissingButton({
				tabButtons,
				tabPanels,
				tabListClientId,
				insertBlock,
			}).finally(() => {
				isSyncingRef.current = false;
			});

			prevPanelIdsRef.current = currentPanelIds;
			return;
		}

		if (tabButtons.length > tabPanels.length) {
			isSyncingRef.current = true;

			const orphanButton = findOrphanButton({
				tabButtons,
				prevPanelIds,
				currentPanelIds,
			});

			if (orphanButton) {
				removeBlock(orphanButton.clientId, false);
			}

			isSyncingRef.current = false;
			prevPanelIdsRef.current = currentPanelIds;
			return;
		}

		if (tabButtons.length === tabPanels.length && tabButtons.length > 0) {
			const hasStaleLink = tabButtons.some(
				(button, index) =>
					button.attributes.tabPanelClientId !==
					tabPanels[index]?.clientId
			);

			if (hasStaleLink) {
				isSyncingRef.current = true;

				relinkStaleButtons({
					tabButtons,
					tabPanels,
					updateBlockAttributes,
				});

				isSyncingRef.current = false;
				prevPanelIdsRef.current = currentPanelIds;
				return;
			}
		}

		const reorderPromise = reorderButtons({
			tabButtons,
			currentPanelIds,
			tabListClientId,
			moveBlockToPosition,
		});

		if (reorderPromise) {
			isSyncingRef.current = true;
			reorderPromise.finally(() => {
				isSyncingRef.current = false;
			});
		}

		prevPanelIdsRef.current = currentPanelIds;
	}, [
		tabListClientId,
		tabPanelsClientId,
		panelIdsKey,
		buttonIdsKey,
		tabPanels,
		tabButtons,
		insertBlock,
		removeBlock,
		replaceInnerBlocks,
		moveBlockToPosition,
		updateBlockAttributes,
		isAddingTabRef,
		enabled,
	]);
}

/**
 * Insert a paired tab-panel and tab-button at the given index.
 *
 * @param {Object}   options
 * @param {Function} options.insertBlock
 * @param {string}   options.tabPanelsClientId
 * @param {string}   options.tabListClientId
 * @param {number}   options.insertAt
 * @param {string}   options.defaultLabel
 * @return {Promise<void>}
 */
export async function insertTabPair({
	insertBlock,
	tabPanelsClientId,
	tabListClientId,
	insertAt,
	defaultLabel,
}) {
	await insertBlock(
		createBlock('matter/tab-panel'),
		insertAt,
		tabPanelsClientId,
		false
	);

	const panel =
		select(blockEditorStore).getBlocks(tabPanelsClientId)[insertAt];

	if (!panel) {
		return;
	}

	await insertBlock(
		createBlock('matter/tab-button', {
			label: defaultLabel,
			tabPanelClientId: panel.clientId,
		}),
		insertAt,
		tabListClientId,
		false
	);
}
