import {
	store,
	getContext,
	getElement,
	withSyncEvent,
} from '@wordpress/interactivity';
import { createFocusTrap } from 'focus-trap';

const SELECTORS = {
	navigation: '.wp-block-matter-navigation',
	menuItemWithChild: '.wp-block-navigation-item.has-child',
	topLevelContainer: '.wp-block-matter-navigation__container',
	toggle: '.wp-block-matter-navigation__submenu-toggle',
	submenu: '.wp-block-matter-navigation__submenu',
	focusableSubmenuItems:
		'.wp-block-navigation-item__content, .wp-block-matter-navigation__back, .wp-block-matter-navigation__view-all, .wp-block-matter-navigation__submenu-toggle',
	directSubmenuFocusableItems:
		':scope > .wp-block-matter-navigation__submenu-header > .wp-block-matter-navigation__back, :scope > .wp-block-matter-navigation__submenu-header > .wp-block-matter-navigation__view-all, :scope > .wp-block-navigation__submenu-items > .wp-block-navigation-item > .wp-block-navigation-item__content, :scope > .wp-block-navigation__submenu-items > .wp-block-navigation-item > .wp-block-matter-navigation__submenu-toggle',
};

const CLICK_OPEN_MODE = 'click';
const HOVER_OPEN_MODE = 'hover';
const NEXT_KEYS = ['ArrowDown', 'ArrowRight'];
const PREV_KEYS = ['ArrowUp', 'ArrowLeft'];
const NAV_KEYS = new Set([
	'Escape',
	'ArrowUp',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'Home',
	'End',
]);
const hasTouchSupport =
	'ontouchstart' in window ||
	window.navigator.maxTouchPoints > 0 ||
	window.navigator.msMaxTouchPoints > 0;
const submenuTrapMap = new WeakMap();
const submenuTrapOwners = new Map();

const isNextKey = (key) => NEXT_KEYS.includes(key);
const isPrevKey = (key) => PREV_KEYS.includes(key);

