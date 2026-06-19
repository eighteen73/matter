import {
	store,
	getContext,
	getElement,
	withScope,
	withSyncEvent,
} from '@wordpress/interactivity';

const focusTrigger = (id) => {
	if (!id) {
		return;
	}

	document.querySelector(`[aria-controls="${id}"]`)?.focus();
};

store('matter/drawer', {
	actions: {
		open: () => {
			const context = getContext();
			context.isOpen = true;
		},
		close: () => {
			const context = getContext();
			context.isOpen = false;
		},
		toggle: () => {
			const context = getContext();
			context.isOpen = !context.isOpen;
		},
	},
	callbacks: {
		syncDialog: () => {
			const context = getContext();
			const { ref } = getElement();

			if (!ref) {
				return;
			}

			if (context.isOpen && !ref.open) {
				ref.showModal();
				return;
			}

			if (!context.isOpen && ref.open) {
				ref.close();
				focusTrigger(context.id);
			}
		},
		onNativeClose: withScope(() => {
			const context = getContext();
			context.isOpen = false;
			focusTrigger(context.id);
		}),
		onCancel: withSyncEvent((event) => {
			const context = getContext();
			context.isOpen = false;
			focusTrigger(context.id);

			if (event.defaultPrevented) {
				return;
			}
		}),
		onBackdropClick: withSyncEvent((event) => {
			const context = getContext();
			const { ref } = getElement();

			if (!ref || !context.isOpen) {
				return;
			}

			const boundingRect = ref.getBoundingClientRect();
			const isWithinDialog =
				event.clientX >= boundingRect.left &&
				event.clientX <= boundingRect.right &&
				event.clientY >= boundingRect.top &&
				event.clientY <= boundingRect.bottom;

			if (isWithinDialog) {
				return;
			}

			context.isOpen = false;
		}),
	},
});
