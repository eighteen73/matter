/**
 * Overlays (store: matter/overlay): modals, drawers and collapsibles.
 *
 * Anything that links to `#id` or has `aria-controls="id"` opens the overlay
 * with that ID, so editors use ordinary buttons and links as triggers. A
 * block's own trigger area (`data-matter-trigger`) opens it too: its first
 * link or button, or the whole area when it has neither.
 *
 * Dialogs that can't be closed (`dismissible: false`, e.g. an age gate) ignore
 * Escape and backdrop clicks; a link to `#id` inside them closes them.
 * Modals sharing a `group` get previous/next navigation.
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
 * or `matter.overlay( 'newsletter' )?.open()` (see README).
 *
 * Events `matter-overlay-ready`, `matter-overlay-open` and
 * `matter-overlay-close` bubble from the overlay.
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

/**
 * Internal dependencies
 */
import { registerInstance, registerType } from '../interactivity/api';

const SELECTOR =
	'[data-wp-interactive="matter/overlay"][data-wp-watch="callbacks.sync"]';

registerType('overlay', SELECTOR);

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

/**
 * The control inside a block's trigger area: its first link or button (a
 * button block with no link gets `#id`), or the area itself (made into a
 * button) when it has neither.
 *
 * @param {HTMLElement} area Trigger area.
 * @return {HTMLElement} Trigger element.
 */
const areaTrigger = (area) => {
	const control = area.querySelector('a, button');

	if (control) {
		if (control.tagName === 'A' && !control.hasAttribute('href')) {
			control.setAttribute('href', `#${area.dataset.matterTrigger}`);
		}

		return control;
	}

	area.setAttribute('role', 'button');
	area.setAttribute('tabindex', '0');
	area.addEventListener('keydown', (event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			area.click();
		}
	});

	return area;
};

const findTriggers = (id) => {
	const escaped = window.CSS?.escape ? window.CSS.escape(id) : id;

	const areas = [
		...document.querySelectorAll(`[data-matter-trigger="${escaped}"]`),
	].map(areaTrigger);

	const links = [
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

	return [...new Set([...areas, ...links])];
};

/**
 * IDs of the overlays in a group, in page order (the server registers them in
 * render order).
 *
 * @param {string} group Group name.
 * @return {string[]} Overlay IDs.
 */
const groupMembers = (group) =>
	group
		? Object.keys(state.items).filter(
				(id) => state.items[id].group === group
			)
		: [];

/**
 * Move from one grouped overlay to another.
 *
 * @param {string} id     Current overlay ID.
 * @param {number} offset +1 for next, -1 for previous.
 */
const stepGroup = (id, offset) => {
	const members = groupMembers(state.items[id]?.group);
	const index = members.indexOf(id);

	if (index < 0 || members.length < 2) {
		return;
	}

	const target = members[(index + offset + members.length) % members.length];
	const from = elements.get(id);
	const to = elements.get(target);

	// Switch without closing and reopening: the backdrop stays, the current
	// modal goes at once and the next fades in from the side it comes from.
	from?.classList.add('is-switching-out');
	to?.classList.add('is-switching-in');
	to?.style.setProperty('--matter-modal--switch', String(Math.sign(offset)));

	window.setTimeout(() => {
		from?.classList.remove('is-switching-out');
		to?.classList.remove('is-switching-in');
		to?.style.removeProperty('--matter-modal--switch');
	}, 400);

	state.items[id].isOpen = false;
	state.items[target].isOpen = true;
};

const { state, actions } = store('matter/overlay', {
	state: {
		get isOpen() {
			return !!state.items[getContext().id]?.isOpen;
		},
		// "2 / 5" for grouped overlays.
		get groupPosition() {
			const { id } = getContext();
			const members = groupMembers(state.items[id]?.group);

			return members.length > 1
				? `${members.indexOf(id) + 1} / ${members.length}`
				: '';
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
		next(idOrEvent) {
			stepGroup(resolveId(idOrEvent), 1);
		},
		previous(idOrEvent) {
			stepGroup(resolveId(idOrEvent), -1);
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
			registerInstance('overlay', getElement().ref, {
				element: getElement().ref,
				id,
				get isOpen() {
					return !!state.items[id]?.isOpen;
				},
				open: () => actions.open(id),
				close: () => actions.close(id),
				toggle: () => actions.toggle(id),
				next: () => actions.next(id),
				previous: () => actions.previous(id),
			});

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

					// Opening by hand isn't an automatic open; closing an
					// automatic one (e.g. an age gate's own link) dismisses it.
					if (!item.isOpen) {
						item.autoOpened = false;
					}

					actions.toggle(id);
				});
			});

			// A matching hash always opens (deep links).
			if (window.location.hash === `#${id}`) {
				item.isOpen = true;
				return;
			}

			const params = new URLSearchParams(window.location.search);
			const matchesUrl = (item.urlTriggers ?? []).some(
				({ param, value }) =>
					param &&
					params.has(param) &&
					(!value || params.get(param) === value)
			);

			// A matching URL parameter is asked for (e.g. a campaign link), so
			// it opens even after a dismissal; dismissals stop the automatic
			// opens on load and on scroll.
			if (matchesUrl) {
				window.setTimeout(
					() => {
						if (!item.isOpen) {
							item.autoOpened = true;
							item.isOpen = true;
						}
					},
					(item.openDelay ?? 0) * 1000
				);
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

			if (item.openOnLoad) {
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
		// Escape: ignored by dialogs that can't be closed.
		onCancel: withSyncEvent((event) => {
			if (state.items[getContext().id]?.dismissible === false) {
				event.preventDefault();
			}
		}),
		// Clicking the ::backdrop targets the dialog itself.
		onBackdropClick: withSyncEvent((event) => {
			const { ref } = getElement();
			const { id } = getContext();

			if (
				event.target === ref &&
				state.items[id]?.dismissible !== false
			) {
				actions.close(id);
			}
		}),
	},
});
