/**
 * Accordion behaviour (store: matter/accordion).
 *
 * Items open and close with their heading button; with `autoclose` only one is
 * open at a time. Up/Down/Home/End move between headings, and a URL hash
 * matching an item (or something inside it) opens that item on load.
 */

/**
 * WordPress dependencies
 */
import {
	getContext,
	getElement,
	store,
	withSyncEvent,
} from '@wordpress/interactivity';

const TOGGLE = '.wp-block-matter-accordion-item__toggle';
const ITEM = '.wp-block-matter-accordion-item';

const { state } = store('matter/accordion', {
	state: {
		get isItemOpen() {
			const { itemId, openItems } = getContext();

			return openItems.includes(itemId);
		},
	},
	actions: {
		toggle() {
			const context = getContext();

			if (state.isItemOpen) {
				context.openItems = context.openItems.filter(
					(id) => id !== context.itemId
				);
			} else {
				context.openItems = context.autoclose
					? [context.itemId]
					: [...context.openItems, context.itemId];
			}
		},
		onKeydown: withSyncEvent((event) => {
			if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
				return;
			}

			const { ref } = getElement();

			// This accordion's toggles only, not those of nested accordions.
			const toggles = [...ref.querySelectorAll(TOGGLE)].filter(
				(toggle) => toggle.closest('.wp-block-matter-accordion') === ref
			);
			const index = toggles.indexOf(event.target);

			if (index === -1) {
				return;
			}

			const targets = {
				ArrowDown: toggles[(index + 1) % toggles.length],
				ArrowUp: toggles[(index - 1 + toggles.length) % toggles.length],
				Home: toggles[0],
				End: toggles[toggles.length - 1],
			};

			event.preventDefault();
			targets[event.key].focus();
		}),
	},
	callbacks: {
		init() {
			const context = getContext();
			const { ref } = getElement();
			const hash = decodeURIComponent(window.location.hash.slice(1));
			const target = hash ? document.getElementById(hash) : null;
			const item = target?.closest(ITEM);

			if (
				!item ||
				!ref.contains(item) ||
				context.openItems.includes(item.id)
			) {
				return;
			}

			context.openItems = context.autoclose
				? [item.id]
				: [...context.openItems, item.id];
			window.requestAnimationFrame(() =>
				target.scrollIntoView({ block: 'start' })
			);
		},
	},
});
