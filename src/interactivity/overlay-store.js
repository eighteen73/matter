import {
	store,
	getContext,
	withScope,
	withSyncEvent,
} from '@wordpress/interactivity';

const PRIVATE_STORE = 'matter/overlay/private';
const PUBLIC_STORE = 'matter/overlay';

let publicState;

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

const tryOpen = (id) => {
	const item = getItem(id);

	if (!item) {
		return;
	}

	item.isOpen = true;
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
			open: (passthroughId = false) => {
				const id = resolveId(passthroughId);

				if (!id) {
					return;
				}

				tryOpen(id);
				syncDialogElement(id);
			},
			close: (passthroughId = false) => {
				const id = resolveId(passthroughId);
				const item = getItem(id);

				if (!id || !item || !canClose(id)) {
					return;
				}

				item.isOpen = false;
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

				privateActions.open(id);
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
				privateActions.open();
			}),
			onClickClose: withSyncEvent((event) => {
				event.preventDefault();
				privateActions.close();
			}),
		},
		callbacks: {
			onInit: () => {},
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
				focusTrigger(id);
			}),
			onCancel: withSyncEvent((event) => {
				const { id } = privateState;

				if (!canClose(id)) {
					event.preventDefault();
					return;
				}

				privateActions.close(id);

				if (event.defaultPrevented) {
				}
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
		open(id = false) {
			privateActions.open(resolvePublicId(id));
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
			// Reserved for modal-only hash, on-load and scroll triggers.
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
			focusTrigger(id);
		},
		onCancel(event) {
			const id = getContextId();

			if (!canClose(id)) {
				event.preventDefault();
				return;
			}

			privateActions.close(id);

			if (event.defaultPrevented) {
				return;
			}
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
