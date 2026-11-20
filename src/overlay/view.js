/**
 * Overlays (store: matter/overlay): modals, drawers and collapsibles.
 *
 * Anything that links to `#id` on this page or has `aria-controls="id"` opens
 * the overlay with that ID (one click listener for the page, so triggers added
 * later work; modified and non-primary clicks are left to the browser), so editors use ordinary buttons and links as triggers. A
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
 * `matter-overlay-close` bubble from the overlay. A dialog's open event fires
 * once it is shown (including an open from the URL hash on load) and its close
 * event once it is closed; a collapsible's when it opens and closes.
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
	registerInstance,
	registerType,
} from '../interactivity/api';
import { isBackdropClick } from '../interactivity/backdrop';
import { suspendForModal } from '@matter/inert';
import { focusFirst, focused, isUsable } from '../interactivity/focus';
import { hashId } from '../interactivity/hash';
import {
	afterTransitions,
	cancelClose,
	closeDialog,
	isClosing,
} from '../interactivity/dialog';

const SELECTOR =
	'[data-wp-interactive="matter/overlay"][data-wp-watch="callbacks.sync"]';

registerType('overlay', SELECTOR);

const STORAGE_PREFIX = 'matter_overlay_dismissed_';
const DAY = 24 * 60 * 60 * 1000;

const elements = new Map();
const lastStates = new Map();

// The control that opened each dialog.
const openers = new Map();

// Counts what takes focus and the page: a dialog opening, a panel opening. A
// close that gives focus back checks it didn't change meanwhile.
let epoch = 0;

document.addEventListener('matter-panel-open', () => ++epoch);

// Puts back what let go for a dialog opened over an inert page (see
// suspendForModal()), once it closes.
const resumes = new Map();

const resumeAfter = (id) => {
	resumes.get(id)?.();
	resumes.delete(id);
};

const isDialog = (id) => elements.get(id)?.tagName === 'DIALOG';

/**
 * The overlay an action targets: an ID, an element (the overlay, or anything
 * in it), or, from a directive, the overlay in context.
 *
 * @param {*} target ID, element or directive event.
 * @return {string|undefined} Overlay ID.
 */
const resolveId = (target) => {
	if (typeof target === 'string') {
		return target;
	}

	if (target instanceof window.Element) {
		for (let el = target; el; el = el.parentElement) {
			if (el.id && state.items[el.id]) {
				return el.id;
			}
		}

		return undefined;
	}

	return getContext().id;
};

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

let removalWatcher = null;

const syncDocumentClass = () => {
	const open = [...elements.entries()].some(
		([id, element]) => isDialog(id) && element.isConnected && element.open
	);

	const root = document.documentElement;

	// Keep the scrollbar's space only on a page that has a scrollbar: a short
	// page would shift sideways for a gutter with nothing in it. Looked at as
	// the lock starts (the lock itself can't change whether the page scrolls).
	if (open && !root.classList.contains('has-overlay-open')) {
		root.classList.toggle(
			'has-overlay-gutter',
			root.scrollHeight > root.clientHeight
		);
	} else if (!open) {
		root.classList.remove('has-overlay-gutter');
	}

	root.classList.toggle('has-overlay-open', open);

	// A dialog taken out of the page while open (by a script, or a
	// replacement the interactivity runtime never tears down) must release
	// the scroll lock: watch the page for it while one is open.
	if (open && !removalWatcher) {
		removalWatcher = new window.MutationObserver(syncDocumentClass);
		removalWatcher.observe(document.body, {
			childList: true,
			subtree: true,
		});
	} else if (!open && removalWatcher) {
		removalWatcher.disconnect();
		removalWatcher = null;
	}
};

const preparedAreas = new WeakSet();

/**
 * The control inside a block's trigger area: its first link or button, or the
 * area itself when it has neither.
 *
 * @param {HTMLElement} area Trigger area.
 * @return {HTMLElement} Trigger element.
 */
const areaControl = (area) => area.querySelector('a, button') ?? area;

/**
 * Make a block's trigger area work as a trigger: a link without an address
 * (a button block with no link) gets `#id`, and an area with no control
 * becomes a button. Once per area.
 *
 * @param {HTMLElement} area Trigger area.
 */
const prepareArea = (area) => {
	if (preparedAreas.has(area)) {
		return;
	}

	preparedAreas.add(area);

	const control = areaControl(area);

	if (control !== area) {
		if (control.tagName === 'A' && !control.hasAttribute('href')) {
			control.setAttribute('href', `#${area.dataset.matterTrigger}`);
		}

		return;
	}

	area.setAttribute('role', 'button');
	area.setAttribute('tabindex', '0');
	area.addEventListener('keydown', (event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			area.click();
		}
	});
};

