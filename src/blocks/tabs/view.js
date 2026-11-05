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

const PANEL = '.wp-block-matter-tab';
const NAV = '.wp-block-matter-tabs__nav';

const activate = (tabId) => {
	const context = getContext();

	context.active = tabId;

	if (context.deepLink) {
		window.history.replaceState(null, '', `#${tabId}`);
	}
};

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
	},
	actions: {
		select() {
			const context = getContext();

			activate(context.tabId);

			if (context.isMenuOpen) {
				actions.closeMenu();
			}
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
			const context = getContext();
			const { ref } = getElement();
			const tabs = [
				...ref.parentElement.querySelectorAll(':scope > [role="tab"]'),
			];
			const index = tabs.indexOf(ref);
			const next = tabs[(index + 1) % tabs.length];
			const previous = tabs[(index - 1 + tabs.length) % tabs.length];

			// The open dropdown is a vertical list: move focus; Enter/Space
			// (the button's click) choose.
			if (context.isMenuOpen) {
				const targets = {
					ArrowDown: next,
					ArrowRight: next,
					ArrowUp: previous,
					ArrowLeft: previous,
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
				[vertical ? 'ArrowDown' : 'ArrowRight']: next,
				[vertical ? 'ArrowUp' : 'ArrowLeft']: previous,
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
			const hash = decodeURIComponent(window.location.hash.slice(1));
			const panel = hash
				? document.getElementById(hash)?.closest(PANEL)
				: null;

			if (panel && panel.closest('.wp-block-matter-tabs') === ref) {
				context.active = panel.id;
			}
		},
	},
});
