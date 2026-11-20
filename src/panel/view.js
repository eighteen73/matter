/**
 * Responsive panel behaviour (store: matter/panel).
 *
 * Below its breakpoint a panel is an off-canvas dialog: it traps focus, locks
 * page scroll and closes on Escape or backdrop click. At and above it the panel
 * is inline and none of that applies. Layout per mode is pure CSS.
 *
 * Dispatches `matter-panel-open` / `matter-panel-close` on the panel element.
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
 * External dependencies
 */
import {
	createTrap as createFocusTrap,
	releaseTrapsWithin,
} from '@matter/focus-trap';

/**
 * Internal dependencies
 */
import {
	emit,
	enhance,
	registerInstance,
	registerType,
} from '../interactivity/api';
import { focused, isUsable } from '../interactivity/focus';
import { inertAround, onModal } from '@matter/inert';
import { suspendTransitions } from '../interactivity/transitions';

registerType('panel', '.matter-panel');

const OPEN_CLASS = 'has-panel-open';
const GUTTER_CLASS = 'has-panel-gutter';
const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const traps = new Map();
const queries = new Map();

// The panel element that owns each ID's trap and registration, so one that is
// replaced by another with the same ID doesn't tear the new one down.
const owners = new Map();
const registered = new Map();
const watchers = new Map();

// What makes everything around an open panel inert, to release on close.
const releases = new Map();

// Each open panel's registration to be told of a modal dialog opening.
const modalWatchers = new Map();

// The panels that are open, the last one on top: Escape closes that one.
const stack = [];

// The control that opened each panel, so focus can go back to it even where a
// click doesn't focus a button (Safari), or the opener was made inert.
const openers = new Map();

const isCollapsed = (id) => queries.get(id)?.matches ?? true;

const getContent = (panel) => panel.querySelector('.matter-panel__content');

const getToggles = (id) => [
	...document.querySelectorAll(`.matter-panel-toggle[aria-controls="${id}"]`),
];

/**
 * Where focus goes when a panel closes: the control that opened it, if it is
 * still there; else the element focused before it opened; else the first
 * visible toggle.
 *
 * @param {string}       id       Panel ID.
 * @param {Element|null} opener   Control that opened it.
 * @param {Element|null} previous Element focused before the panel opened.
 * @return {Element|false} Element to focus.
 */
const returnTarget = (id, opener, previous) =>
	[opener, previous, ...getToggles(id)].find(isUsable) || false;

/**
 * Dialog semantics only apply while the panel is off-canvas.
 *
 * @param {Element} panel Panel element.
 * @param {string}  id    Panel ID.
 * @param {string}  label Accessible label.
 */
const applyMode = (panel, id, label) => {
	const content = getContent(panel);

	if (!content) {
		return;
	}

	if (isCollapsed(id)) {
		content.setAttribute('role', 'dialog');
		content.setAttribute('aria-modal', 'true');
		content.setAttribute('aria-label', label);
		content.setAttribute('tabindex', '-1');
	} else {
		['role', 'aria-modal', 'aria-label', 'tabindex'].forEach((attribute) =>
			content.removeAttribute(attribute)
		);
	}
};

