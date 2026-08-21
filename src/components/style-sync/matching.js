/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import { STYLE_SYNC_ATTRIBUTE, SYNCABLE_BLOCK_NAMES } from './constants';

/**
 * Build a structural signature from block names (ignores attributes/content).
 *
 * @param {Object} block Block object.
 * @return {string} Serialized name tree.
 */
export function getStructuralSignature(block) {
	if (!block) {
		return '';
	}

	const childSignatures = (block.innerBlocks || []).map((child) =>
		getStructuralSignature(child)
	);

	return JSON.stringify([block.name, childSignatures]);
}

/**
 * Whether a block is a syncable container type.
 *
 * @param {Object} block Block object.
 * @return {boolean} True when syncable.
 */
export function isSyncableContainer(block) {
	return !!block && SYNCABLE_BLOCK_NAMES.includes(block.name);
}

/**
 * Find the nearest syncable container ancestor (or self).
 *
 * @param {Function} select   Data select function.
 * @param {string}   clientId Starting client ID.
 * @return {Object|null} Syncable block or null.
 */
export function findNearestSyncableContainer(select, clientId) {
	const { getBlock, getBlockRootClientId } = select(blockEditorStore);
	let currentId = clientId;

	while (currentId) {
		const block = getBlock(currentId);
		if (isSyncableContainer(block)) {
			return block;
		}
		currentId = getBlockRootClientId(currentId);
	}

	return null;
}

/**
 * Find the nearest syncable container with styleSync enabled.
 *
 * @param {Function} select   Data select function.
 * @param {string}   clientId Starting client ID.
 * @return {Object|null} Active sync container or null.
 */
export function findNearestActiveSyncContainer(select, clientId) {
	const { getBlock, getBlockRootClientId } = select(blockEditorStore);
	let currentId = clientId;

	while (currentId) {
		const block = getBlock(currentId);
		if (
			isSyncableContainer(block) &&
			block.attributes?.[STYLE_SYNC_ATTRIBUTE]
		) {
			return block;
		}
		currentId = getBlockRootClientId(currentId);
	}

	return null;
}

/**
 * Collect similar containers for a given syncable container.
 *
 * Prefers direct siblings with the same name and structural signature.
 * Falls back to parallel cousins (e.g. card Groups in a parent grid).
 *
 * @param {Function} select            Data select function.
 * @param {string}   containerClientId Container client ID.
 * @return {Object[]} Similar container blocks (includes source when found).
 */
export function findSimilarContainers(select, containerClientId) {
	const { getBlock, getBlockRootClientId, getBlocks } =
		select(blockEditorStore);
	const container = getBlock(containerClientId);

	if (!container || !isSyncableContainer(container)) {
		return [];
	}

	const signature = getStructuralSignature(container);
	const parentId = getBlockRootClientId(containerClientId);
	const siblings = parentId ? getBlocks(parentId) : [];

	const directPeers = siblings.filter(
		(block) =>
			block.name === container.name &&
			getStructuralSignature(block) === signature
	);

	if (directPeers.length >= 2) {
		return directPeers;
	}

	// Parallel cousins: card Groups nested under sibling Columns.
	const grandparentId = parentId ? getBlockRootClientId(parentId) : null;

	if (!grandparentId) {
		return directPeers.length ? directPeers : [container];
	}

	const parentSiblings = getBlocks(grandparentId);
	const containerIndexInParent = siblings.findIndex(
		(block) => block.clientId === containerClientId
	);
	const peers = [];

	parentSiblings.forEach((uncle) => {
		const uncleChildren = uncle.innerBlocks || [];
		const candidates = uncleChildren.filter(
			(block) =>
				block.name === container.name &&
				getStructuralSignature(block) === signature
		);

		if (!candidates.length) {
			return;
		}

		const sameIndexMatch = candidates.find((candidate) => {
			const index = uncleChildren.findIndex(
				(block) => block.clientId === candidate.clientId
			);
			return index === containerIndexInParent;
		});

		peers.push(sameIndexMatch || candidates[0]);
	});

	if (peers.length >= 2) {
		return peers;
	}

	return directPeers.length ? directPeers : [container];
}

/**
 * Whether a similar container is part of the active sync set.
 *
 * @param {Object} block Container block.
 * @return {boolean} Whether the peer is opted in.
 */
export function isPeerInSyncSet(block) {
	return block?.attributes?.[STYLE_SYNC_ATTRIBUTE] === true;
}

/**
 * Peers in the active sync set for a container.
 *
 * @param {Function} select            Data select function.
 * @param {string}   containerClientId Container client ID.
 * @return {Object[]} Active sync peers.
 */
export function getActiveSyncPeers(select, containerClientId) {
	return findSimilarContainers(select, containerClientId).filter(
		isPeerInSyncSet
	);
}

/**
 * Walk syncable Group ancestors from nearest to root.
 *
 * @param {Function} select   Data select function.
 * @param {string}   clientId Starting client ID.
 * @return {Object[]} Syncable ancestors (nearest first), including self.
 */
export function getSyncableAncestors(select, clientId) {
	const { getBlock, getBlockRootClientId } = select(blockEditorStore);
	const ancestors = [];
	let currentId = clientId;

	while (currentId) {
		const block = getBlock(currentId);
		if (isSyncableContainer(block)) {
			ancestors.push(block);
		}
		currentId = getBlockRootClientId(currentId);
	}

	return ancestors;
}

