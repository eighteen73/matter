/**
 * WordPress dependencies
 */
import { createBlock } from '@wordpress/blocks';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { useSelect, useDispatch, select } from '@wordpress/data';
import { useEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Keep tab-list tab-button inner blocks in sync with tab-panels tab-panel blocks.
 *
 * @param {Object}      options
 * @param {string|null} options.tabListClientId
 * @param {string|null} options.tabPanelsClientId
 * @param {Object}      options.isAddingTabRef
 */
export function useTabButtonsSync({
	tabListClientId,
	tabPanelsClientId,
	isAddingTabRef,
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

			isSyncingRef.current = false;
			prevPanelIdsRef.current = currentPanelIds;
			return;
		}

		if (tabButtons.length < tabPanels.length) {
			isSyncingRef.current = true;
			const insertAt = tabButtons.length;
			const panel = tabPanels[insertAt];

			insertBlock(
				createBlock('matter/tab-button', {
					label: __('Tab'),
					tabPanelClientId: panel?.clientId,
				}),
				insertAt,
				tabListClientId,
				false
			).finally(() => {
				isSyncingRef.current = false;
			});
			prevPanelIdsRef.current = currentPanelIds;
			return;
		}

		if (tabButtons.length > tabPanels.length) {
			isSyncingRef.current = true;
			const panelClientIds = new Set(currentPanelIds);
			let orphanButton = null;
			const removedPanelIds = prevPanelIds.filter(
				(id) => !currentPanelIds.includes(id)
			);

			for (const removedId of removedPanelIds) {
				const linkedButton = tabButtons.find(
					(button) => button.attributes.tabPanelClientId === removedId
				);

				if (linkedButton) {
					orphanButton = linkedButton;
					break;
				}

				const removedIndex = prevPanelIds.indexOf(removedId);

				if (removedIndex >= 0 && tabButtons[removedIndex]) {
					orphanButton = tabButtons[removedIndex];
					break;
				}
			}

			if (!orphanButton) {
				orphanButton = tabButtons.find(
					(button) =>
						button.attributes.tabPanelClientId &&
						!panelClientIds.has(button.attributes.tabPanelClientId)
				);
			}

			if (!orphanButton) {
				orphanButton = tabButtons[tabButtons.length - 1];
			}

			removeBlock(orphanButton.clientId, false);
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

				tabButtons.forEach((button, index) => {
					const panel = tabPanels[index];

					if (
						panel &&
						button.attributes.tabPanelClientId !== panel.clientId
					) {
						updateBlockAttributes(button.clientId, {
							tabPanelClientId: panel.clientId,
						});
					}
				});

				isSyncingRef.current = false;
				prevPanelIdsRef.current = currentPanelIds;
				return;
			}
		}

		const panelOrder = currentPanelIds;
		const outOfOrderButton = tabButtons.find((button, index) => {
			const expectedPanelId = panelOrder[index];
			return button.attributes.tabPanelClientId !== expectedPanelId;
		});

		if (outOfOrderButton) {
			isSyncingRef.current = true;
			const targetIndex = panelOrder.indexOf(
				outOfOrderButton.attributes.tabPanelClientId
			);

			if (targetIndex >= 0) {
				moveBlockToPosition(
					outOfOrderButton.clientId,
					targetIndex,
					tabListClientId
				).finally(() => {
					isSyncingRef.current = false;
				});
			} else {
				isSyncingRef.current = false;
			}
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