const activate = (panel, id) => {
	const content = getContent(panel);

	if (!content || traps.has(id)) {
		return;
	}

	// Where focus was when it opened, if not on the page itself.
	const previous = focused();
	const opener = openers.get(id) ?? null;

	openers.delete(id);

	// Set when the trap resumes after a modal dialog: focus goes back to the
	// control that opened it (or stays where the dialog gave it back).
	let resumed = null;

	const trap = createFocusTrap([content], {
		allowOutsideClick: true,
		escapeDeactivates: false,
		returnFocusOnDeactivate: true,
		// Called after the page is live again (see deactivate()).
		setReturnFocus: () => returnTarget(id, opener, previous),
		initialFocus: () => {
			if (resumed) {
				const target = [resumed.opener, focused()].find(
					(element) =>
						element &&
						content.contains(element) &&
						isUsable(element)
				);

				resumed = null;

				if (target) {
					return target;
				}
			}

			return (
				[...content.querySelectorAll(FOCUSABLE)].find(
					(element) =>
						!element.classList.contains('matter-panel__close') &&
						element.checkVisibility?.() !== false
				) || content
			);
		},
		fallbackFocus: content,
		// The panel is still sliding in: don't scroll anything to reveal it.
		preventScroll: true,
	});

	// Only the dialog is exposed while it's open: the rest of the page (the
	// toggle included; the close control is in the dialog) is inert. The
	// backdrop stays live, as it takes the click that closes the panel. Last
	// of what can fail, and undone by inertAround() if it does, so a failure
	// leaves the page as it was.
	releases.set(id, inertAround(content, { keep: '.matter-panel__backdrop' }));
	const root = document.documentElement;

	// Keep the scrollbar's space only on a page that has a scrollbar (see the
	// overlay script), looked at before the lock starts.
	if (!root.classList.contains(OPEN_CLASS)) {
		root.classList.toggle(
			GUTTER_CLASS,
			root.scrollHeight > root.clientHeight
		);
	}

	root.classList.add(OPEN_CLASS);

	traps.set(id, trap);
	owners.set(id, panel);
	stack.push(id);

	// A modal dialog opened from the panel is outside its trap: the trap rests
	// until that dialog closes.
	modalWatchers.set(
		id,
		onModal((dialog, control) => {
			trap.pause();

			return () => {
				resumed = { opener: control };
				trap.unpause();
			};
		})
	);

	// A panel taken out of the page while open (by a script, or a replacement
	// the interactivity runtime never tears down) must let go of the scroll
	// lock and the trap.
	const watcher = new window.MutationObserver(() => {
		if (!panel.isConnected) {
			deactivate(panel, id, { silent: true });
		}
	});

	watcher.observe(document.body, { childList: true, subtree: true });
	watchers.set(id, watcher);

	// Wait a frame so the panel is visible before moving focus into it.
	window.requestAnimationFrame(() => {
		if (traps.get(id) === trap) {
			trap.activate();
		}
	});
	emit(panel, 'panel', 'open');
};

/**
 * @param {Element} panel                Panel element.
 * @param {string}  id                   Panel ID.
 * @param {Object}  options
 * @param {boolean} options.silent       Don't announce the close.
 * @param {boolean} options.restoreFocus Move focus back to what opened it.
 *                                       Not when the panel goes inline: it
 *                                       is still there, so focus stays.
 */
const deactivate = (
	panel,
	id,
	{ silent = false, restoreFocus = true } = {}
) => {
	// Only the panel that holds the trap lets go of it.
	if (!traps.has(id) || owners.get(id) !== panel) {
		return;
	}

	// The page is live again before focus goes back to the toggle (an inert
	// element can't take it), and whatever goes wrong, the page is released.
	try {
		// Traps inside its content (e.g. a drill-down menu's) let go first,
		// without moving focus, so focus goes back to the toggle, not into the
		// closing panel.
		try {
			releaseTrapsWithin(getContent(panel) ?? panel);
		} finally {
			releases.get(id)?.();
			releases.delete(id);
		}

		modalWatchers.get(id)?.();
		modalWatchers.delete(id);

		traps.get(id).deactivate({ returnFocus: restoreFocus });
	} finally {
		traps.delete(id);
		owners.delete(id);
		watchers.get(id)?.disconnect();
		watchers.delete(id);

		const position = stack.lastIndexOf(id);

		if (position > -1) {
			stack.splice(position, 1);
		}

		if (!traps.size) {
			document.documentElement.classList.remove(OPEN_CLASS, GUTTER_CLASS);
		}
	}

	if (!silent) {
		emit(panel, 'panel', 'close');
	}
};

