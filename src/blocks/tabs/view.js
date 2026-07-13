/**
 * WordPress dependencies
 */
import {
	store,
	getContext,
	getElement,
	withSyncEvent,
} from '@wordpress/interactivity';

function createReadOnlyProxy(obj) {
	const arrayMutationMethods = new Set([
		'push',
		'pop',
		'shift',
		'unshift',
		'splice',
		'sort',
		'reverse',
		'copyWithin',
		'fill',
	]);

	return new Proxy(obj, {
		get(target, prop) {
			if (Array.isArray(target) && arrayMutationMethods.has(prop)) {
				return () => {};
			}

			const value = target[prop];
			if (typeof value === 'object' && value !== null) {
				return createReadOnlyProxy(value);
			}
			return value;
		},
		set() {
			return false;
		},
		deleteProperty() {
			return false;
		},
	});
}

/**
 * Non-reactive map of tabsId → interactivity context.
 * Used for programmatic setActiveTab(id, index) outside element context.
 *
 * @type {Map<string, Object>}
 */
const tabsContexts = new Map();

const getTabsListForId = (id) => {
	if (!id) {
		return undefined;
	}

	return privateState.items[id]?.tabsList || privateState[id];
};

const dispatchTabsChange = (id, tabIndex, tab) => {
	document.dispatchEvent(
		new window.CustomEvent('matter/tabs/change', {
			detail: {
				id,
				tabIndex,
				tab: tab || null,
			},
		})
	);
};

/**
 * Apply an active tab change against a known tabs context.
 *
 * @param {string}  id          Tabs instance id.
 * @param {Object}  context     Interactivity context for the tabs instance.
 * @param {number}  tabIndex    Target tab index.
 * @param {boolean} scrollToTab Whether to scroll the tab into view.
 * @return {void}
 */
const applyActiveTab = (id, context, tabIndex, scrollToTab = false) => {
	const tabsList = getTabsListForId(id);

	if (!id || !context || !tabsList?.length) {
		return;
	}

	let newIndex = tabIndex;
	if (newIndex < 0) {
		newIndex = 0;
	} else if (newIndex >= tabsList.length) {
		newIndex = tabsList.length - 1;
	}

	const previousIndex = context.activeTabIndex ?? 0;

	context.activeTabIndex = newIndex;

	if (context.deepLinking) {
		privateActions.updateUrlHash(newIndex, id);
	}

	if (scrollToTab) {
		privateActions.scrollTabIntoView(newIndex, id);
	}

	if (previousIndex !== newIndex) {
		dispatchTabsChange(id, newIndex, tabsList[newIndex]);
	}
};

