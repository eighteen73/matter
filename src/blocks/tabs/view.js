/**
 * Tabs behaviour (store: matter/tabs).
 *
 * Automatic activation: arrow keys (Up/Down for vertical tabs) move between
 * tabs and select them; Home/End jump to the first/last. A URL hash matching
 * a panel (or something inside one) selects that tab on load; with deep
 * linking, selecting a tab updates the hash.
 *
 * Dropdown (below the theme's breakpoint): a button showing the current tab
 * opens the tab list. In the open list, arrow keys move focus and Enter/Space
 * choose; choosing, Escape or clicking elsewhere closes it.
 *
 * API: `matter.tabs( target )` → instance (see README); events
 * `matter-tabs-ready` and `matter-tabs-change`.
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
import { hashId, scrollWhenShown } from '../../interactivity/hash';

const SELECTOR = '.wp-block-matter-tabs';
const PANEL = '.wp-block-matter-tab';
const NAV = '.wp-block-matter-tabs__nav';

registerType('tabs', SELECTOR);

// Tabs element => instance; last announced tab.
const instances = new WeakMap();
const announced = new WeakMap();

const activate = (tabId, context = getContext()) => {
	context.active = tabId;

	if (context.deepLink) {
		window.history.replaceState(null, '', `#${tabId}`);
	}
};

/**
 * A tabs block's tabs (not a nested block's): index, panel ID and label.
 *
 * @param {Element} root Tabs element.
 * @return {Array} Tabs.
 */
const tabsOf = (root) =>
	[...root.querySelectorAll('[role="tab"]')]
		.filter((button) => button.closest(SELECTOR) === root)
		.map((button, index) => ({
			index,
			id: button.getAttribute('aria-controls'),
			label:
				button
					.querySelector('.wp-block-matter-tabs__label')
					?.textContent.trim() ?? '',
		}));

const instanceFor = (target) => instances.get(resolve(target, SELECTOR));

// After the open/closed state has rendered.
const afterRender = (callback) => window.requestAnimationFrame(callback);

const navOf = (element) => element.closest(NAV);

const focusToggle = (element) =>
	afterRender(() =>
		navOf(element)?.querySelector('.wp-block-matter-tabs__toggle')?.focus()
	);

const focusActiveTab = (element) =>
	afterRender(() =>
		navOf(element)
			?.querySelector('[role="tab"][aria-selected="true"]')
			?.focus()
	);

