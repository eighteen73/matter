/**
 * WordPress dependencies
 */
import { store, getContext, withSyncEvent } from '@wordpress/interactivity';

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
 * Non-reactive map of accordionId → interactivity context.
 *
 * @type {Map<string, Object>}
 */
const accordionContexts = new Map();

let hashHandled = false;

const findItem = (accordionItems, id) =>
	accordionItems?.find((item) => item.id === id);

const setItemOpen = (context, id, isOpen) => {
	const { autoclose, accordionItems } = context;
	if (!accordionItems?.length) {
		return;
	}

	if (autoclose) {
		accordionItems.forEach((item) => {
			item.isOpen = item.id === id ? isOpen : false;
		});
		return;
	}

	const item = findItem(accordionItems, id);
	if (item) {
		item.isOpen = isOpen;
	}
};

const { actions: privateActions, state: privateState } = store(
	'matter/accordion/private',
	{
		state: {
			get isOpen() {
				const { id, accordionItems, openByDefault } = getContext();
				const accordionItem = findItem(accordionItems, id);
				return accordionItem ? accordionItem.isOpen : !!openByDefault;
			},
		},
		actions: {
			toggle: () => {
				const context = getContext();
				const { id, accordionItems } = context;
				const accordionItem = findItem(accordionItems, id);
				if (!accordionItem) {
					return;
				}
				setItemOpen(context, id, !accordionItem.isOpen);
			},
			open: () => {
				const context = getContext();
				setItemOpen(context, context.id, true);
			},
			close: () => {
				const context = getContext();
				setItemOpen(context, context.id, false);
			},
			handleKeyDown: withSyncEvent((event) => {
				if (
					event.key !== 'ArrowUp' &&
					event.key !== 'ArrowDown' &&
					event.key !== 'Home' &&
					event.key !== 'End'
				) {
					return;
				}

				event.preventDefault();
				const context = getContext();
				const { id, accordionItems } = context;
				if (!accordionItems?.length) {
					return;
				}

				const currentIndex = accordionItems.findIndex(
					(item) => item.id === id
				);
				if (currentIndex < 0) {
					return;
				}

				let nextIndex;
				switch (event.key) {
					case 'ArrowUp':
						nextIndex = Math.max(0, currentIndex - 1);
						break;
					case 'ArrowDown':
						nextIndex = Math.min(
							currentIndex + 1,
							accordionItems.length - 1
						);
						break;
					case 'Home':
						nextIndex = 0;
						break;
					case 'End':
						nextIndex = accordionItems.length - 1;
						break;
					default:
						return;
				}

				const nextId = accordionItems[nextIndex]?.id;
				const nextButton = nextId
					? document.getElementById(nextId)
					: null;
				if (nextButton) {
					nextButton.focus();
				}
			}),
			openPanelByHash: () => {
				if (hashHandled || !window.location?.hash?.length) {
					return;
				}

				const context = getContext();
				const { id, accordionItems, autoclose } = context;
				const hash = decodeURIComponent(window.location.hash.slice(1));
				const targetElement = window.document.getElementById(hash);

				if (!targetElement) {
					return;
				}

				const panelElement = window.document.querySelector(
					`.wp-block-matter-accordion-panel[aria-labelledby="${id}"]`
				);

				if (!panelElement || !panelElement.contains(targetElement)) {
					return;
				}

				hashHandled = true;

				if (autoclose) {
					accordionItems.forEach((item) => {
						item.isOpen = item.id === id;
					});
				} else {
					const targetItem = findItem(accordionItems, id);
					if (targetItem) {
						targetItem.isOpen = true;
					}
				}

				window.setTimeout(() => {
					targetElement.scrollIntoView();
				}, 0);
			},
			openById(accordionId, itemId) {
				const context = accordionContexts.get(accordionId);
				if (!context) {
					return;
				}
				setItemOpen(context, itemId, true);
			},
			closeById(accordionId, itemId) {
				const context = accordionContexts.get(accordionId);
				if (!context) {
					return;
				}
				setItemOpen(context, itemId, false);
			},
			toggleById(accordionId, itemId) {
				const context = accordionContexts.get(accordionId);
				if (!context) {
					return;
				}
				const item = findItem(context.accordionItems, itemId);
				if (!item) {
					return;
				}
				setItemOpen(context, itemId, !item.isOpen);
			},
		},
		callbacks: {
			onAccordionInit: () => {
				const context = getContext();
				const { accordionId } = context;
				if (accordionId) {
					accordionContexts.set(accordionId, context);
				}
			},
			initAccordionItems: () => {
				const context = getContext();
				const { id, openByDefault, accordionItems, accordionId } =
					context;

				if (accordionId && !accordionContexts.has(accordionId)) {
					accordionContexts.set(accordionId, context);
				}

				if (!findItem(accordionItems, id)) {
					accordionItems.push({
						id,
						isOpen: !!openByDefault,
					});
				}

				privateActions.openPanelByHash();
			},
			hashChange: () => {
				hashHandled = false;
				privateActions.openPanelByHash();
			},
		},
	},
	{
		lock: true,
	}
);

// Public store for third-party extensibility.
store('matter/accordion', {
	state: {
		get isOpen() {
			return privateState.isOpen;
		},
		get items() {
			const context = getContext();
			const items = context?.accordionItems;
			return items ? createReadOnlyProxy(items) : undefined;
		},
	},
	actions: {
		/**
		 * Open an accordion item.
		 *
		 * @param {string} [accordionId] Accordion instance id (optional when in context).
		 * @param {string} [itemId]      Item id (optional when in item context).
		 */
		open(accordionId = false, itemId = false) {
			if (typeof accordionId === 'string' && typeof itemId === 'string') {
				privateActions.openById(accordionId, itemId);
				return;
			}

			privateActions.open();
		},
		/**
		 * Close an accordion item.
		 *
		 * @param {string} [accordionId] Accordion instance id.
		 * @param {string} [itemId]      Item id.
		 */
		close(accordionId = false, itemId = false) {
			if (typeof accordionId === 'string' && typeof itemId === 'string') {
				privateActions.closeById(accordionId, itemId);
				return;
			}

			privateActions.close();
		},
		/**
		 * Toggle an accordion item.
		 *
		 * @param {string} [accordionId] Accordion instance id.
		 * @param {string} [itemId]      Item id.
		 */
		toggle(accordionId = false, itemId = false) {
			if (typeof accordionId === 'string' && typeof itemId === 'string') {
				privateActions.toggleById(accordionId, itemId);
				return;
			}

			privateActions.toggle();
		},
	},
});