/**
 * Collect syncable container descendants of a root (depth-first).
 *
 * @param {Function} select       Data select function.
 * @param {string}   rootClientId Root container client ID.
 * @return {Object[]} Syncable descendant blocks.
 */
export function getSyncableDescendants(select, rootClientId) {
	const { getBlock } = select(blockEditorStore);
	const root = getBlock(rootClientId);

	if (!root) {
		return [];
	}

	const syncables = [];

	const walk = (blocks) => {
		(blocks || []).forEach((block) => {
			if (isSyncableContainer(block)) {
				syncables.push(block);
			}
			walk(block.innerBlocks);
		});
	};

	walk(root.innerBlocks);
	return syncables;
}

/**
 * Whether clientId is the root or a descendant of rootClientId.
 *
 * @param {Function} select       Data select function.
 * @param {string}   rootClientId Root client ID.
 * @param {string}   clientId     Candidate client ID.
 * @return {boolean} True when under root.
 */
export function isBlockUnderClientId(select, rootClientId, clientId) {
	if (rootClientId === clientId) {
		return true;
	}

	const { getBlockParents } = select(blockEditorStore);
	return getBlockParents(clientId).includes(rootClientId);
}

/**
 * Find the first set of similar syncable containers nested under a root.
 *
 * Used when enabling sync on a wrapper so card Groups also get styleSync
 * for per-card opt-out.
 *
 * @param {Function} select       Data select function.
 * @param {string}   rootClientId Root container client ID.
 * @return {Object[]} Similar containers, or an empty array.
 */
export function findDescendantSimilarSet(select, rootClientId) {
	const descendants = getSyncableDescendants(select, rootClientId);

	for (const descendant of descendants) {
		const similar = findSimilarContainers(select, descendant.clientId);
		const allUnderRoot =
			similar.length >= 2 &&
			similar.every((block) =>
				isBlockUnderClientId(select, rootClientId, block.clientId)
			);

		if (allUnderRoot) {
			return similar;
		}
	}

	return [];
}

/**
 * Resolve sync context for a selected block.
 *
 * Walks Group ancestors and prefers the outermost active peer set that
 * contains the selection. That way a synced card Group maps style changes
 * anywhere in its subtree (nested Groups, headings, etc.) to peer cards.
 *
 * @param {Function} select   Data select function.
 * @param {string}   clientId Selected block client ID.
 * @return {Object|null} Context with mode `sync` or `offer`, or null.
 */
export function resolveSyncContext(select, clientId) {
	const ancestors = getSyncableAncestors(select, clientId);

	if (!ancestors.length) {
		return null;
	}

	let syncContext = null;
	let offerCandidate = null;

	ancestors.forEach((ancestor) => {
		const similar = findSimilarContainers(select, ancestor.clientId);

		if (similar.length < 2) {
			return;
		}

		const peers = similar.filter(isPeerInSyncSet);
		const ancestorInPeers = peers.some(
			(block) => block.clientId === ancestor.clientId
		);

		if (peers.length >= 2 && ancestorInPeers) {
			// Keep overwriting so the outermost active set wins.
			syncContext = {
				mode: 'sync',
				container: ancestor,
				peers,
				similar,
				activeAncestor: null,
			};
			return;
		}

		if (!offerCandidate) {
			offerCandidate = {
				mode: 'offer',
				container: ancestor,
				similar,
				peers: [],
				activeAncestor: null,
			};
		}
	});

	return syncContext || offerCandidate;
}

/**
 * Build a relative path of indexes + expected names from container to target.
 *
 * @param {Function} select            Data select function.
 * @param {string}   containerClientId Container client ID.
 * @param {string}   targetClientId    Target client ID.
 * @return {Array<{index: number, name: string}>|null} Path or null.
 */
export function getPathFromContainer(
	select,
	containerClientId,
	targetClientId
) {
	const { getBlock, getBlockRootClientId, getBlocks } =
		select(blockEditorStore);

	if (containerClientId === targetClientId) {
		return [];
	}

	const path = [];
	let currentId = targetClientId;

	while (currentId && currentId !== containerClientId) {
		const parentId = getBlockRootClientId(currentId);
		if (!parentId) {
			return null;
		}

		const siblings = getBlocks(parentId);
		const index = siblings.findIndex(
			(block) => block.clientId === currentId
		);
		const block = getBlock(currentId);

		if (index < 0 || !block) {
			return null;
		}

		path.unshift({ index, name: block.name });
		currentId = parentId;
	}

	if (currentId !== containerClientId) {
		return null;
	}

	return path;
}

/**
 * Resolve a block at a relative path within a container.
 *
 * @param {Object}                               container Container block.
 * @param {Array<{index: number, name: string}>} path      Path segments.
 * @return {Object|null} Block at path or null when structure diverges.
 */
export function getBlockAtPath(container, path) {
	if (!container) {
		return null;
	}

	if (!path?.length) {
		return container;
	}

	let current = container;

	for (const segment of path) {
		const child = current.innerBlocks?.[segment.index];
		if (!child || child.name !== segment.name) {
			return null;
		}
		current = child;
	}

	return current;
}