/**
 * Whether a link goes to the page it's on: the same origin, path and query
 * (so only the hash differs). A link to another page, or the same path with
 * another query, that happens to end in `#id` is an ordinary link.
 *
 * @param {HTMLAnchorElement} link Link.
 * @return {boolean} Whether it is to this page.
 */
const isSamePage = (link) => {
	const url = new URL(link.href, window.location.href);

	return (
		url.origin === window.location.origin &&
		url.pathname === window.location.pathname &&
		url.search === window.location.search
	);
};

/**
 * Whether a link opens in this tab. One for a new tab or window, or a download,
 * isn't a trigger: its own behaviour is the point of it.
 *
 * @param {HTMLAnchorElement} link Link.
 * @return {boolean} Whether it navigates this page.
 */
const opensHere = (link) =>
	(link.target === '' || link.target === '_self') &&
	!link.hasAttribute('download');

/**
 * Whether an element that links to or controls an overlay is its trigger.
 *
 * @param {Element} element Link or element with `aria-controls`.
 * @param {string}  id      Overlay ID.
 * @return {boolean} Whether it triggers the overlay.
 */
const isTriggerFor = (element, id) => {
	// A Matter widget's own control (its close or next button) has its own
	// action.
	if (element.hasAttribute('data-wp-on--click')) {
		return false;
	}

	// A copy of a block keeps its saved `#id` in the link of its trigger
	// area, though its own overlay's ID was renamed (`x-2`): that link is
	// the copy's, not the original's. The area says which ID it was renamed
	// from. A link to any other overlay is an ordinary one.
	if (element.closest('[data-matter-trigger]')?.dataset.matterFrom === id) {
		return false;
	}

	if (element.getAttribute('aria-controls') === id) {
		return true;
	}

	// An overlay's ID is ASCII (`Ids::sanitize` strips the rest, as does the
	// editor), so `href$="#id"` finds every link to it. The hash is compared
	// decoded, as `triggeredBy` reads it.
	return (
		element.tagName === 'A' &&
		hashId(element.hash) === id &&
		opensHere(element) &&
		isSamePage(element)
	);
};

/**
 * The elements that trigger an overlay now: its blocks' trigger areas, links
 * to it and elements controlling it. Queried each time, so triggers added
 * after load (live filter results, a lazy-loaded section) are found too.
 *
 * @param {string} id Overlay ID.
 * @return {HTMLElement[]} Trigger elements.
 */
const findTriggers = (id) => {
	const escaped = window.CSS?.escape ? window.CSS.escape(id) : id;

	const areas = [
		...document.querySelectorAll(`[data-matter-trigger="${escaped}"]`),
	].map(areaControl);

	const links = [
		...document.querySelectorAll(
			`a[href$="#${escaped}"], [aria-controls="${escaped}"]`
		),
	].filter((element) => isTriggerFor(element, id));

	return [...new Set([...areas, ...links])];
};

/**
 * Tell the triggers whether their overlay is open (`aria-expanded`) and what
 * they control. Triggers are queried at each change, so a trigger added later
 * is told at the overlay's next open or close; one present when the overlay
 * starts is told at once.
 *
 * @param {string}  id     Overlay ID.
 * @param {boolean} isOpen Whether it's open.
 */
const syncTriggers = (id, isOpen) => {
	findTriggers(id).forEach((trigger) => {
		trigger.setAttribute('aria-controls', id);
		trigger.setAttribute('aria-expanded', String(isOpen));

		if (isDialog(id)) {
			trigger.setAttribute('aria-haspopup', 'dialog');
		}
	});
};

/**
 * The overlay a click is a trigger of, if any, and the control that triggers it.
 *
 * @param {Element} target Click target.
 * @return {{id: string, element: Element}|undefined} Overlay ID and trigger.
 */
const triggeredBy = (target) => {
	const area = target.closest('[data-matter-trigger]');
	const areaId = area?.dataset.matterTrigger;

	// A block's trigger area: its control (a click elsewhere in the area
	// isn't a trigger, so its other links keep working).
	if (areaId && elements.has(areaId) && areaControl(area).contains(target)) {
		return { id: areaId, element: areaControl(area) };
	}

	const element = target.closest('a[href], [aria-controls]');

	if (!element) {
		return undefined;
	}

	const controls = element.getAttribute('aria-controls');

	if (controls && elements.has(controls) && isTriggerFor(element, controls)) {
		return { id: controls, element };
	}

	if (element.tagName === 'A' && element.hash.length > 1) {
		const id = hashId(element.hash);

		return elements.has(id) && isTriggerFor(element, id)
			? { id, element }
			: undefined;
	}

	return undefined;
};

