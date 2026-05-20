/* global requestAnimationFrame */
import {
	store,
	getContext,
	getElement,
	withSyncEvent,
} from '@wordpress/interactivity';
import { createFocusTrap } from 'focus-trap';

const isElementReady = (element) => {
	if (!element) {
		return false;
	}

	const style = window.getComputedStyle(element);

	return (
		style.display !== 'none' &&
		style.visibility !== 'hidden' &&
		style.opacity !== '0'
	);
};

const activateWhenReady = (element, trap) => {
	if (isElementReady(element)) {
		trap.activate();
		return;
	}

	requestAnimationFrame(() => activateWhenReady(element, trap));
};

const ensureContextCollections = (context) => {
	if (!Array.isArray(context.openSubmenus)) {
		context.openSubmenus = [];
	}

	if (!context.openModes || typeof context.openModes !== 'object') {
		context.openModes = {};
	}

	if (!context.submenuTraps || typeof context.submenuTraps !== 'object') {
		context.submenuTraps = {};
	}
};

const removeSubmenu = (context, submenuId) => {
	const openIndex = context.openSubmenus.indexOf(submenuId);

	if (openIndex !== -1) {
		context.openSubmenus = [
			...context.openSubmenus.slice(0, openIndex),
			...context.openSubmenus.slice(openIndex + 1),
		];
	}
};

const deactivateTrap = (context, submenuId) => {
	if (!context.submenuTraps?.[submenuId]) {
		return;
	}

	context.submenuTraps[submenuId].deactivate();
	delete context.submenuTraps[submenuId];
};

const closeSubmenu = (context, submenuId) => {
	deactivateTrap(context, submenuId);
	removeSubmenu(context, submenuId);
	delete context.openModes[submenuId];
};

store('eighteen73/navigation', {
	state: {
		isTouchEnabled: false,
	},
	actions: {
		openSubmenuOnHover: () => {
			const { state } = store('eighteen73/navigation');
			const context = getContext();

			if (
				context.menuType !== 'simple' ||
				context.submenuOpensOnClick ||
				state.isTouchEnabled
			) {
				return;
			}

			ensureContextCollections(context);
			const submenuId = context.submenuId;

			if (!context.openSubmenus.includes(submenuId)) {
				context.openSubmenus = [...context.openSubmenus, submenuId];
			}

			context.openModes[submenuId] = 'hover';
		},
		closeSubmenuOnHover: () => {
			const { state } = store('eighteen73/navigation');
			const context = getContext();
			const submenuId = context.submenuId;

			if (
				context.menuType !== 'simple' ||
				context.submenuOpensOnClick ||
				state.isTouchEnabled
			) {
				return;
			}

			ensureContextCollections(context);

			if (context.openModes[submenuId] !== 'hover') {
				return;
			}

			closeSubmenu(context, submenuId);
		},
		toggleSubmenuOnClick: () => {
			const context = getContext();
			const submenuId = context.submenuId;

			ensureContextCollections(context);

			if (context.openSubmenus.includes(submenuId)) {
				closeSubmenu(context, submenuId);
				return;
			}

			context.openSubmenus = [...context.openSubmenus, submenuId];
			context.openModes[submenuId] = 'click';

			const { ref } = getElement();
			const menuItem = ref.closest('.wp-block-navigation-item.has-child');
			const submenuElement = menuItem?.querySelector(
				'.wp-block-eighteen73-navigation__submenu'
			);

			if (!submenuElement) {
				return;
			}

			if (!context.submenuTraps[submenuId]) {
				context.submenuTraps[submenuId] = createFocusTrap(
					submenuElement,
					{
						allowOutsideClick: true,
						escapeDeactivates: true,
						returnFocusOnDeactivate: true,
						initialFocus:
							submenuElement.querySelector(
								'.wp-block-navigation-item__content'
							) ||
							submenuElement.querySelector(
								'.wp-block-eighteen73-navigation__back'
							) ||
							submenuElement,
						fallbackFocus: submenuElement,
						onDeactivate: () => {
							removeSubmenu(context, submenuId);
							delete context.openModes[submenuId];
							delete context.submenuTraps[submenuId];
						},
					}
				);
			}

			activateWhenReady(submenuElement, context.submenuTraps[submenuId]);
		},
		closeSubmenuOnClick: () => {
			const context = getContext();

			ensureContextCollections(context);
			closeSubmenu(context, context.submenuId);
		},
		handleKeydown: withSyncEvent((event) => {
			if (event.key !== 'Escape') {
				return;
			}

			const context = getContext();
			const submenuId = context.submenuId;
			const openMode = context.openModes?.[submenuId];

			if (openMode !== 'click') {
				return;
			}

			event.preventDefault();
			closeSubmenu(context, submenuId);

			const { ref } = getElement();
			const menuItem = ref.closest('.wp-block-navigation-item.has-child');
			const toggle = menuItem?.querySelector(
				'.wp-block-eighteen73-navigation__submenu-toggle'
			);

			if (toggle) {
				toggle.focus();
			}
		}),
		handleNavFocusOut: (event) => {
			const context = getContext();

			if (context.menuType !== 'simple') {
				return;
			}

			const { ref } = getElement();
			const nextFocusedElement = event.relatedTarget;

			if (nextFocusedElement && ref.contains(nextFocusedElement)) {
				return;
			}

			ensureContextCollections(context);

			[...context.openSubmenus].forEach((submenuId) => {
				if (context.openModes[submenuId] === 'click') {
					closeSubmenu(context, submenuId);
				}
			});
		},
	},
	callbacks: {
		isTouchEnabled: () => {
			const { state } = store('eighteen73/navigation');
			const hasTouchSupport =
				'ontouchstart' in window ||
				window.navigator.maxTouchPoints > 0 ||
				window.navigator.msMaxTouchPoints > 0;

			state.isTouchEnabled = hasTouchSupport;

			return hasTouchSupport;
		},
		isSubmenuOpen: () => {
			const context = getContext();

			return (
				Array.isArray(context.openSubmenus) &&
				context.openSubmenus.includes(context.submenuId)
			);
		},
		isAriaExpanded: () => {
			const context = getContext();

			return (
				Array.isArray(context.openSubmenus) &&
				context.openSubmenus.includes(context.submenuId) &&
				context.openModes?.[context.submenuId] === 'click'
			);
		},
	},
});
