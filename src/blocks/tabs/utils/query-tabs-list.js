/**
 * WordPress dependencies
 */
import { cleanForSlug } from '@wordpress/url';
import { store as coreDataStore } from '@wordpress/core-data';
import { store as editorStore } from '@wordpress/editor';

/**
 * Build REST-safe entity query args from a core/query block's attributes.
 *
 * Mirrors core/post-template: omit editor-only keys (inherit, pages) and skip
 * empty author/search/sticky values that break getEntityRecords resolution.
 *
 * @param {Object} queryAttributes Query block attributes.
 * @return {Object|null} Entity query args or null when invalid.
 */
export function getEntityQueryArgs(queryAttributes) {
	if (!queryAttributes?.query) {
		return null;
	}

	const {
		perPage,
		offset = 0,
		order,
		orderBy,
		author,
		search,
		exclude,
		sticky,
		parents,
		format,
	} = queryAttributes.query;

	const entityQuery = {
		offset: offset || 0,
		order,
		orderby: orderBy,
	};

	if (perPage) {
		entityQuery.per_page = perPage;
	}

	if (author) {
		entityQuery.author = author;
	}

	if (search) {
		entityQuery.search = search;
	}

	if (exclude?.length) {
		entityQuery.exclude = exclude;
	}

	if (parents?.length) {
		entityQuery.parent = parents;
	}

	if (format?.length) {
		entityQuery.format = format;
	}

	if (['exclude', 'only'].includes(sticky)) {
		entityQuery.sticky = sticky === 'only';
	}

	if (['', 'ignore'].includes(sticky)) {
		entityQuery.ignore_sticky = sticky === 'ignore';
	}

	return entityQuery;
}

/**
 * Resolve query posts for the tabs block editor preview.
 *
 * @param {Object}   queryAttributes Query block attributes.
 * @param {Function} select          Data store select function.
 * @return {Array<Object>} Post entity records.
 */
export function getQueryPostsForEditor(queryAttributes, select) {
	if (!queryAttributes?.query) {
		return [];
	}

	const { query } = queryAttributes;
	const postType = query.postType || 'post';
	const { getEntityRecords, getEntityRecord } = select(coreDataStore);

	if (query.inherit) {
		const inheritQuery = {
			order: query.order,
			orderby: query.orderBy,
		};

		if (query.perPage) {
			inheritQuery.per_page = query.perPage;
		}

		const inheritedRaw = getEntityRecords(
			'postType',
			postType,
			inheritQuery
		);
		const inheritedPosts = inheritedRaw ?? [];

		if (inheritedPosts.length > 0) {
			return inheritedPosts;
		}

		const { getCurrentPostId, getCurrentPostType } = select(editorStore);
		const postId = getCurrentPostId();
		const currentPostType = getCurrentPostType() || postType;

		if (!postId) {
			return [];
		}

		const currentPost = getEntityRecord(
			'postType',
			currentPostType,
			postId
		);

		return currentPost ? [currentPost] : [];
	}

	const entityQuery = getEntityQueryArgs(queryAttributes);

	if (!entityQuery) {
		return [];
	}

	return getEntityRecords('postType', postType, entityQuery) ?? [];
}

/**
 * Build tabs list entries from query post records for the editor.
 *
 * @param {Array<Object>} posts  Post entity records.
 * @param {string}        tabsId Tabs block anchor or fallback ID.
 * @return {Array<Object>}         Tabs list context entries.
 */
export function buildTabsListFromPosts(posts, tabsId) {
	const baseId = tabsId || 'tabs';

	return (posts ?? []).map((post, index) => {
		const postId = post.id ?? post.ID;
		const title =
			typeof post.title === 'object'
				? post.title?.rendered
				: (post.title ?? '');

		return {
			id: `${baseId}-tab-${postId}`,
			label: title.replace(/<[^>]+>/g, '') || '',
			index,
			clientId: `query-${postId}`,
			panelClientId: null,
			deepLinkingId: post.slug || '',
		};
	});
}

/**
 * Build a manual-mode tabs list entry matching PHP conventions.
 *
 * @param {Object}      options
 * @param {Object}      options.button Tab button block.
 * @param {Object|null} options.panel  Tab panel block.
 * @param {number}      options.index  Tab index.
 * @param {string}      options.tabsId Tabs block anchor.
 * @return {Object}                    Tabs list context entry.
 */
export function buildManualTabEntry({ button, panel, index, tabsId }) {
	const label = button?.attributes?.label || '';
	const anchor = panel?.attributes?.anchor;
	const baseId = tabsId || '';

	let id;
	if (anchor) {
		id = anchor;
	} else if (baseId) {
		id = `${baseId}-tab-${index}`;
	} else {
		id = `tab-${index}`;
	}

	const deepLinkingId = anchor || (label ? cleanForSlug(label) : id);

	return {
		id,
		label,
		deepLinkingId,
		clientId: button?.clientId,
		panelClientId: panel?.clientId,
		index,
	};
}

/**
 * Find the core/query block inside tab-panels inner blocks.
 *
 * @param {Array<Object>} innerBlocks Tab panels inner blocks.
 * @return {Object|null}              Query block or null.
 */
export function findQueryBlock(innerBlocks) {
	return innerBlocks?.find((block) => block.name === 'core/query') ?? null;
}

/**
 * Walk up the block tree to find the ancestor matter/tabs block client ID.
 *
 * @param {string}   clientId             Starting block client ID.
 * @param {Function} getBlock             Get block by client ID.
 * @param {Function} getBlockRootClientId Get parent client ID.
 * @return {string|null}                  Tabs block client ID.
 */
export function findTabsClientId(clientId, getBlock, getBlockRootClientId) {
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
 * Walk up the block tree to find the ancestor matter/tab-panels block client ID.
 *
 * @param {string}   clientId             Starting block client ID.
 * @param {Function} getBlock             Get block by client ID.
 * @param {Function} getBlockRootClientId Get parent client ID.
 * @return {string|null}                  Tab panels block client ID.
 */
export function findTabPanelsClientId(
	clientId,
	getBlock,
	getBlockRootClientId
) {
	let currentId = clientId;

	while (currentId) {
		const block = getBlock(currentId);

		if (block?.name === 'matter/tab-panels') {
			return currentId;
		}

		currentId = getBlockRootClientId(currentId);
	}

	return null;
}

/**
 * Get the block index of a tab panel relative to its tab-panels ancestor.
 *
 * @param {string}   clientId             Tab panel client ID.
 * @param {Function} getBlock             Get block by client ID.
 * @param {Function} getBlockRootClientId Get parent client ID.
 * @param {Function} getBlocks            Get inner blocks of a block.
 * @return {number}                       Tab panel index or 0.
 */
export function getTabPanelIndex(
	clientId,
	getBlock,
	getBlockRootClientId,
	getBlocks
) {
	const tabPanelsClientId = findTabPanelsClientId(
		clientId,
		getBlock,
		getBlockRootClientId
	);

	if (!tabPanelsClientId) {
		return 0;
	}

	const tabPanelsBlock = getBlock(tabPanelsClientId);
	const queryBlock = findQueryBlock(tabPanelsBlock?.innerBlocks ?? []);

	if (queryBlock) {
		return 0;
	}

	const panels = getBlocks(tabPanelsClientId).filter(
		(block) => block.name === 'matter/tab-panel'
	);

	const panelIndex = panels.findIndex((block) => block.clientId === clientId);

	return panelIndex >= 0 ? panelIndex : 0;
}