const { state, actions } = store('matter/tabs', {
	state: {
		get isActive() {
			const { active, tabId } = getContext();

			return active === tabId;
		},
		get tabIndex() {
			return state.isActive ? 0 : -1;
		},
		// The server shows every panel; once the script runs only the active
		// one shows. An inactive one is `hidden="until-found"`, so find-in-page,
		// a text fragment or a link inside it can reach it (`beforematch`,
		// below). A browser that doesn't know `until-found` just hides it.
		get isPanelHidden() {
			return state.isActive ? false : 'until-found';
		},
		// Once the script runs a panel is a tabpanel, named by its tab. (The
		// server renders none of it: without a tab list there is nothing to
		// be a panel of.)
		get panelRole() {
			return 'tabpanel';
		},
		get panelTabIndex() {
			return 0;
		},
		get panelLabelledBy() {
			return `${getContext().tabId}-tab`;
		},
	},
	actions: {
		/**
		 * From a tab button; or, from the API, `select( target, tab )` with a
		 * tab index or panel ID.
		 *
		 * @param {*}             target Directive event, or tabs ID/element.
		 * @param {number|string} tab    Tab index or panel ID (API).
		 */
		select(target, tab) {
			if (!fromDirective(target)) {
				instanceFor(target)?.select(tab);

				return;
			}

			const context = getContext();

			activate(context.tabId);

			if (context.isMenuOpen) {
				actions.closeMenu();
			}
		},
		// The browser is about to show an inactive panel's text, found in the
		// page: select its tab, as its button would.
		reveal() {
			const context = getContext();

			if (context.active !== context.tabId) {
				activate(context.tabId, context);
			}
		},
		next(target) {
			instanceFor(target)?.next();
		},
		prev(target) {
			instanceFor(target)?.prev();
		},
		toggleMenu() {
			const context = getContext();

			context.isMenuOpen = !context.isMenuOpen;

			if (context.isMenuOpen) {
				focusActiveTab(getElement().ref);
			}
		},
		closeMenu() {
			getContext().isMenuOpen = false;
			focusToggle(getElement().ref);
		},
		onToggleKeydown: withSyncEvent((event) => {
			if (event.altKey || event.ctrlKey || event.metaKey) {
				return;
			}

			const context = getContext();

			if (event.key === 'Escape' && context.isMenuOpen) {
				event.preventDefault();
				context.isMenuOpen = false;
			} else if (event.key === 'ArrowDown' && !context.isMenuOpen) {
				event.preventDefault();
				actions.toggleMenu();
			}
		}),
		onDocumentClick(event) {
			const context = getContext();
			const { ref } = getElement();

			if (context.isMenuOpen && !ref.contains(event.target)) {
				context.isMenuOpen = false;
			}
		},
		onKeydown: withSyncEvent((event) => {
			// Alt+Arrow is the browser's back and forward, Ctrl+Home and
			// Ctrl+End scroll the page: not ours.
			if (event.altKey || event.ctrlKey || event.metaKey) {
				return;
			}

			const context = getContext();
			const { ref } = getElement();
			const tabs = [
				...ref.parentElement.querySelectorAll(':scope > [role="tab"]'),
			];
			const index = tabs.indexOf(ref);
			const next = tabs[(index + 1) % tabs.length];
			const previous = tabs[(index - 1 + tabs.length) % tabs.length];

			// Left and Right follow the screen: in a right-to-left tablist the
			// next tab is on the left. Read from the tab, not the page, so a
			// right-to-left section in a left-to-right page works.
			const isRtl = window.getComputedStyle(ref).direction === 'rtl';
			const forwards = isRtl ? 'ArrowLeft' : 'ArrowRight';
			const backwards = isRtl ? 'ArrowRight' : 'ArrowLeft';

			// The open dropdown is a vertical list: move focus; Enter/Space
			// (the button's click) choose.
			if (context.isMenuOpen) {
				const targets = {
					ArrowDown: next,
					[forwards]: next,
					ArrowUp: previous,
					[backwards]: previous,
					Home: tabs[0],
					End: tabs[tabs.length - 1],
				};

				if (event.key === 'Escape') {
					event.preventDefault();
					actions.closeMenu();
				} else if (event.key === 'Tab') {
					context.isMenuOpen = false;
				} else if (targets[event.key]) {
					event.preventDefault();
					targets[event.key].focus();
				}

				return;
			}

			const vertical =
				ref.parentElement.getAttribute('aria-orientation') ===
				'vertical';
			const targets = {
				[vertical ? 'ArrowDown' : forwards]: next,
				[vertical ? 'ArrowUp' : backwards]: previous,
				Home: tabs[0],
				End: tabs[tabs.length - 1],
			};
			const target = targets[event.key];

			if (!target) {
				return;
			}

			event.preventDefault();
			target.focus();
			target.click();
		}),
	},
	callbacks: {
		init() {
			const context = getContext();
			const { ref } = getElement();

			// The block and its own panels (the CSS hides an inactive panel, and
			// a nested block's panels are for that block to mark).
			enhance(
				'tabs',
				ref,
				...[...ref.querySelectorAll(PANEL)].filter(
					(panel) => panel.closest(SELECTOR) === ref
				)
			);
			// A link to a tab, or to anything in one (including a tab of tabs
			// nested in it), selects this block's tab that holds it: on load,
			// and when the address's #hash changes.
			const selectFromHash = withScope(() => {
				const hash = hashId();
				const target = hash ? document.getElementById(hash) : null;
				const panel =
					target &&
					[...ref.querySelectorAll(PANEL)].find(
						(element) =>
							element.closest(SELECTOR) === ref &&
							element.contains(target)
					);

				if (panel && context.active !== panel.id) {
					context.active = panel.id;
					// The browser couldn't scroll to it while its tab was hidden.
					scrollWhenShown(target);
				}
			});

			// Removed with the block (e.g. by client-side navigation).
			const controller = new AbortController();

			selectFromHash();
			window.addEventListener('hashchange', selectFromHash, {
				signal: controller.signal,
			});

			const choose = withScope((tab) => {
				const tabs = tabsOf(ref);
				const target =
					typeof tab === 'number'
						? tabs[tab]
						: tabs.find(({ id }) => id === tab);

				if (target) {
					activate(target.id, context);
				}
			});
			const step = (offset) => {
				const tabs = tabsOf(ref);
				const index = tabs.findIndex(({ id }) => id === context.active);

				choose((index + offset + tabs.length) % tabs.length);
			};

			const instance = {
				element: ref,
				get id() {
					return ref.id || null;
				},
				/** Each tab: { index, id (its panel's ID), label }. */
				get tabs() {
					return tabsOf(ref);
				},
				/** The current tab, as in `tabs`. */
				get active() {
					return (
						tabsOf(ref).find(({ id }) => id === context.active) ??
						null
					);
				},
				select: choose,
				next: () => step(1),
				prev: () => step(-1),
			};

			instances.set(ref, instance);
			announced.set(ref, context.active);
			registerInstance('tabs', ref, instance);

			return () => controller.abort();
		},
		// Announce tab changes (from a click, the keyboard or the API).
		announce() {
			const { active } = getContext();
			const { ref } = getElement();
			const previous = announced.get(ref);

			if (!instances.has(ref) || previous === active) {
				return;
			}

			announced.set(ref, active);

			const tabs = tabsOf(ref);

			emit(ref, 'tabs', 'change', {
				index: tabs.findIndex(({ id }) => id === active),
				tabId: active,
				previous,
			});
		},
	},
});