// One listener for the page, so triggers that arrive later work too.
document.addEventListener('click', (event) => {
	if (
		event.defaultPrevented ||
		event.button !== 0 ||
		event.metaKey ||
		event.ctrlKey ||
		event.shiftKey ||
		event.altKey ||
		!(event.target instanceof window.Element)
	) {
		return;
	}

	const trigger = triggeredBy(event.target);
	const id = trigger?.id;
	const item = id ? state.items[id] : undefined;

	if (!item) {
		return;
	}

	event.preventDefault();

	// Remembered for the close: a click doesn't focus a button or link in
	// Safari, so the browser has nothing to give focus back to.
	if (!item.isOpen) {
		openers.set(id, trigger.element);
	}

	// Opening by hand isn't an automatic open; closing an automatic one
	// (e.g. an age gate's own link) dismisses it.
	if (!item.isOpen) {
		item.autoOpened = false;
	}

	actions.toggle(id);
});

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
	to?.style.setProperty('--modal-switch', String(Math.sign(offset)));

	state.items[id].isOpen = false;
	state.items[target].isOpen = true;

	// Once the next modal is open (the store opens it) and its transitions
	// (the theme's, however long) are done.
	const cleanUp = () => {
		from?.classList.remove('is-switching-out');
		to?.classList.remove('is-switching-in');
		to?.style.removeProperty('--modal-switch');
	};
	const whenOpen = (frames) =>
		to?.open || frames <= 0
			? afterTransitions(to, cleanUp)
			: window.requestAnimationFrame(() => whenOpen(frames - 1));

	whenOpen(10);
};

/**
 * Open the Matter containers a dialog is hidden in (an inactive tab, a closed
 * accordion item, collapsible or dialog), outermost last, so the dialog can
 * show: a modal inside a hidden element opens invisibly and blocks the page.
 *
 * @param {HTMLDialogElement} dialog Dialog.
 * @return {boolean} Whether anything was opened.
 */
const revealContainers = (dialog) => {
	let revealed = false;

	for (let el = dialog.parentElement; el; el = el.parentElement) {
		if (el.matches('.wp-block-matter-tab:not(.is-active)')) {
			window.matter
				?.tabs?.(el.closest('.wp-block-matter-tabs'))
				?.select(el.id);
			revealed = true;
		} else if (
			el.matches(
				'.wp-block-matter-accordion-item:not(.is-open) > .wp-block-matter-accordion-item__panel'
			)
		) {
			const item = el.closest('.wp-block-matter-accordion-item');

			window.matter
				?.accordion?.(item.closest('.wp-block-matter-accordion'))
				?.open(item.id);
			revealed = true;
		} else if (
			(el.matches(
				'.wp-block-matter-collapsible__content:not(.is-open)'
			) ||
				el.matches('dialog:not([open])')) &&
			state.items[el.id]
		) {
			state.items[el.id].isOpen = true;
			revealed = true;
		}
	}

	return revealed;
};

/**
 * Whether an element is rendered: neither it nor an ancestor is
 * `display: none` or has its content skipped (`content-visibility: hidden`,
 * a closed `until-found` panel). A closed dialog's own display doesn't count.
 *
 * @param {Element} element Element.
 * @return {boolean} Rendered.
 */
const isRendered = (element) => {
	for (let el = element.parentElement; el; el = el.parentElement) {
		const style = window.getComputedStyle(el);

		if (style.display === 'none' || style.contentVisibility === 'hidden') {
			return false;
		}
	}

	return true;
};

/**
 * Give focus back to what opened a dialog when the browser hasn't: a browser
 * that didn't focus the trigger on click (Safari) has nothing to restore, and
 * leaves focus on the page. The control that opened it, if it's still there,
 * else the first visible control that opens it.
 *
 * @param {string} id Overlay ID.
 */
