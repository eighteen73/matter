/**
 * Tabs behaviour (store: matter/tabs).
 *
 * Automatic activation: arrow keys (Up/Down for vertical tabs) move between
 * tabs and select them; Home/End jump to the first/last. Below its dropdown
 * breakpoint the list is replaced by a native select. A URL hash matching a panel (or something
 * inside one) selects that tab on load; with deep linking, selecting a tab
 * updates the hash.
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

const activate = (tabId) => {
	const context = getContext();

	context.active = tabId;

	if (context.deepLink) {
		window.history.replaceState(null, '', `#${tabId}`);
	}
};

const { state } = store('matter/tabs', {
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
			activate(getContext().tabId);
		},
		selectFromMenu: (event) => {
			activate(event.target.value);
		},
		onKeydown: withSyncEvent((event) => {
			const { ref } = getElement();
			const tabs = [
				...ref.parentElement.querySelectorAll(':scope > [role="tab"]'),
			];
			const index = tabs.indexOf(ref);
			const vertical =
				ref.parentElement.getAttribute('aria-orientation') ===
				'vertical';
			const next = tabs[(index + 1) % tabs.length];
			const previous = tabs[(index - 1 + tabs.length) % tabs.length];
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
