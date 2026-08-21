/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import { getStyleAttributes } from './attributes';
import { STYLE_SYNC_ATTRIBUTE } from './constants';
import {
	findDescendantSimilarSet,
	findSimilarContainers,
	getActiveSyncPeers,
	getBlockAtPath,
	getPathFromContainer,
} from './matching';

/**
 * Re-entrancy guard so programmatic peer updates do not re-trigger the watcher.
 */
let isApplyingStyleSync = false;

/**
 * @return {boolean} Whether a sync apply is in progress.
 */
export function isStyleSyncApplying() {
	return isApplyingStyleSync;
}

/**
 * Run a callback while suppressing the style-sync watcher.
 *
 * @param {Function} callback Callback to run.
 * @return {*} Callback return value.
 */
export function withStyleSyncApplyGuard(callback) {
	isApplyingStyleSync = true;
	try {
		return callback();
	} finally {
		isApplyingStyleSync = false;
	}
}

/**
 * Apply style attributes from a source block to path-matched peers.
 *
 * @param {Object}   registry          Data registry.
 * @param {string}   sourceClientId    Selected / source block client ID.
 * @param {string}   containerClientId Sync container client ID.
 * @param {Object[]} peerContainers    Peer container blocks (may include source).
 * @return {number} Number of peer blocks updated (excluding source).
 */
export function applyStyleSyncToPeers(
	registry,
	sourceClientId,
	containerClientId,
	peerContainers
) {
	const { select, dispatch, batch } = registry;
	const { getBlock } = select(blockEditorStore);

	const sourceBlock = getBlock(sourceClientId);
	if (!sourceBlock) {
		return 0;
	}

	const path = getPathFromContainer(
		select,
		containerClientId,
		sourceClientId
	);
	if (path === null) {
		return 0;
	}

	const { updateBlockAttributes } = dispatch(blockEditorStore);
	const targets = peerContainers.filter(
		(peer) => peer.clientId !== containerClientId
	);

	let updatedCount = 0;

	withStyleSyncApplyGuard(() => {
		batch(() => {
			targets.forEach((peerContainer) => {
				// Refresh peer from store in case of stale references.
				const freshPeer = getBlock(peerContainer.clientId);
				const targetBlock = getBlockAtPath(freshPeer, path);

				if (!targetBlock) {
					return;
				}

				const nextAttributes = getStyleAttributes(
					sourceBlock,
					targetBlock
				);

				if (!Object.keys(nextAttributes).length) {
					return;
				}

				updateBlockAttributes(targetBlock.clientId, nextAttributes);
				updatedCount += 1;
			});
		});
	});

	return updatedCount;
}

/**
 * Set styleSync on a list of containers.
 *
 * @param {Function} updateBlockAttributes Attribute updater.
 * @param {Object[]} blocks                Containers to update.
 * @param {boolean}  value                 Attribute value.
 */
function setStyleSyncOnBlocks(updateBlockAttributes, blocks, value) {
	blocks.forEach((block) => {
		if (block.attributes?.[STYLE_SYNC_ATTRIBUTE] !== value) {
			updateBlockAttributes(block.clientId, {
				[STYLE_SYNC_ATTRIBUTE]: value,
			});
		}
	});
}

/**
 * Enable styleSync on a container and all similar siblings/cousins.
 *
 * @param {Object} registry          Data registry.
 * @param {string} containerClientId Container client ID.
 * @return {Object[]} Containers that were enabled.
 */
export function enableStyleSyncOnSimilar(registry, containerClientId) {
	const { select, dispatch, batch } = registry;
	const { updateBlockAttributes } = dispatch(blockEditorStore);
	const similar = findSimilarContainers(select, containerClientId);

	withStyleSyncApplyGuard(() => {
		batch(() => {
			setStyleSyncOnBlocks(updateBlockAttributes, similar, true);
		});
	});

	return similar;
}

/**
 * Enable styleSync from a toolbar toggle.
 *
 * Turns sync on for the container. When it has no similar peers (e.g. an outer
 * wrapper), also enables sync on the first nested similar set (card Groups) so
 * each card can opt out individually.
 *
 * @param {Object} registry          Data registry.
 * @param {string} containerClientId Container client ID.
 * @return {Object[]} Containers that received styleSync true.
 */
export function enableStyleSyncFromContainer(registry, containerClientId) {
	const { select, dispatch, batch } = registry;
	const { getBlock } = select(blockEditorStore);
	const container = getBlock(containerClientId);

	if (!container) {
		return [];
	}

	const { updateBlockAttributes } = dispatch(blockEditorStore);
	const similar = findSimilarContainers(select, containerClientId);
	const nestedSet =
		similar.length >= 2
			? []
			: findDescendantSimilarSet(select, containerClientId);
	const targets = [container, ...(similar.length >= 2 ? similar : nestedSet)];
	const uniqueTargets = [
		...new Map(targets.map((block) => [block.clientId, block])).values(),
	];

	withStyleSyncApplyGuard(() => {
		batch(() => {
			setStyleSyncOnBlocks(updateBlockAttributes, uniqueTargets, true);
		});
	});

	return uniqueTargets;
}

/**
 * Disable styleSync from a toolbar toggle.
 *
 * Opting out a card only clears that card. Disabling a wrapper with no peers
 * also clears its nested similar set.
 *
 * @param {Object} registry          Data registry.
 * @param {string} containerClientId Container client ID.
 * @return {Object[]} Containers that received styleSync false.
 */
export function disableStyleSyncFromContainer(registry, containerClientId) {
	const { select, dispatch, batch } = registry;
	const { getBlock } = select(blockEditorStore);
	const container = getBlock(containerClientId);

	if (!container) {
		return [];
	}

	const { updateBlockAttributes } = dispatch(blockEditorStore);
	const similar = findSimilarContainers(select, containerClientId);
	const targets =
		similar.length >= 2
			? [container]
			: [
					container,
					...findDescendantSimilarSet(select, containerClientId),
				];
	const uniqueTargets = [
		...new Map(targets.map((block) => [block.clientId, block])).values(),
	];

	withStyleSyncApplyGuard(() => {
		batch(() => {
			setStyleSyncOnBlocks(updateBlockAttributes, uniqueTargets, false);
		});
	});

	return uniqueTargets;
}

/**
 * Disable styleSync on the active sync set for a container.
 *
 * @param {Object}      registry          Data registry.
 * @param {string}      containerClientId Local sync container client ID.
 * @param {string|null} ancestorClientId  Optional synced ancestor to clear.
 * @return {Object[]} Containers that were disabled.
 */
export function disableStyleSyncOnActiveSet(
	registry,
	containerClientId,
	ancestorClientId = null
) {
	const { select, dispatch, batch } = registry;
	const { updateBlockAttributes } = dispatch(blockEditorStore);
	const activePeers = getActiveSyncPeers(select, containerClientId);

	withStyleSyncApplyGuard(() => {
		batch(() => {
			activePeers.forEach((block) => {
				updateBlockAttributes(block.clientId, {
					[STYLE_SYNC_ATTRIBUTE]: false,
				});
			});

			if (ancestorClientId) {
				updateBlockAttributes(ancestorClientId, {
					[STYLE_SYNC_ATTRIBUTE]: false,
				});
			}
		});
	});

	return activePeers;
}