const { state, actions } = store(
	'matter/panel',
	{
		state: {
			get isOpen() {
				const { id } = getContext();

				return !!state.panels[id]?.isOpen;
			},
		},
		actions: {
			toggle() {
				const { id } = getContext();

				if (!state.panels[id].isOpen) {
					openers.set(id, getElement().ref);
				}

				state.panels[id].isOpen = !state.panels[id].isOpen;
			},
			open() {
				const { id } = getContext();

				openers.set(id, getElement().ref);
				state.panels[id].isOpen = true;
			},
			close() {
				const { id } = getContext();

				state.panels[id].isOpen = false;
			},
			onKeydown: withSyncEvent((event) => {
				const { id } = getContext();

				// Only the topmost open panel answers Escape.
				if (
					event.key !== 'Escape' ||
					event.defaultPrevented ||
					!state.isOpen ||
					stack[stack.length - 1] !== id
				) {
					return;
				}

				// Escape in a modal inside the panel closes the modal (the
				// browser does it), not the panel behind it.
				const dialog = event.target.closest?.('dialog[open]');

				if (dialog && getElement().ref.contains(dialog)) {
					return;
				}

				// Nor does it close with a submenu open in it: the menu closes
				// that first (its own Escape handling), then the next Escape
				// closes the panel.
				if (
					getElement().ref.querySelector('.matter-menu__item.is-open')
				) {
					return;
				}

				event.preventDefault();
				actions.close();
			}),
		},
		callbacks: {
			init() {
				const { id, query, label } = getContext();
				const { ref } = getElement();

				// The panel and its toggles (the toggles stay hidden until
				// the panel can open).
				enhance('panel', ref, ...getToggles(id));

				// Listeners removed with the block (e.g. by client-side
				// navigation).
				registered.set(id, ref);

				const listeners = new window.AbortController();
				const { signal } = listeners;

				if (query) {
					const mediaQuery = window.matchMedia(query);

					queries.set(id, mediaQuery);
					mediaQuery.addEventListener(
						'change',
						withScope(() => {
							// Switch layouts instantly, without sliding.
							suspendTransitions([
								ref,
								...ref.querySelectorAll('*'),
							]);
							applyMode(ref, id, label);

							// Becoming inline closes the off-canvas state.
							if (!mediaQuery.matches) {
								state.panels[id].isOpen = false;
							}
						}),
						{ signal }
					);
				}

				applyMode(ref, id, label);

				const setOpen = (isOpen) => {
					if (state.panels[id]) {
						state.panels[id].isOpen = isOpen;
					}
				};

				// Following a link closes the panel: a same-page link (e.g.
				// /#contact) would otherwise scroll the page behind it while
				// the panel, scroll lock and focus trap stayed. Links opened
				// in a new tab or window leave it open.
				const closeOnNavigate = withScope(() => {
					if (state.panels[id]?.isOpen) {
						setOpen(false);
					}
				});

				ref.addEventListener(
					'click',
					(event) => {
						const link = event.target.closest?.('a[href]');
						const newTab =
							event.metaKey ||
							event.ctrlKey ||
							event.shiftKey ||
							link?.target === '_blank';

						if (link && ref.contains(link) && !newTab) {
							closeOnNavigate();
						}
					},
					{ signal }
				);

				window.addEventListener('hashchange', closeOnNavigate, {
					signal,
				});

				registerInstance('panel', ref, {
					element: ref,
					id,
					get isOpen() {
						return !!state.panels[id]?.isOpen;
					},
					/** Off-canvas (below its breakpoint), rather than inline. */
					get isCollapsed() {
						return isCollapsed(id);
					},
					open: () => setOpen(true),
					close: () => setOpen(false),
					toggle: () => setOpen(!state.panels[id]?.isOpen),
				});

				return () => {
					listeners.abort();

					// Only if it's still this element's: a replacement with the
					// same ID may have started already.
					if (registered.get(id) === ref) {
						registered.delete(id);
						queries.delete(id);
					}

					// Removed while open (client-side navigation): let go of the
					// focus trap and the scroll lock, which nothing else would.
					deactivate(ref, id, { silent: true });
				};
			},
			sync() {
				const { id } = getContext();
				const { ref } = getElement();

				if (state.panels[id]?.isOpen && isCollapsed(id)) {
					activate(ref, id);
				} else {
					// Closed because the viewport went inline: nothing to go
					// back to, and focus isn't moved.
					deactivate(ref, id, { restoreFocus: isCollapsed(id) });
				}
			},
		},
	},
	{ lock: true }
);
