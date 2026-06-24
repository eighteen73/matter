/* global IntersectionObserver */
import {
	store,
	getContext,
	withScope,
	withSyncEvent,
} from '@wordpress/interactivity';

const PRIVATE_STORE = 'matter/overlay/private';
const PUBLIC_STORE = 'matter/overlay';
const STORAGE_KEY_PREFIX = 'matter_overlay_';

let publicState; // eslint-disable-line prefer-const -- assigned after store creation.

const createReadOnlyProxy = (object) =>
	new Proxy(object, {
		get(target, prop) {
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

const getContextId = () => {
	const context = getContext(PUBLIC_STORE);

	return context?.id;
};

const resolveId = (passthroughId = false) =>
	typeof passthroughId === 'string' ? passthroughId : privateState.id;

const resolvePublicId = (passthroughId = false) =>
	typeof passthroughId === 'string' ? passthroughId : getContextId();

const focusTrigger = (id) => {
	if (!id) {
		return;
	}

	document.querySelector(`[aria-controls="${id}"]`)?.focus();
};

const getItem = (id) => privateState.items[id];

const canClose = (id) => {
	const item = getItem(id);

	return item?.preventClose !== true;
};

/**
 * @param {string} duration Raw dismissed duration string.
 * @return {number} Duration in minutes.
 */
const parseDismissedDuration = (duration) => {
	if (!duration) {
		return 0;
	}

	const raw = String(duration);
	const numeric = parseInt(raw, 10);

	if (Number.isNaN(numeric) || numeric <= 0) {
		return 0;
	}

	const unit = raw.replace(/\d+/g, '');

	switch (unit) {
		case 'hrs':
			return numeric * 60;
		case 'days':
			return numeric * 1440;
		case 'mins':
		default:
			return numeric;
	}
};

/**
 * @param {string} delay Raw delay string.
 * @return {number} Delay in milliseconds.
 */
const parseTriggerDelay = (delay) => {
	if (!delay) {
		return 0;
	}

	const numeric = parseInt(String(delay), 10);

	return Number.isNaN(numeric) || numeric < 0 ? 0 : numeric;
};

/**
 * @param {string} threshold Raw scroll threshold string.
 * @return {number} Threshold percentage.
 */
const parseScrollThreshold = (threshold) => {
	const numeric = parseInt(String(threshold || '10'), 10);

	if (Number.isNaN(numeric)) {
		return 0.1;
	}

	return Math.min(Math.max(numeric, 0), 100) / 100;
};

/**
 * @param {string} id Overlay item id.
 * @return {boolean} Whether the overlay is dismissed.
 */
const isDismissed = (id) => {
	const item = getItem(id);

	if (!item?.dismissedDuration) {
		return false;
	}

	const expiry = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`);

	if (!expiry) {
		return false;
	}

	return Date.now() < parseInt(expiry, 10);
};

/**
 * @param {string} id Overlay item id.
 * @return {void}
 */
const setDismissed = (id) => {
	const item = getItem(id);
	const minutes = parseDismissedDuration(item?.dismissedDuration);

	if (!minutes) {
		return;
	}

	const expiry = Date.now() + minutes * 60 * 1000;

	window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${id}`, String(expiry));
};

/**
 * @param {string} id Overlay id.
 * @return {void}
 */
const addIdToUrl = (id) => {
	if (!id) {
		return;
	}

	const url = new URL(window.location.href);

	url.hash = id;
	window.history.replaceState({}, '', url);
};

/**
 * @param {string} id Overlay id.
 * @return {void}
 */
const removeIdFromUrl = (id) => {
	const url = new URL(window.location.href);
	const currentHash = url.hash.replace('#', '');

	if (currentHash !== id) {
		return;
	}

	url.hash = '';
	window.history.replaceState({}, '', url);
};

/**
 * @param {Object}          rule         URL trigger rule.
 * @param {URLSearchParams} searchParams Current query string.
 * @return {boolean} Whether the rule matches.
 */
const matchesUrlTrigger = (rule, searchParams) => {
	if (!rule?.param) {
		return false;
	}

	const actual = searchParams.get(rule.param);

	if (actual === null) {
		return false;
	}

	if (rule.match === 'regex') {
		try {
			return new RegExp(rule.value).test(actual);
		} catch {
			return false;
		}
	}

	if (!rule.value) {
		return true;
	}

	return actual === rule.value;
};

/**
 * @param {string}          id           Overlay id.
 * @param {Array}           urlTriggers  URL trigger rules.
 * @param {URLSearchParams} searchParams Current query string.
 * @return {boolean} Whether any rule matches.
 */
const hasMatchingUrlTrigger = (id, urlTriggers, searchParams) => {
	const item = getItem(id);

	if (!item || !Array.isArray(urlTriggers) || urlTriggers.length === 0) {
		return false;
	}

	return urlTriggers.some((rule) => matchesUrlTrigger(rule, searchParams));
};

/**
 * @param {string} id     Overlay id.
 * @param {string} source Open source.
 * @param {string} delay  Raw delay string.
 * @return {void}
 */
const scheduleOpen = (id, source, delay) => {
	const delayMs = parseTriggerDelay(delay);

	if (delayMs > 0) {
		window.setTimeout(() => {
			privateActions.open(id, { source });
		}, delayMs);
		return;
	}

	privateActions.open(id, { source });
};

/**
 * @param {string} id   Overlay id.
 * @param {Object} item Overlay item config.
 * @return {void}
 */
const setupScrollTrigger = (id, item) => {
	const targetElement = document.querySelector(item.scrollSelector);

	if (!targetElement) {
		// eslint-disable-next-line no-console
		console.warn(
			`Matter Modal: Target element "${item.scrollSelector}" not found for scroll trigger.`
		);
		return;
	}

	const threshold = parseScrollThreshold(item.scrollThreshold);
	const observer = new IntersectionObserver(
		(entries, obs) => {
			entries.forEach((entry) => {
				if (!entry.isIntersecting) {
					return;
				}

				scheduleOpen(id, 'scroll', item.triggerDelay);
				obs.unobserve(targetElement);
			});
		},
		{ threshold }
	);

	observer.observe(targetElement);
};

/**
 * @return {void}
 */
const runGlobalInit = () => {
	if (privateState.didGlobalInit) {
		return;
	}

	privateState.didGlobalInit = true;

	const { items } = privateState;
	const searchParams = new URLSearchParams(window.location.search);
	const hash = window.location.hash.replace('#', '');

	if (hash && items[hash]) {
		privateActions.open(hash, { source: 'hash' });
	}

	Object.entries(items).forEach(([id, item]) => {
		if (hasMatchingUrlTrigger(id, item.urlTriggers, searchParams)) {
			scheduleOpen(id, 'query', item.triggerDelay);
		}

		if (item.triggerOnLoad) {
			scheduleOpen(id, 'load', item.triggerDelay);
		}

		if (item.triggerOnScroll && item.scrollSelector) {
			setupScrollTrigger(id, item);
		}
	});
};

const tryOpen = (id, source = 'manual') => {
	const item = getItem(id);

	if (!item) {
		return false;
	}

	if (source !== 'manual' && isDismissed(id)) {
		return false;
	}

	item.isOpen = true;
	item.lastOpenSource = source;

	return true;
};

const syncDialogElement = (id) => {
	const item = getItem(id);

	if (!id || !item || (item.type !== 'modal' && item.type !== 'drawer')) {
		return;
	}

	const dialogElement = document.getElementById(id);

	if (!dialogElement) {
		return;
	}

	if (item.isOpen && !dialogElement.open) {
		dialogElement.showModal();
		return;
	}

	if (!item.isOpen && dialogElement.open) {
		dialogElement.close();
		focusTrigger(id);
	}
};

const { actions: privateActions, state: privateState } = store(
	PRIVATE_STORE,
	{
		state: {
			items: {},
			didGlobalInit: false,
			get id() {
				return getContextId();
			},
			get item() {
				return getItem(privateState.id);
			},
			get dialogElement() {
				const { id } = privateState;

				if (!id) {
					return null;
				}

				return document.getElementById(id);
			},
		},
		actions: {
			open: (passthroughId = false, options = {}) => {
				const id = resolveId(passthroughId);
				const source = options.source || 'manual';

				if (!id) {
					return;
				}

				if (!tryOpen(id, source)) {
					return;
				}

				addIdToUrl(id);
				syncDialogElement(id);
			},
			close: (passthroughId = false) => {
				const id = resolveId(passthroughId);
				const item = getItem(id);

				if (!id || !item || !canClose(id)) {
					return;
				}

				item.isOpen = false;

				if (item.dismissedDuration) {
					setDismissed(id);
				}

				removeIdFromUrl(id);
				syncDialogElement(id);
			},
			toggle: (passthroughId = false) => {
				const id = resolveId(passthroughId);
				const item = getItem(id);

				if (!id || !item) {
					return;
				}

				if (item.isOpen) {
					privateActions.close(id);
					return;
				}

				privateActions.open(id, { source: 'manual' });
			},
			closeAll: () => {
				Object.keys(privateState.items).forEach((id) => {
					privateActions.close(id);
				});
			},
			onClickToggle: withSyncEvent((event) => {
				event.preventDefault();
				privateActions.toggle();
			}),
			onClickOpen: withSyncEvent((event) => {
				event.preventDefault();
				privateActions.open(false, { source: 'manual' });
			}),
			onClickClose: withSyncEvent((event) => {
				event.preventDefault();
				privateActions.close();
			}),
		},
		callbacks: {
			onInit: () => {
				runGlobalInit();
			},
			syncDialog: () => {
				const { dialogElement, item, id } = privateState;

				if (!id || !dialogElement || !item) {
					return;
				}

				if (item.type !== 'modal' && item.type !== 'drawer') {
					return;
				}

				if (item.isOpen && !dialogElement.open) {
					dialogElement.showModal();
					return;
				}

				if (!item.isOpen && dialogElement.open) {
					dialogElement.close();
					focusTrigger(id);
				}
			},
			onNativeClose: withScope(() => {
				const { id } = privateState;
				const item = getItem(id);

				if (!id || !item) {
					return;
				}

				item.isOpen = false;

				if (item.dismissedDuration) {
					setDismissed(id);
				}

				removeIdFromUrl(id);
				focusTrigger(id);
			}),
			onCancel: withSyncEvent((event) => {
				const { id } = privateState;

				if (!canClose(id)) {
					event.preventDefault();
					return;
				}

				privateActions.close(id);
			}),
			onBackdropClick: withSyncEvent((event) => {
				const { dialogElement, id, item } = privateState;

				if (!dialogElement || !item?.isOpen || !canClose(id)) {
					return;
				}

				const boundingRect = dialogElement.getBoundingClientRect();
				const isWithinDialog =
					event.clientX >= boundingRect.left &&
					event.clientX <= boundingRect.right &&
					event.clientY >= boundingRect.top &&
					event.clientY <= boundingRect.bottom;

				if (isWithinDialog) {
					return;
				}

				privateActions.close(id);
			}),
		},
	},
	{
		lock: true,
	}
);

const publicStore = store(PUBLIC_STORE, {
	state: {
		get items() {
			return createReadOnlyProxy(privateState.items);
		},
		get item() {
			const { item } = privateState;

			if (!item) {
				return undefined;
			}

			return createReadOnlyProxy(item);
		},
	},
	actions: {
		open(id = false, options = {}) {
			privateActions.open(resolvePublicId(id), {
				source: options.source || 'manual',
			});
		},
		close(id = false) {
			privateActions.close(resolvePublicId(id));
		},
		toggle(id = false) {
			privateActions.toggle(resolvePublicId(id));
		},
		closeAll() {
			privateActions.closeAll();
		},
	},
	callbacks: {
		onInit() {
			runGlobalInit();
		},
		syncDialog() {
			const id = getContextId();
			const item = publicState.item;
			const dialogElement = id ? document.getElementById(id) : null;

			if (!id || !dialogElement || !item) {
				return;
			}

			if (item.type !== 'modal' && item.type !== 'drawer') {
				return;
			}

			if (item.isOpen && !dialogElement.open) {
				dialogElement.showModal();
				return;
			}

			if (!item.isOpen && dialogElement.open) {
				dialogElement.close();
				focusTrigger(id);
			}
		},
		onNativeClose() {
			const id = getContextId();
			const item = getItem(id);

			if (!id || !item) {
				return;
			}

			item.isOpen = false;

			if (item.dismissedDuration) {
				setDismissed(id);
			}

			removeIdFromUrl(id);
			focusTrigger(id);
		},
		onCancel(event) {
			const id = getContextId();

			if (!canClose(id)) {
				event.preventDefault();
				return;
			}

			privateActions.close(id);
		},
		onBackdropClick(event) {
			const id = getContextId();
			const item = publicState.item;
			const dialogElement = id ? document.getElementById(id) : null;

			if (!dialogElement || !item?.isOpen || !canClose(id)) {
				return;
			}

			const boundingRect = dialogElement.getBoundingClientRect();
			const isWithinDialog =
				event.clientX >= boundingRect.left &&
				event.clientX <= boundingRect.right &&
				event.clientY >= boundingRect.top &&
				event.clientY <= boundingRect.bottom;

			if (isWithinDialog) {
				return;
			}

			privateActions.close(id);
		},
	},
});

publicState = publicStore.state;
