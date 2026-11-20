/**
 * Accordion behaviour (store: matter/accordion).
 *
 * Items open and close with their heading button; with `autoclose` only one is
 * open at a time. Up/Down/Home/End move between headings, and a URL hash
 * matching an item (or something inside it) opens that item on load.
 *
 * API: `matter.accordion( target )` → instance (see README); events
 * `matter-accordion-ready`, `matter-accordion-open` and `-close`.
 */

/**
 * WordPress dependencies
 */
import {
	getContext,
	getElement,
	store,
	withScope,
	withSyncEvent,
} from '@wordpress/interactivity';

/**
 * Internal dependencies
 */
import {
	emit,
	enhance,
	fromDirective,
	registerInstance,
	registerType,
	resolve,
} from '../../interactivity/api';
import { suspendTransitions } from '../../interactivity/transitions';

const SELECTOR = '.wp-block-matter-accordion';
const TOGGLE = '.wp-block-matter-accordion-item__toggle';
const ITEM = '.wp-block-matter-accordion-item';

registerType('accordion', SELECTOR);

// Accordion element => instance; last announced open items.
const instances = new WeakMap();
const announced = new WeakMap();

/**
 * An accordion's items (not a nested accordion's): index, ID and title.
 *
 * @param {Element} root Accordion element.
 * @return {Array} Items.
 */
const itemsOf = (root) =>
	[...root.querySelectorAll(ITEM)]
		.filter((item) => item.closest(SELECTOR) === root)
		.map((item, index) => ({
			index,
			id: item.id,
			title:
				item
					.querySelector('.wp-block-matter-accordion-item__title')
					?.textContent.trim() ?? '',
		}));

const instanceFor = (target) => instances.get(resolve(target, SELECTOR));

const { state } = store('matter/accordion', {
	state: {
		get isItemOpen() {
			const { itemId, openItems } = getContext();

			return openItems.includes(itemId);
		},
		// The server renders every panel readable and says nothing of a
		// closed item's state; once the script runs, a closed item's panel is
		// `hidden="until-found"`, which find-in-page, a text fragment or a
		// link inside it opens (`beforematch`). A browser that doesn't know
		// `until-found` just hides it (the CSS then keeps it out of the tab
		// order and the accessibility tree, as it does an open one's
		// transition).
		get isItemExpanded() {
			return state.isItemOpen;
		},
		get isPanelHidden() {
			return state.isItemOpen ? false : 'until-found';
		},
	},
	actions: {
		/**
		 * From an item's heading button; or, from the API,
		 * `toggle( target, item )` with an item index or ID.
		 *
		 * @param {*}             target Directive event, or accordion ID/element.
		 * @param {number|string} item   Item index or ID (API).
		 */
		toggle(target, item) {
			if (!fromDirective(target)) {
				instanceFor(target)?.toggle(item);

				return;
			}

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
		// The browser is about to show a closed panel's text, found in the
		// page: open the item, as the heading's button would. Not animated: the
		// browser scrolls to the match as soon as the panel is shown, and the
		// panel growing from nothing would leave it scrolled to a point that
		// moves.
		reveal() {
			const context = getContext();

			if (!state.isItemOpen) {
				suspendTransitions([getElement().ref]);
				context.openItems = context.autoclose
					? [context.itemId]
					: [...context.openItems, context.itemId];
			}
		},
		open(target, item) {
			instanceFor(target)?.open(item);
		},
		close(target, item) {
			instanceFor(target)?.close(item);
		},
		openAll(target) {
			instanceFor(target)?.openAll();
		},
		closeAll(target) {
			instanceFor(target)?.closeAll();
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

			// The block and its own items (the CSS hides an item's panel, and
			// a nested accordion's items are for that accordion to mark).
			enhance(
				'accordion',
				ref,
				...[...ref.querySelectorAll(ITEM)].filter(
					(item) => item.closest(SELECTOR) === ref
				)
			);
			// A link to an item, or to anything in one (including an item of
			// an accordion nested in it), opens this accordion's item that
			// holds it: on load, and when the address's #hash changes.
			const openFromHash = withScope(() => {
				const hash = decodeURIComponent(window.location.hash.slice(1));
				const target = hash ? document.getElementById(hash) : null;
				const item =
					target &&
					[...ref.querySelectorAll(ITEM)].find(
						(element) =>
							element.closest(SELECTOR) === ref &&
							element.contains(target)
					);

				if (!item || context.openItems.includes(item.id)) {
					return;
				}

				context.openItems = context.autoclose
					? [item.id]
					: [...context.openItems, item.id];
				window.requestAnimationFrame(() =>
					target.scrollIntoView({ block: 'start' })
				);
			});

			// Removed with the block (e.g. by client-side navigation).
			const controller = new AbortController();

			openFromHash();
			window.addEventListener('hashchange', openFromHash, {
				signal: controller.signal,
			});

			const idOf = (key) =>
				typeof key === 'number' ? itemsOf(ref)[key]?.id : key;
			const setOpen = withScope((key, shouldOpen) => {
				const id = idOf(key);

				if (!id || !itemsOf(ref).some((entry) => entry.id === id)) {
					return;
				}

				const others = context.openItems.filter((open) => open !== id);

				if (!shouldOpen) {
					context.openItems = others;
				} else if (!context.openItems.includes(id)) {
					context.openItems = context.autoclose
						? [id]
						: [...others, id];
				}
			});
			const isOpen = (key) => context.openItems.includes(idOf(key));

			const instance = {
				element: ref,
				get id() {
					return ref.id || null;
				},
				/** Each item: { index, id, title, isOpen }. */
				get items() {
					return itemsOf(ref).map((entry) => ({
						...entry,
						isOpen: context.openItems.includes(entry.id),
					}));
				},
				isOpen,
				open: (key) => setOpen(key, true),
				close: (key) => setOpen(key, false),
				toggle: (key) => setOpen(key, !isOpen(key)),
				// With "only one open at a time", opens the first item only.
				openAll: withScope(() => {
					const ids = itemsOf(ref).map((entry) => entry.id);

					context.openItems = context.autoclose
						? ids.slice(0, 1)
						: ids;
				}),
				closeAll: withScope(() => {
					context.openItems = [];
				}),
			};

			instances.set(ref, instance);
			announced.set(ref, [...context.openItems]);
			registerInstance('accordion', ref, instance);

			return () => controller.abort();
		},
		// Announce items opening and closing (from a click or the API).
		announce() {
			// Read first, so the watch re-runs when the open items change.
			// eslint-disable-next-line @wordpress/no-unused-vars-before-return
			const { openItems } = getContext();
			const { ref } = getElement();
			const previous = announced.get(ref);

			if (!instances.has(ref) || !previous) {
				return;
			}

			const items = itemsOf(ref);
			const announce = (name, ids) =>
				ids.forEach((itemId) =>
					emit(ref, 'accordion', name, {
						itemId,
						index: items.findIndex(({ id }) => id === itemId),
					})
				);

			announced.set(ref, [...openItems]);
			announce(
				'close',
				previous.filter((id) => !openItems.includes(id))
			);
			announce(
				'open',
				openItems.filter((id) => !previous.includes(id))
			);
		},
	},
});
