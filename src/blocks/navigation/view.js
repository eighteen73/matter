/* global Element */
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

const CLICK_OPEN_MODE = 'click';
const HOVER_OPEN_MODE = 'hover';
const NEXT_KEYS = ['ArrowDown', 'ArrowRight'];
const PREV_KEYS = ['ArrowUp', 'ArrowLeft'];

const isNextKey = (key) => NEXT_KEYS.includes(key);
const isPrevKey = (key) => PREV_KEYS.includes(key);

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

const getSubmenuElement = (menuItem) =>
	menuItem?.querySelector(SELECTORS.submenu) || null;

const getToggleElement = (menuItem) =>
	menuItem?.querySelector(SELECTORS.toggle) || null;

const getNavigationElement = (element) =>
	element?.closest(SELECTORS.navigation) || null;

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

const waitForElementVisible = (element) =>
	new Promise((resolve) => {
		const checkElementVisibility = () => {
			if (isVisibleElement(element)) {
				resolve();
				return;
			}

			window.requestAnimationFrame(checkElementVisibility);
		};

		checkElementVisibility();
	});

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

const activateDrillDownSubmenuTrap = (context, submenuId, menuItem) => {
	const submenuElement = getSubmenuElement(menuItem);

	if (!submenuElement) {
		return;
	}

	if (!submenuElement.hasAttribute('tabindex')) {
		submenuElement.setAttribute('tabindex', '-1');
	}

	if (!context.submenuTraps[submenuId]) {
		context.submenuTraps[submenuId] = createFocusTrap(submenuElement, {
			allowOutsideClick: true,
			escapeDeactivates: false,
			returnFocusOnDeactivate: true,
			initialFocus: () =>
				getFocusableSubmenuItems(menuItem)[0] || submenuElement,
			fallbackFocus: submenuElement,
			checkCanFocusTrap: () => waitForElementVisible(submenuElement),
			onDeactivate: () => {
				removeSubmenu(context, submenuId);
				delete context.openModes[submenuId];
				delete context.submenuTraps[submenuId];
			},
		});
	}

	context.submenuTraps[submenuId].activate();
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

const handleSubmenuEscapeKey = (event, context, navigationElement) => {
	const eventTarget = event.target instanceof Element ? event.target : null;

	if (!eventTarget || !navigationElement) {
		return false;
	}

	const containingMenuItems = [
		...navigationElement.querySelectorAll(SELECTORS.menuItemWithChild),
	].filter((item) => item.contains(eventTarget));
	const menuItem =
		[...containingMenuItems].reverse().find((item) => {
			const itemSubmenuId = getSubmenuIdFromMenuItem(item);

			return (
				itemSubmenuId !== null &&
				context.openSubmenus.includes(itemSubmenuId)
			);
		}) || eventTarget.closest(SELECTORS.menuItemWithChild);

	if (!menuItem) {
		return false;
	}

	const submenuId = getSubmenuIdFromMenuItem(menuItem);

	if (submenuId === null || !context.openSubmenus.includes(submenuId)) {
		return false;
	}

	event.preventDefault();
	closeSubmenu(context, submenuId);
	getToggleElement(menuItem)?.focus();

	return true;
};

const handleSimpleMenuKeyboard = (event, context, navigationElement) => {
	const eventTarget = event.target instanceof Element ? event.target : null;

	if (!eventTarget) {
		return;
	}

	ensureContextCollections(context);

	const key = event.key;
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
	const isOnTopLevel =
		!!currentTopLevelControl &&
		topLevelControls.includes(currentTopLevelControl);

	const moveTopLevelFocus = (step) => {
		if (!currentTopLevelControl) {
			return false;
		}

		return moveFocusInList(topLevelControls, currentTopLevelControl, step);
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

		if (isNextKey(key)) {
			event.preventDefault();
			moveSubmenuFocus(1);
		} else if (isPrevKey(key)) {
			event.preventDefault();
			moveSubmenuFocus(-1);
		} else if (key === 'Home') {
			if (focusableSubmenuItems.length) {
				event.preventDefault();
				focusableSubmenuItems[0]?.focus();
			}
		} else if (key === 'End') {
			if (focusableSubmenuItems.length) {
				event.preventDefault();
				focusableSubmenuItems[
					focusableSubmenuItems.length - 1
				]?.focus();
			}
		}

		return;
	}

	if (isOnTopLevel) {
		if (isNextKey(key) && moveTopLevelFocus(1)) {
			event.preventDefault();
			return;
		}

		if (isPrevKey(key) && moveTopLevelFocus(-1)) {
			event.preventDefault();
			return;
		}

		if (key === 'Home' && topLevelControls.length) {
			event.preventDefault();
			topLevelControls[0]?.focus();
			return;
		}

		if (key === 'End' && topLevelControls.length) {
			event.preventDefault();
			topLevelControls[topLevelControls.length - 1]?.focus();
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
			const { ref } = getElement();
			const menuItem =
				ref instanceof Element
					? ref.closest(SELECTORS.menuItemWithChild)
					: null;

			ensureContextCollections(context);

			if (context.openSubmenus.includes(submenuId)) {
				closeSubmenu(context, submenuId);
				return;
			}

			openSubmenu(context, submenuId, CLICK_OPEN_MODE);

			if ('drill-down' === context.menuType && menuItem) {
				activateDrillDownSubmenuTrap(context, submenuId, menuItem);
			}
		},
		closeSubmenuOnClick: () => {
			const context = getContext();

			ensureContextCollections(context);
			closeSubmenu(context, context.submenuId);
		},
		handleNavKeydown: withSyncEvent((event) => {
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
					'Home',
					'End',
				].includes(key)
			) {
				return;
			}

			const context = getContext();

			ensureContextCollections(context);

			if (key === 'Escape') {
				handleSubmenuEscapeKey(
					event,
					context,
					getNavigationElement(eventTarget)
				);
				return;
			}

			if (context.menuType !== 'simple') {
				return;
			}

			const { ref } = getElement();
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