const isVisibleElement = (element) => {
	if (!element) {
		return false;
	}

	if (typeof element.checkVisibility === 'function') {
		return element.checkVisibility({
			checkVisibilityCSS: true,
			checkOpacity: false,
		});
	}

	const style = window.getComputedStyle(element);
	if (style.display === 'none' || style.visibility === 'hidden') {
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

const getEventTargetElement = (event) =>
	event?.target && event.target.nodeType === 1 ? event.target : null;

const getTopLevelLink = (item) =>
	[...item.children].find(
		(child) =>
			child.nodeType === 1 &&
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

	return [...topLevelContainer.children].flatMap((item) =>
		getTopLevelControlsForItem(item)
	);
};

const getMenuItemForSubmenuId = (navigationElement, submenuId) => {
	const toggle = navigationElement.querySelector(
		`[aria-controls="matter-navigation-submenu-${submenuId}"]`
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

		closeSubmenu(context, submenuId, menuItem);
	});
};

const getFocusableSubmenuItems = (menuItem) => {
	const submenuElement = getSubmenuElement(menuItem);

	if (!submenuElement) {
		return [];
	}

	return [
		...submenuElement.querySelectorAll(
			SELECTORS.directSubmenuFocusableItems
		),
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
	if (!context.openSubmenus.includes(submenuId)) {
		context.openSubmenus = [...context.openSubmenus, submenuId];
	}

	context.openModes[submenuId] = openMode;
};

const removeSubmenu = (context, submenuId) => {
	context.openSubmenus = context.openSubmenus.filter(
		(id) => id !== submenuId
	);
};

const waitForElementVisible = (element) =>
	new Promise((resolve, reject) => {
		const timeoutAt = window.performance.now() + 1000;

		const checkElementVisibility = () => {
			if (!element.isConnected) {
				reject(
					new Error('Element disconnected before visibility check')
				);
				return;
			}

			if (isVisibleElement(element)) {
				resolve();
				return;
			}

			if (window.performance.now() >= timeoutAt) {
				reject(new Error('Timed out waiting for submenu visibility'));
				return;
			}

			window.requestAnimationFrame(checkElementVisibility);
		};

		checkElementVisibility();
	});

const deactivateTrap = (submenuId) => {
	const menuItem = submenuTrapOwners.get(submenuId);

	if (!menuItem) {
		return;
	}

	const trap = submenuTrapMap.get(menuItem);

	if (!trap) {
		submenuTrapOwners.delete(submenuId);
		return;
	}

	trap.deactivate();
	submenuTrapMap.delete(menuItem);
	submenuTrapOwners.delete(submenuId);
};

const getSubmenuIdFromMenuItem = (menuItem) => {
	const toggle = getToggleElement(menuItem);
	const controlsId = toggle?.getAttribute('aria-controls');
	const match = controlsId?.match(/-(\d+)$/);

	return match ? Number(match[1]) : null;
};

const getDescendantSubmenuIds = (menuItem) => {
	const submenuElement = getSubmenuElement(menuItem);

	if (!submenuElement) {
		return [];
	}

	return [...submenuElement.querySelectorAll(SELECTORS.menuItemWithChild)]
		.map(getSubmenuIdFromMenuItem)
		.filter((id) => id !== null);
};

const closeSubmenu = (context, submenuId, menuItem = null) => {
	const resolvedMenuItem =
		menuItem ||
		submenuTrapOwners.get(submenuId) ||
		document
			.getElementById(`matter-navigation-submenu-${submenuId}`)
			?.closest(SELECTORS.menuItemWithChild) ||
		null;

	const descendantIds = resolvedMenuItem
		? getDescendantSubmenuIds(resolvedMenuItem)
		: [];

	[...descendantIds].reverse().forEach((id) => {
		deactivateTrap(id);
		removeSubmenu(context, id);
		delete context.openModes[id];
	});

	deactivateTrap(submenuId);
	removeSubmenu(context, submenuId);
	delete context.openModes[submenuId];
};

const activateDrillDownSubmenuTrap = (context, submenuId, menuItem) => {
	const submenuElement = getSubmenuElement(menuItem);

	if (!submenuElement) {
		return;
	}

	let trap = submenuTrapMap.get(menuItem);

	if (!trap) {
		trap = createFocusTrap(submenuElement, {
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
				submenuTrapMap.delete(menuItem);
				submenuTrapOwners.delete(submenuId);
			},
		});

		submenuTrapMap.set(menuItem, trap);
		submenuTrapOwners.set(submenuId, menuItem);
	}

	trap.activate();
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
	const eventTarget = getEventTargetElement(event);

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

	// Close the innermost open submenu first for nested structures.
	event.preventDefault();
	event.stopPropagation();
	closeSubmenu(context, submenuId, menuItem);
	getToggleElement(menuItem)?.focus();

	return true;
};

const handleArrowKeyboard = (event, context, navigationElement) => {
	const eventTarget = getEventTargetElement(event);

	if (!eventTarget) {
		return;
	}

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

const { state } = store(
	'matter/navigation',
	{
		state: {
			get isTouchEnabled() {
				return hasTouchSupport;
			},
			get isSubmenuOpen() {
				const context = getContext();

				return context.openSubmenus.includes(context.submenuId);
			},
		},
		actions: {
			openSubmenuOnHover: () => {
				const context = getContext();

				if (
					context.menuType !== 'simple' ||
					context.submenuOpensOnClick ||
					state.isTouchEnabled
				) {
					return;
				}

				const submenuId = context.submenuId;

				openSubmenu(context, submenuId, HOVER_OPEN_MODE);
			},
			closeSubmenuOnHover: () => {
				const context = getContext();
				const submenuId = context.submenuId;
				const { ref } = getElement();
				const menuItem =
					ref?.nodeType === 1
						? ref.closest(SELECTORS.menuItemWithChild)
						: null;

				if (
					context.menuType !== 'simple' ||
					context.submenuOpensOnClick ||
					state.isTouchEnabled
				) {
					return;
				}

				if (context.openModes[submenuId] !== HOVER_OPEN_MODE) {
					return;
				}

				closeSubmenu(context, submenuId, menuItem);
			},
			toggleSubmenuOnClick: () => {
				const context = getContext();
				const submenuId = context.submenuId;
				const { ref } = getElement();
				const menuItem =
					ref?.nodeType === 1
						? ref.closest(SELECTORS.menuItemWithChild)
						: null;

				if (context.openSubmenus.includes(submenuId)) {
					closeSubmenu(context, submenuId, menuItem);
					return;
				}

				openSubmenu(context, submenuId, CLICK_OPEN_MODE);

				if ('drill-down' === context.menuType && menuItem) {
					activateDrillDownSubmenuTrap(context, submenuId, menuItem);
				}
			},
			closeSubmenuOnClick: () => {
				const context = getContext();
				const { ref } = getElement();
				const menuItem =
					ref?.nodeType === 1
						? ref.closest(SELECTORS.menuItemWithChild)
						: null;

				closeSubmenu(context, context.submenuId, menuItem);
			},
			handleNavKeydown: withSyncEvent((event) => {
				const eventTarget = getEventTargetElement(event);
				const key = event.key;

				if (!eventTarget || !NAV_KEYS.has(key)) {
					return;
				}

				const context = getContext();

				if (key === 'Escape') {
					handleSubmenuEscapeKey(
						event,
						context,
						getNavigationElement(eventTarget)
					);
					return;
				}

				const { ref } = getElement();
				handleArrowKeyboard(event, context, ref);
			}),
			handleNavFocusOut: (event) => {
				const context = getContext();

				if (context.menuType !== 'simple') {
					return;
				}

				const { ref } = getElement();
				const nextFocusedElement = event.relatedTarget;

				closeSubmenusWithoutFocus(context, ref, nextFocusedElement);
			},
		},
	},
	{ lock: true }
);

// Safari iOS/iPadOS requires a document click listener for reliable focusout.
document.addEventListener('click', () => {});
