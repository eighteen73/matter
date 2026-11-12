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
import { createFocusTrap } from 'focus-trap';

/**
 * Internal dependencies
 */
import { registerInstance, registerType } from '../interactivity/api';
import { suspendTransitions } from '../interactivity/transitions';

registerType('panel', '.matter-panel');

const OPEN_CLASS = 'has-panel-open';
const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const traps = new Map();
const queries = new Map();

const isCollapsed = (id) => queries.get(id)?.matches ?? true;

const getContent = (panel) => panel.querySelector('.matter-panel__content');

const getToggles = (id) => [
	...document.querySelectorAll(`.matter-panel-toggle[aria-controls="${id}"]`),
];

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

	document.documentElement.classList.add(OPEN_CLASS);

	const trap = createFocusTrap([content, ...getToggles(id)], {
		allowOutsideClick: true,
		escapeDeactivates: false,
		returnFocusOnDeactivate: true,
		setReturnFocus: (previous) =>
			getToggles(id).includes(previous)
				? previous
				: getToggles(id).find((toggle) => toggle.checkVisibility?.()) ||
					previous,
		initialFocus: () =>
			[...content.querySelectorAll(FOCUSABLE)].find(
				(element) =>
					!element.classList.contains('matter-panel__close') &&
					element.checkVisibility?.() !== false
			) || content,
		fallbackFocus: content,
		// The panel is still sliding in: don't scroll anything to reveal it.
		preventScroll: true,
	});

	traps.set(id, trap);

	// Wait a frame so the panel is visible before moving focus into it.
	window.requestAnimationFrame(() => trap.activate());
	panel.dispatchEvent(
		new CustomEvent('matter-panel-open', {
			bubbles: true,
			detail: { id, instance: window.matter?.panel?.(panel) ?? null },
		})
	);
};

const deactivate = (panel, id) => {
	if (!traps.has(id)) {
		return;
	}

	traps.get(id).deactivate();
	traps.delete(id);

	if (!traps.size) {
		document.documentElement.classList.remove(OPEN_CLASS);
	}

	panel.dispatchEvent(
		new CustomEvent('matter-panel-close', {
			bubbles: true,
			detail: { id, instance: window.matter?.panel?.(panel) ?? null },
		})
	);
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

				state.panels[id].isOpen = !state.panels[id].isOpen;
			},
			open() {
				const { id } = getContext();

				state.panels[id].isOpen = true;
			},
			close() {
				const { id } = getContext();

				state.panels[id].isOpen = false;
			},
			onKeydown: withSyncEvent((event) => {
				if (event.key !== 'Escape' || !state.isOpen) {
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
						})
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

				ref.addEventListener('click', (event) => {
					const link = event.target.closest?.('a[href]');
					const newTab =
						event.metaKey ||
						event.ctrlKey ||
						event.shiftKey ||
						link?.target === '_blank';

					if (link && ref.contains(link) && !newTab) {
						closeOnNavigate();
					}
				});

				window.addEventListener('hashchange', closeOnNavigate);

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
			},
			sync() {
				const { id } = getContext();
				const { ref } = getElement();

				if (state.panels[id]?.isOpen && isCollapsed(id)) {
					activate(ref, id);
				} else {
					deactivate(ref, id);
				}
			},
		},
	},
	{ lock: true }
);
