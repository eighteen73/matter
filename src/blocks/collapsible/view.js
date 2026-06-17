import { store, getContext } from '@wordpress/interactivity';

store('matter/collapsible', {
	actions: {
		toggle: () => {
			const context = getContext();
			context.isOpen = !context.isOpen;
		},
	},
});