const restoreFocus = (id) => {
	const opener = openers.get(id);
	const dialog = elements.get(id);
	const startedAt = epoch;

	openers.delete(id);

	// A frame later, once the browser has finished moving focus (Safari
	// does it after the close event).
	window.requestAnimationFrame(() => {
		// Another overlay or a panel opened since: focus is theirs.
		if (epoch !== startedAt) {
			return;
		}

		const current = focused();

		// Lost: on the page, or on something in the closed dialog (the browser
		// leaves focus on a container only the dialog gave one, such as a
		// `tabindex="-1"` one). Anything else that has focus was given it on
		// purpose (a link's target section takes focus the same way), and keeps
		// it.
		if (!isUsable(current) || dialog?.contains(current)) {
			focusFirst([opener, ...findTriggers(id)]);
		}
	});
};

/**
 * Show a dialog as a modal, unless it still can't be seen (e.g. the theme
 * hides its container), which would leave the page blocked behind an
 * invisible dialog.
 *
 * @param {HTMLDialogElement} dialog Dialog.
 * @param {string}            id     Overlay ID.
 */
const showDialog = (dialog, id) => {
	if (dialog.open || !state.items[id]?.isOpen) {
		// Closed again before it was shown: the click that asked is spent.
		if (!dialog.open) {
			openers.delete(id);
		}

		return;
	}

	// Over something that holds the page inert (an open panel), the holds
	// around it let go until it closes, so it can be used.
	const resume = suspendForModal(dialog, openers.get(id) ?? focused());

	if (!isRendered(dialog) || dialog.closest('[inert]')) {
		resume();
		// eslint-disable-next-line no-console -- Tells the developer why it didn't open.
		console.warn(
			`Matter: "#${id}" wasn't opened because it's inside something hidden.`
		);
		state.items[id].isOpen = false;
		// Nothing opened, so nothing to give focus back to later.
		openers.delete(id);
		return;
	}

	// An open that didn't come from a click (the hash, a script, a delay)
	// goes back to whatever had focus.
	if (!openers.has(id) && focused()) {
		openers.set(id, focused());
	}

	resumes.set(id, resume);
	++epoch;

	try {
		dialog.showModal();
	} catch (error) {
		resumeAfter(id);
		openers.delete(id);
		throw error;
	}

	syncDocumentClass();
	emit(dialog, 'overlay', 'open');
};

/**
 * Open an overlay by itself when it should: its #hash on load, a matching URL
 * parameter, or on load or scroll unless dismissed.
 *
 * @param {string}      id     Overlay ID.
 * @param {Object}      item   Its state.
 * @param {Function}    later  setTimeout, cleared with the overlay.
 * @param {AbortSignal} signal Removes listeners with the overlay.
 */
