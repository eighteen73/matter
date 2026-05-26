/* global requestAnimationFrame */
import {
	store,
	getContext,
	getElement,
	withSyncEvent,
} from '@wordpress/interactivity';
import { createFocusTrap } from 'focus-trap';

const SELECTORS = {
	navigation: '.wp-block-eighteen73-navigation',
	menuItemWithChild: '.wp-block-navigation-item.has-child',
	topLevelContainer: '.wp-block-eighteen73-navigation__container',
	toggle: '.wp-block-eighteen73-navigation__submenu-toggle',
	submenu: '.wp-block-eighteen73-navigation__submenu',
	focusableSubmenuItems:
		'.wp-block-navigation-item__content, .wp-block-eighteen73-navigation__back, .wp-block-eighteen73-navigation__submenu-toggle',
};

const KEYBOARD_OPEN_MODE = 'keyboard';
const CLICK_OPEN_MODE = 'click';
const HOVER_OPEN_MODE = 'hover';

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

const activateWhenReady = (element, trap, onActivated) => {
	if (isElementReady(element)) {
		trap.activate();
		onActivated?.();
		return;
	}

	requestAnimationFrame(() => activateWhenReady(element, trap, onActivated));
};

const ensureSubmenuFocus = (submenuElement) => {
	const tryFocus = () => {
		if (!isElementReady(submenuElement)) {
			requestAnimationFrame(tryFocus);
			return;
		}

		const firstItem =
			submenuElement.querySelector(
				'.wp-block-navigation-item__content'
			) ||
			submenuElement.querySelector(
				'.wp-block-eighteen73-navigation__back'
			);
		const focusedInSubmenu =
			!!firstItem && submenuElement.contains(document.activeElement);

		if (firstItem && !focusedInSubmenu) {
			firstItem.focus();
		}
	};

	requestAnimationFrame(tryFocus);
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

const isVisibleElement = (element) => {
	if (!element) {
		return false;
	}

	const style = window.getComputedStyle(element);

	if (
		style.display === 'none' ||
		style.visibility === 'hidden' ||
		style.opacity === '0'
	) {
		return false;
	}

	return element.getClientRects().length > 0;
};

const getMenuItemFromElement = (element) =>
	element?.closest(SELECTORS.menuItemWithChild) || null;

const getSubmenuElement = (menuItem) =>
	menuItem?.querySelector(SELECTORS.submenu) || null;

const getToggleElement = (menuItem) =>
	menuItem?.querySelector(SELECTORS.toggle) || null;

const getNavigationElement = (element) =>
	element?.closest(SELECTORS.navigation) || null;

const isSimpleMenuVertical = (element) =>
	getNavigationElement(element)?.classList.contains('is-vertical') || false;

const getTopLevelLink = (item) =>
	[...item.children].find(
		(child) =>
			child instanceof Element &&
			child.classList.contains('wp-block-navigation-item__content')
	) || null;

const getTopLevelControlsForItem = (item) => {
	const controls = [];
	const link = getTopLevelLink(item);
	const toggle = item.querySelector(SELECTORS.toggle);

	if (link && isVisibleElement(link)) {
		controls.push(link);
	}

	if (toggle && isVisibleElement(toggle)) {
		controls.push(toggle);
	}

	return controls;
};

const getTopLevelContainer = (element) =>
	getNavigationElement(element)?.querySelector(SELECTORS.topLevelContainer) ||
	null;

const getCurrentTopLevelControl = (eventTarget, navigationElement) => {
	const topLevelContainer = getTopLevelContainer(navigationElement);
	const currentItem = eventTarget?.closest('.wp-block-navigation-item');

	if (!currentItem || currentItem.parentElement !== topLevelContainer) {
		return null;
	}

	return (
		getTopLevelControlsForItem(currentItem).find(
			(control) =>
				control === eventTarget || control.contains(eventTarget)
		) || null
	);
};

const getTopLevelControls = (element) => {
	const topLevelContainer = getTopLevelContainer(element);

	if (!topLevelContainer) {
		return [];
	}

	return [...topLevelContainer.children].flatMap((item) => {
		if (!(item instanceof Element)) {
			return [];
		}

		return getTopLevelControlsForItem(item);
	});
};

const getMenuItemForSubmenuId = (navigationElement, submenuId) => {
	const toggle = navigationElement.querySelector(
		`[aria-controls="eighteen73-navigation-submenu-${submenuId}"]`
	);

	return toggle?.closest(SELECTORS.menuItemWithChild) || null;
};

const closeSubmenusWithoutFocus = (
	context,
	navigationElement,
	focusedElement
) => {
	[...context.openSubmenus].forEach((submenuId) => {
		const menuItem = getMenuItemForSubmenuId(navigationElement, submenuId);

		if (menuItem && focusedElement && menuItem.contains(focusedElement)) {
			return;
		}

		closeSubmenu(context, submenuId);
	});
};

const getFocusableSubmenuItems = (menuItem) => {
	const submenuElement = getSubmenuElement(menuItem);

	if (!submenuElement) {
		return [];
	}

	return [
		...submenuElement.querySelectorAll(SELECTORS.focusableSubmenuItems),
	].filter(isVisibleElement);
};

const moveFocusInList = (elements, currentElement, step) => {
	if (!elements.length || !currentElement) {
		return false;
	}

	const currentIndex = elements.indexOf(currentElement);

	if (currentIndex === -1) {
		return false;
	}

	const targetElement = elements[currentIndex + step];

	if (!targetElement) {
		return false;
	}

	targetElement.focus();
	return true;
};

const openSubmenu = (context, submenuId, openMode) => {
	ensureContextCollections(context);

	if (!context.openSubmenus.includes(submenuId)) {
		context.openSubmenus = [...context.openSubmenus, submenuId];
	}

	context.openModes[submenuId] = openMode;
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

const activateSubmenuTrap = (context, submenuId, submenuElement) => {
	if (!submenuElement) {
		return;
	}

	if (!context.submenuTraps[submenuId]) {
		context.submenuTraps[submenuId] = createFocusTrap(submenuElement, {
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
				if (context.openModes[submenuId] === CLICK_OPEN_MODE) {
					removeSubmenu(context, submenuId);
					delete context.openModes[submenuId];
				}

				delete context.submenuTraps[submenuId];
			},
		});
	}

	activateWhenReady(submenuElement, context.submenuTraps[submenuId], () => {
		ensureSubmenuFocus(submenuElement);
	});
};

const getSubmenuIdFromMenuItem = (menuItem) => {
	const toggle = getToggleElement(menuItem);
	const controlsId = toggle?.getAttribute('aria-controls');
	const match = controlsId?.match(/-(\d+)$/);

	return match ? Number(match[1]) : null;
};

const isFocusOnToggle = (eventTarget, menuItem) => {
	const toggle = getToggleElement(menuItem);

	return !!(
		toggle &&
		eventTarget &&
		(eventTarget === toggle || toggle.contains(eventTarget))
	);
};

const handleSimpleMenuKeyboard = (event, context, navigationElement) => {
	const eventTarget = event.target instanceof Element ? event.target : null;

	if (!eventTarget) {
		return;
	}

	ensureContextCollections(context);

	const key = event.key;
	const isVertical = isSimpleMenuVertical(navigationElement);
	const topLevelControls = getTopLevelControls(navigationElement);
	const currentTopLevelControl = getCurrentTopLevelControl(
		eventTarget,
		navigationElement
	);
	const submenuPanel = eventTarget.closest(SELECTORS.submenu);
	const parentMenuItemForSubmenu = submenuPanel?.closest(
		SELECTORS.menuItemWithChild
	);
	const isInSubmenu = !!(
		submenuPanel &&
		parentMenuItemForSubmenu &&
		!isFocusOnToggle(eventTarget, parentMenuItemForSubmenu)
	);
	const activeMenuItem = isInSubmenu
		? parentMenuItemForSubmenu
		: eventTarget.closest(SELECTORS.menuItemWithChild);
	const toggle = activeMenuItem ? getToggleElement(activeMenuItem) : null;
	const submenuId = activeMenuItem
		? getSubmenuIdFromMenuItem(activeMenuItem)
		: null;
	const submenuOpen =
		submenuId !== null && context.openSubmenus.includes(submenuId);
	const isOnToggle =
		!!activeMenuItem && isFocusOnToggle(eventTarget, activeMenuItem);
	const hasSubmenu = !!activeMenuItem && !!getSubmenuElement(activeMenuItem);
	const isOnTopLevel =
		!!currentTopLevelControl &&
		topLevelControls.includes(currentTopLevelControl);

	const moveTopLevelFocus = (step) => {
		if (!currentTopLevelControl) {
			return false;
		}

		return moveFocusInList(topLevelControls, currentTopLevelControl, step);
	};

	const openSubmenuFromToggle = () => {
		if (
			!hasSubmenu ||
			!isOnToggle ||
			!activeMenuItem ||
			submenuId === null
		) {
			return false;
		}

		const submenuElement = getSubmenuElement(activeMenuItem);

		if (!submenuElement) {
			return false;
		}

		event.preventDefault();

		if (!submenuOpen) {
			openSubmenu(context, submenuId, KEYBOARD_OPEN_MODE);
		}

		ensureSubmenuFocus(submenuElement);

		return true;
	};

	if (isInSubmenu && activeMenuItem) {
		const focusableSubmenuItems = getFocusableSubmenuItems(activeMenuItem);
		const currentSubmenuItem =
			eventTarget.closest(SELECTORS.focusableSubmenuItems) || null;
		const moveSubmenuFocus = (step) => {
			if (!currentSubmenuItem) {
				return false;
			}

			return moveFocusInList(
				focusableSubmenuItems,
				currentSubmenuItem,
				step
			);
		};

		if (key === 'ArrowLeft' && isVertical) {
			event.preventDefault();
			closeSubmenu(context, submenuId);
			toggle?.focus();
		} else if (key === 'ArrowDown') {
			if (moveSubmenuFocus(1)) {
				event.preventDefault();
			}
		} else if (key === 'ArrowUp') {
			event.preventDefault();

			if (!moveSubmenuFocus(-1)) {
				deactivateTrap(context, submenuId);
				toggle?.focus();
			}
		}

		return;
	}

	if (key === 'ArrowRight') {
		if (isVertical && openSubmenuFromToggle()) {
			return;
		}

		if (!isVertical && isOnTopLevel && moveTopLevelFocus(1)) {
			event.preventDefault();
		}

		return;
	}

	if (key === 'ArrowLeft') {
		if (!isVertical && isOnTopLevel && moveTopLevelFocus(-1)) {
			event.preventDefault();
		}

		return;
	}

	if (key === 'ArrowDown') {
		if (isVertical) {
			if (isOnTopLevel && moveTopLevelFocus(1)) {
				event.preventDefault();
			}

			return;
		}

		if (openSubmenuFromToggle()) {
			return;
		}

		return;
	}

	if (key === 'ArrowUp') {
		if (isVertical && isOnTopLevel && moveTopLevelFocus(-1)) {
			event.preventDefault();
		}
	}
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

			openSubmenu(context, submenuId, HOVER_OPEN_MODE);
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

			if (context.openModes[submenuId] !== HOVER_OPEN_MODE) {
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

			openSubmenu(context, submenuId, CLICK_OPEN_MODE);

			const { ref } = getElement();
			const menuItem = getMenuItemFromElement(ref);
			const submenuElement = getSubmenuElement(menuItem);

			if (!submenuElement) {
				return;
			}

			activateSubmenuTrap(context, submenuId, submenuElement);
		},
		closeSubmenuOnClick: () => {
			const context = getContext();

			ensureContextCollections(context);
			closeSubmenu(context, context.submenuId);
		},
		handleNavKeydown: withSyncEvent((event) => {
			const context = getContext();
			const { ref } = getElement();
			const eventTarget =
				event.target instanceof Element ? event.target : null;
			const key = event.key;

			if (
				!eventTarget ||
				![
					'Escape',
					'ArrowUp',
					'ArrowDown',
					'ArrowLeft',
					'ArrowRight',
				].includes(key)
			) {
				return;
			}

			if (context.menuType !== 'simple') {
				return;
			}

			ensureContextCollections(context);

			if (key === 'Escape') {
				const menuItem = eventTarget.closest(
					SELECTORS.menuItemWithChild
				);

				if (!menuItem) {
					return;
				}

				const submenuId = getSubmenuIdFromMenuItem(menuItem);

				if (
					submenuId === null ||
					!context.openSubmenus.includes(submenuId)
				) {
					return;
				}

				event.preventDefault();
				closeSubmenu(context, submenuId);
				getToggleElement(menuItem)?.focus();
				return;
			}

			handleSimpleMenuKeyboard(event, context, ref);
		}),
		handleNavFocusOut: (event) => {
			const context = getContext();

			if (context.menuType !== 'simple') {
				return;
			}

			const { ref } = getElement();
			const nextFocusedElement = event.relatedTarget;

			ensureContextCollections(context);

			closeSubmenusWithoutFocus(context, ref, nextFocusedElement);
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
				context.openSubmenus.includes(context.submenuId)
			);
		},
	},
});
