/**
 * Build entity query args from a core/query block's attributes.
 *
 * @param {Object} queryAttributes Query block attributes.
 * @return {Object|null} Entity query args or null when invalid.
 */
export function getEntityQueryArgs(queryAttributes) {
	if (!queryAttributes?.query) {
		return null;
	}

	const { query } = queryAttributes;

	return {
		per_page: query.perPage,
		pages: query.pages,
		offset: query.offset,
		order: query.order,
		orderby: query.orderBy,
		author: query.author,
		search: query.search,
		exclude: query.exclude,
		sticky: query.sticky,
	};
}

/**
 * Build tabs list entries from query post records for the editor.
 *
 * @param {Array<Object>} posts   Post entity records.
 * @param {string}        tabsId  Tabs block anchor or fallback ID.
 * @return {Array<Object>} Tabs list context entries.
 */
export function buildTabsListFromPosts(posts, tabsId) {
	const baseId = tabsId || 'tabs';

	return (posts ?? []).map((post, index) => {
		const postId = post.id ?? post.ID;
		const title =
			typeof post.title === 'object'
				? post.title?.rendered
				: post.title ?? '';

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
 * Find the core/query block inside tab-panels inner blocks.
 *
 * @param {Array<Object>} innerBlocks Tab panels inner blocks.
 * @return {Object|null} Query block or null.
 */
export function findQueryBlock(innerBlocks) {
	return (
		innerBlocks?.find((block) => block.name === 'core/query') ?? null
	);
}

/**
 * Walk up the block tree to find the ancestor matter/tabs block client ID.
 *
 * @param {string} clientId Starting block client ID.
 * @param {Function} getBlock Get block by client ID.
 * @param {Function} getBlockRootClientId Get parent client ID.
 * @return {string|null} Tabs block client ID.
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
 * @param {string} clientId Starting block client ID.
 * @param {Function} getBlock Get block by client ID.
 * @param {Function} getBlockRootClientId Get parent client ID.
 * @return {string|null} Tab panels block client ID.
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
 * @param {string} clientId Tab panel client ID.
 * @param {Function} getBlock Get block by client ID.
 * @param {Function} getBlockRootClientId Get parent client ID.
 * @param {Function} getBlocks Get inner blocks of a block.
 * @return {number} Tab panel index or 0.
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