// Private store for internal tabs functionality and security.
const { actions: privateActions, state: privateState } = store(
	'matter/tabs/private',
	{
		state: {
			items: {},
			get tabsList() {
				const context = getContext();
				const tabsId = context?.tabsId;
				return getTabsListForId(tabsId);
			},
			get tabIndex() {
				const context = getContext();

				if (typeof context?.tabIndex === 'number') {
					return context.tabIndex;
				}

				const { attributes } = getElement();

				let tabId = attributes?.id?.replace('tab__', '') || null;

				if (!tabId && context?.tab?.id) {
					tabId = context.tab.id;
				}

				if (!tabId) {
					return null;
				}

				const { tabsList } = privateState;

				if (!tabsList) {
					return null;
				}

				return tabsList.findIndex((t) => t.id === tabId);
			},
			get isActiveTab() {
				const { activeTabIndex } = getContext();
				const { tabIndex } = privateState;
				return activeTabIndex === tabIndex;
			},
			get tabIndexAttribute() {
				return privateState.isActiveTab ? 0 : -1;
			},
			get activeTabIndex() {
				const context = getContext();
				return context?.activeTabIndex ?? 0;
			},
			get selectValue() {
				return String(privateState.activeTabIndex);
			},
		},
		actions: {
			handleTabKeyDown: withSyncEvent((event) => {
				const context = getContext();
				const { isVertical } = context;
				const { tabIndex } = privateState;

				if (tabIndex === null) {
					return;
				}

				if (event.key === 'ArrowRight' && !isVertical) {
					event.preventDefault();
					privateActions.moveFocus(tabIndex + 1);
				} else if (event.key === 'ArrowLeft' && !isVertical) {
					event.preventDefault();
					privateActions.moveFocus(tabIndex - 1);
				} else if (event.key === 'ArrowDown' && isVertical) {
					event.preventDefault();
					privateActions.moveFocus(tabIndex + 1);
				} else if (event.key === 'ArrowUp' && isVertical) {
					event.preventDefault();
					privateActions.moveFocus(tabIndex - 1);
				}
			}),
			handleTabClick: withSyncEvent((event) => {
				event.preventDefault();

				const { tabIndex } = privateState;
				if (tabIndex !== null) {
					privateActions.setActiveTab(tabIndex);
				}
			}),
			handleSelectChange: withSyncEvent((event) => {
				const selectedIndex = parseInt(event.target.value, 10);

				if (Number.isNaN(selectedIndex)) {
					return;
				}

				privateActions.setActiveTab(selectedIndex, false);
			}),
			moveFocus: (tabIndex) => {
				const { tabsList } = privateState;

				if (!tabsList || tabsList.length === 0) {
					return;
				}

				let newIndex = tabIndex;
				if (newIndex < 0) {
					newIndex = tabsList.length - 1;
				} else if (newIndex >= tabsList.length) {
					newIndex = 0;
				}

				const tabId = tabsList[newIndex].id;
				const tabElement = document.getElementById('tab__' + tabId);
				if (tabElement) {
					tabElement.focus();
				}
			},
			/**
			 * Sets the active tab for the current contextual tabs instance.
			 *
			 * @param {number}  tabIndex    The index of the active tab.
			 * @param {boolean} scrollToTab Whether to scroll the tab button into view.
			 */
			setActiveTab: (tabIndex, scrollToTab = false) => {
				const context = getContext();
				applyActiveTab(context?.tabsId, context, tabIndex, scrollToTab);
			},
			/**
			 * Sets the active tab for a tabs instance by id.
			 *
			 * @param {string}  id          Tabs instance id.
			 * @param {number}  tabIndex    The index of the active tab.
			 * @param {boolean} scrollToTab Whether to scroll the tab button into view.
			 */
			setActiveTabById: (id, tabIndex, scrollToTab = false) => {
				applyActiveTab(id, tabsContexts.get(id), tabIndex, scrollToTab);
			},
			activateTabByHash: (hash) => {
				const { tabsList } = privateState;

				if (!tabsList || tabsList.length === 0 || !hash) {
					return;
				}

				const targetId = hash.replace('#', '');
				const tabIndex = tabsList.findIndex(
					(tab) => tab.deepLinkingId === targetId
				);

				if (tabIndex < 0) {
					return;
				}

				privateActions.setActiveTab(tabIndex, true);
			},
			updateUrlHash: (tabIndex, passthroughId = false) => {
				const context =
					typeof passthroughId === 'string'
						? tabsContexts.get(passthroughId)
						: getContext();

				if (!context?.deepLinking) {
					return;
				}

				const id = context.tabsId;
				const tabsList = getTabsListForId(id);
				const deepLinkingId = tabsList?.[tabIndex]?.deepLinkingId;

				if (!deepLinkingId) {
					return;
				}

				const newHash = `#${deepLinkingId}`;

				if (context.deepLinkingUpdateHistory) {
					window.history.pushState(null, '', newHash);
				} else {
					window.history.replaceState(null, '', newHash);
				}
			},
			scrollTabIntoView: (tabIndex, passthroughId = false) => {
				const id =
					typeof passthroughId === 'string'
						? passthroughId
						: getContext()?.tabsId;
				const tabsList = getTabsListForId(id);
				const tab = tabsList?.[tabIndex];

				if (!tab?.id) {
					return;
				}

				const tabElement = document.getElementById('tab__' + tab.id);

				if (!tabElement) {
					return;
				}

				setTimeout(() => {
					tabElement.scrollIntoView({
						behavior: 'smooth',
						block: 'start',
					});
				}, 100);
			},
			onHashChange: () => {
				const context = getContext();

				if (!context.deepLinking) {
					return;
				}

				const { hash } = window.location;

				if (hash) {
					privateActions.activateTabByHash(hash);
				}
			},
		},
		callbacks: {
			onTabsInit: () => {
				const context = getContext();
				const tabsId = context?.tabsId;

				if (tabsId) {
					tabsContexts.set(tabsId, context);
					privateState.items[tabsId] = {
						tabsList: privateState[tabsId] || [],
					};
				}

				if (!context?.deepLinking) {
					return;
				}

				const { hash } = window.location;

				if (hash) {
					privateActions.activateTabByHash(hash);
				}
			},
		},
	},
	{
		lock: true,
	}
);

// Public store for third-party extensibility.
store('matter/tabs', {
	state: {
		get items() {
			return createReadOnlyProxy(privateState.items);
		},
		get tabsList() {
			const list = privateState.tabsList;

			return list ? createReadOnlyProxy(list) : undefined;
		},
		get tabIndex() {
			return privateState.tabIndex;
		},
		get isActiveTab() {
			return privateState.isActiveTab;
		},
		get activeTabIndex() {
			return privateState.activeTabIndex;
		},
	},
	actions: {
		/**
		 * Sets the active tab index.
		 *
		 * @param {string|false} id          Tabs instance id, or false for current context.
		 * @param {number}       tabIndex    The index of the active tab.
		 * @param {boolean}      scrollToTab Whether to scroll to the tab element.
		 */
		setActiveTab(id = false, tabIndex = 0, scrollToTab = false) {
			if (typeof id === 'string') {
				privateActions.setActiveTabById(id, tabIndex, scrollToTab);
				return;
			}

			privateActions.setActiveTab(tabIndex, scrollToTab);
		},
	},
});
