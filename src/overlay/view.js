/**
 * Overlays (store: matter/overlay): modals, drawers and collapsibles.
 *
 * Anything that links to `#id` or has `aria-controls="id"` opens the overlay
 * with that ID, so editors use ordinary buttons and links as triggers.
 * Overlays can also open from the URL hash, a URL parameter, on load or after
 * scrolling. Auto-opened overlays can stay dismissed for a number of days.
 *
 * Modals and drawers are native <dialog>s (focus trapping, Escape and the top
 * layer come from the browser). Collapsibles show and hide content in place.
 *
 * Other scripts can use the store:
 *     const { actions } = store( 'matter/overlay' );
 *     actions.open( 'newsletter' );
 *
 * Events `matter-overlay-open` / `matter-overlay-close` bubble from the overlay.
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

const STORAGE_PREFIX = 'matter_overlay_dismissed_';
const DAY = 24 * 60 * 60 * 1000;

const elements = new Map();
const triggers = new Map();
const lastStates = new Map();

const isDialog = (id) => elements.get(id)?.tagName === 'DIALOG';

/**
 * Resolve an overlay ID from an action argument or the current context.
 * Directive-bound actions receive an event; programmatic calls pass an ID.
 *
 * @param {string|Event} idOrEvent Overlay ID or event.
 * @return {string} Overlay ID.
 */
const resolveId = (idOrEvent) =>
	typeof idOrEvent === 'string' ? idOrEvent : getContext().id;

const isDismissed = (id) => {
	try {
		const until = Number(window.localStorage.getItem(STORAGE_PREFIX + id));

		return until > Date.now();
	} catch {
		return false;
	}
};

const rememberDismissal = (id, days) => {
	if (!days) {
		return;
	}

	try {
		window.localStorage.setItem(
			STORAGE_PREFIX + id,
			String(Date.now() + days * DAY)
		);
	} catch {
		// Storage unavailable: dismissal lasts for this page view.
	}
};

const syncTriggers = (id, isOpen) =>
	triggers
		.get(id)
		?.forEach((trigger) =>
			trigger.setAttribute('aria-expanded', String(isOpen))
		);

const syncDocumentClass = () => {
	document.documentElement.classList.toggle(
		'has-overlay-open',
		[...elements.entries()].some(
			([id, element]) => isDialog(id) && element.open
		)
	);
};

const findTriggers = (id) => {
	const escaped = window.CSS?.escape ? window.CSS.escape(id) : id;

	return [
		...document.querySelectorAll(
			`a[href$="#${escaped}"], [aria-controls="${escaped}"]`
		),
	].filter((element) => {
		if (element.tagName !== 'A') {
			return true;
		}

		const url = new URL(element.href, window.location.href);

		return (
			url.hash === `#${id}` && url.pathname === window.location.pathname
		);
	});
};

const { state, actions } = store('matter/overlay', {
	state: {
		get isOpen() {
			return !!state.items[getContext().id]?.isOpen;
		},
	},
	actions: {
		open(idOrEvent) {
			const id = resolveId(idOrEvent);

			if (state.items[id]) {
				state.items[id].isOpen = true;
			}
		},
		close(idOrEvent) {
			const id = resolveId(idOrEvent);

			if (state.items[id]) {
				state.items[id].isOpen = false;
			}
		},
		toggle(idOrEvent) {
			const id = resolveId(idOrEvent);

			if (state.items[id]) {
				state.items[id].isOpen = !state.items[id].isOpen;
			}
		},
		closeAll() {
			Object.values(state.items).forEach((item) => {
				item.isOpen = false;
			});
		},
	},
	callbacks: {
		init() {
			const { id } = getContext();
			const item = state.items[id];

			if (!item) {
				return;
			}

			elements.set(id, getElement().ref);

			// Wire up triggers: links to #id and elements controlling the ID.
			const found = findTriggers(id);

			triggers.set(id, found);
			found.forEach((trigger) => {
				trigger.setAttribute('aria-controls', id);
				trigger.setAttribute('aria-expanded', 'false');

				if (isDialog(id)) {
					trigger.setAttribute('aria-haspopup', 'dialog');
				}

				trigger.addEventListener('click', (event) => {
					event.preventDefault();
					item.autoOpened = false;
					actions.toggle(id);
				});
			});

			// A matching hash always opens (deep links).
			if (window.location.hash === `#${id}`) {
				item.isOpen = true;
				return;
			}

			if (isDismissed(id)) {
				return;
			}

			const autoOpen = () => {
				if (!item.isOpen && !isDismissed(id)) {
					item.autoOpened = true;
					item.isOpen = true;
				}
			};

			const params = new URLSearchParams(window.location.search);
			const matchesUrl = (item.urlTriggers ?? []).some(
				({ param, value }) =>
					param &&
					params.has(param) &&
					(!value || params.get(param) === value)
			);

			if (matchesUrl || item.openOnLoad) {
				window.setTimeout(autoOpen, (item.openDelay ?? 0) * 1000);
			}

			if (item.openOnScroll) {
				const threshold = (item.scrollThreshold ?? 50) / 100;
				const onScroll = () => {
					const { scrollHeight, clientHeight } =
						document.documentElement;
					const progress =
						window.scrollY /
						Math.max(1, scrollHeight - clientHeight);

					if (progress >= threshold) {
						window.removeEventListener('scroll', onScroll);
						autoOpen();
					}
				};

				window.addEventListener('scroll', onScroll, { passive: true });
			}
		},
		sync() {
			const { id } = getContext();
			const { ref } = getElement();
			const item = state.items[id];
			const isOpen = !!item?.isOpen;

			if (isDialog(id)) {
				if (isOpen && !ref.open) {
					ref.showModal();
				} else if (!isOpen && ref.open) {
					ref.close();
				}

				syncDocumentClass();
			}

			syncTriggers(id, isOpen);

			// Only announce real changes, not the initial closed state.
			if (
				lastStates.get(id) !== undefined &&
				lastStates.get(id) !== isOpen
			) {
				ref.dispatchEvent(
					new CustomEvent(
						isOpen ? 'matter-overlay-open' : 'matter-overlay-close',
						{ bubbles: true, detail: { id } }
					)
				);
			}

			lastStates.set(id, isOpen);
		},
		// Native dialog close (Escape, form[method=dialog], dialog.close()).
		onClose() {
			const { id } = getContext();
			const item = state.items[id];

			if (item?.isOpen) {
				item.isOpen = false;
			}

			if (item?.autoOpened) {
				rememberDismissal(id, item.dismissDays);
				item.autoOpened = false;
			}

			syncDocumentClass();
		},
		// Clicking the ::backdrop targets the dialog itself.
		onBackdropClick: withSyncEvent((event) => {
			const { ref } = getElement();

			if (event.target === ref) {
				actions.close(getContext().id);
			}
		}),
	},
});
