import { store, getContext } from '@wordpress/interactivity';

store('matter/modal', {
	actions: {
		open: () => {
			const context = getContext();
			context.isOpen = true;
		},
		close: () => {
			const context = getContext();
			context.isOpen = false;
		},
	},
});