const startAutomaticOpens = (id, item, later, signal) => {
	// A matching hash always opens (deep links).
	if (window.location.hash === `#${id}`) {
		item.isOpen = true;
		return;
	}

	// Parameter names match whatever case the link has; values must match.
	const params = new Map(
		[...new URLSearchParams(window.location.search)].map(
			([name, value]) => [name.toLowerCase(), value]
		)
	);
	const matchesUrl = (item.urlTriggers ?? []).some(
		({ param, value }) =>
			param &&
			params.has(param.toLowerCase()) &&
			(!value || params.get(param.toLowerCase()) === value)
	);

	// A matching URL parameter is asked for (e.g. a campaign link), so
	// it opens even after a dismissal; dismissals stop the automatic
	// opens on load and on scroll.
	if (matchesUrl) {
		later(
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
		later(autoOpen, (item.openDelay ?? 0) * 1000);
	}

	if (item.openOnScroll) {
		const threshold = (item.scrollThreshold ?? 50) / 100;
		const onScroll = () => {
			const { scrollHeight, clientHeight } = document.documentElement;
			const progress =
				window.scrollY / Math.max(1, scrollHeight - clientHeight);

			if (progress >= threshold) {
				window.removeEventListener('scroll', onScroll);
				autoOpen();
			}
		};

		window.addEventListener('scroll', onScroll, { passive: true, signal });
	}
};

const { state, actions } = store('matter/overlay', {
	state: {
		get isOpen() {
			return !!state.items[getContext().id]?.isOpen;
		},
		// A collapsible's closed content is `hidden="until-found"`: find-in-page,
		// a text fragment or a link inside it opens it (`beforematch`, which
		// `actions.open` answers). The server leaves it showing.
		get isHidden() {
			return state.isOpen ? false : 'until-found';
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
		prev(idOrEvent) {
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
			const { ref } = getElement();

			// Marked even with no item for it (so its `matter-ready-overlay`
			// still counts: the script did start).
			enhance('overlay', ref);

			if (!item) {
				return;
			}

			elements.set(id, ref);
			registerInstance('overlay', ref, {
				element: ref,
				id,
				get isOpen() {
					return !!state.items[id]?.isOpen;
				},
				open: () => actions.open(id),
				close: () => actions.close(id),
				toggle: () => actions.toggle(id),
				next: () => actions.next(id),
				prev: () => actions.prev(id),
				closeAll: () => actions.closeAll(),
			});

			// Listeners outside the overlay (triggers, the window) and timers
			// go when it's removed, e.g. by client-side navigation, so a
			// trigger that stays on the page isn't wired twice.
			const controller = new AbortController();
			const { signal } = controller;
			const timers = [];
			const later = (callback, delay) =>
				timers.push(window.setTimeout(callback, delay));

			// Triggers: a block's trigger areas are made into controls here;
			// clicks are handled for the whole page (above).
			document
				.querySelectorAll(
					`[data-matter-trigger="${
						window.CSS?.escape ? window.CSS.escape(id) : id
					}"]`
				)
				.forEach(prepareArea);
			syncTriggers(id, false);

			// A matching hash always opens (deep links), on load and when the
			// address changes to it later (trigger links don't change it).
			window.addEventListener(
				'hashchange',
				withScope(() => {
					if (window.location.hash === `#${id}` && state.items[id]) {
						state.items[id].isOpen = true;
					}
				}),
				{ signal }
			);

			startAutomaticOpens(id, item, later, signal);

			return () => {
				controller.abort();
				timers.forEach((timer) => window.clearTimeout(timer));

				// Only if it's still this element's: a replaced overlay with the
				// same ID may have started already.
				if (elements.get(id) === ref) {
					elements.delete(id);
					lastStates.delete(id);
					openers.delete(id);
					resumeAfter(id);
				}

				syncDocumentClass();
			};
		},

		sync() {
			const { id } = getContext();
			const { ref } = getElement();
			const item = state.items[id];
			const isOpen = !!item?.isOpen;

			if (isDialog(id)) {
				if (isOpen && isClosing(ref)) {
					// Reopened while closing.
					cancelClose(ref);
				} else if (isOpen && !ref.open) {
					// Inside a closed tab, accordion item, collapsible or dialog,
					// open that first, then this once it's shown.
					if (revealContainers(ref)) {
						window.requestAnimationFrame(() => showDialog(ref, id));
					} else {
						showDialog(ref, id);
					}
				} else if (!isOpen && ref.open) {
					// After its closing transition (interactivity/dialog).
					closeDialog(ref);
				}

				syncDocumentClass();
			}

			syncTriggers(id, isOpen);

			// A collapsible announces here. A dialog announces when the
			// browser shows or closes it (showDialog(), onClose()), which can
			// be later than the state changes, or not at all if it can't be
			// shown.
			if (!isDialog(id) && (lastStates.get(id) ?? false) !== isOpen) {
				emit(ref, 'overlay', isOpen ? 'open' : 'close');
			}

			lastStates.set(id, isOpen);
		},
		// Native dialog close (Escape, form[method=dialog], dialog.close()).
		// When Matter closes a dialog, its item is already closed; otherwise
		// the browser or other code closed it.
		onClose() {
			const { id } = getContext();
			const { ref } = getElement();
			const item = state.items[id];

			// A dialog that can't be closed reopens: Chromium closes it on a
			// second Escape (a cancel event it won't let be prevented), and
			// that mustn't count as dismissing it (e.g. an age gate).
			if (item?.isOpen && item.dismissible === false) {
				if (ref.isConnected && !ref.open) {
					ref.showModal();
				}

				return;
			}

			if (item?.isOpen) {
				item.isOpen = false;
			}

			if (item?.autoOpened) {
				rememberDismissal(id, item.dismissDays);
				item.autoOpened = false;
			}

			resumeAfter(id);
			syncDocumentClass();
			restoreFocus(id);
			emit(ref, 'overlay', 'close');
		},
		// Escape: ignored by dialogs that can't be closed; others close as
		// any close does, with their closing transition. (Chromium may not
		// let a repeated Escape be prevented: onClose handles that.)
		onCancel: withSyncEvent((event) => {
			const item = state.items[getContext().id];

			event.preventDefault();

			if (item && item.dismissible !== false) {
				item.isOpen = false;
			}
		}),
		// Clicking the ::backdrop targets the dialog itself (pressed there
		// too, not dragged out from inside).
		onBackdropClick: withSyncEvent((event) => {
			const { ref } = getElement();
			const { id } = getContext();

			if (
				isBackdropClick(event, ref) &&
				state.items[id]?.dismissible !== false
			) {
				actions.close(id);
			}
		}),
	},
});
