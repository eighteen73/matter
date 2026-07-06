/**
 * Edge detection and placement for simple navigation submenus.
 */

export const SUBMENU_SELECTOR = '.wp-block-matter-navigation__submenu';
export const MENU_ITEM_WITH_CHILD_SELECTOR =
	'.wp-block-navigation-item.has-child';
export const NAVIGATION_SELECTOR = '.wp-block-matter-navigation';

export const PLACEMENT_CLASSES = {
	positioned: 'is-submenu-positioned',
	flippedInline: 'is-submenu-flipped-inline',
	scrollableBlock: 'is-submenu-scrollable-block',
};

export const OFFSET_PROPERTIES = {
	x: '--matter-navigation--submenu-offset-x',
	y: '--matter-navigation--submenu-offset-y',
};

export const SIZE_PROPERTIES = {
	maxBlockSize: '--matter-navigation--submenu-max-block-size',
};

const DEFAULT_BOUNDARY_PADDING = 8;

const isClippingOverflow = (value) =>
	value === 'hidden' ||
	value === 'clip' ||
	value === 'scroll' ||
	value === 'auto';

const intersectRects = (firstRect, secondRect) => {
	const top = Math.max(firstRect.top, secondRect.top);
	const left = Math.max(firstRect.left, secondRect.left);
	const right = Math.min(firstRect.right, secondRect.right);
	const bottom = Math.min(firstRect.bottom, secondRect.bottom);

	return {
		top,
		left,
		right,
		bottom,
		width: Math.max(0, right - left),
		height: Math.max(0, bottom - top),
	};
};

const getViewportRect = () => ({
	top: 0,
	left: 0,
	right: document.documentElement.clientWidth,
	bottom: document.documentElement.clientHeight,
	width: document.documentElement.clientWidth,
	height: document.documentElement.clientHeight,
});

const getOverflowAmounts = (
	rect,
	boundary,
	padding = DEFAULT_BOUNDARY_PADDING
) => ({
	top: boundary.top + padding - rect.top,
	right: rect.right - (boundary.right - padding),
	bottom: rect.bottom - (boundary.bottom - padding),
	left: boundary.left + padding - rect.left,
});

const getClippingParents = (element) => {
	const parents = [];
	let current = element?.parentElement;

	while (current) {
		const style = window.getComputedStyle(current);

		if (
			isClippingOverflow(style.overflow) ||
			isClippingOverflow(style.overflowX) ||
			isClippingOverflow(style.overflowY)
		) {
			parents.push(current);
		}

		current = current.parentElement;
	}

	return parents;
};

export const getSubmenuElement = (menuItem) =>
	menuItem?.querySelector(SUBMENU_SELECTOR) || null;

export const getBoundaryRect = (
	element,
	padding = DEFAULT_BOUNDARY_PADDING
) => {
	let boundary = getViewportRect();

	getClippingParents(element).forEach((parent) => {
		boundary = intersectRects(boundary, parent.getBoundingClientRect());
	});

	if (padding) {
		boundary = {
			...boundary,
			top: boundary.top + padding,
			left: boundary.left + padding,
			right: boundary.right - padding,
			bottom: boundary.bottom - padding,
			width: Math.max(0, boundary.width - padding * 2),
			height: Math.max(0, boundary.height - padding * 2),
		};
	}

	return boundary;
};

export const getSubmenuPlacementMode = (menuItem, navigationElement) => {
	const isVertical = navigationElement.classList.contains('is-vertical');
	const isNested = !!menuItem.closest(SUBMENU_SELECTOR);

	if (isNested || isVertical) {
		return 'inline-flyout';
	}

	return 'dropdown';
};

export const resetSubmenuPlacement = (submenuElement) => {
	if (!submenuElement) {
		return;
	}

	Object.values(PLACEMENT_CLASSES).forEach((className) => {
		submenuElement.classList.remove(className);
	});

	submenuElement.style.removeProperty(OFFSET_PROPERTIES.x);
	submenuElement.style.removeProperty(OFFSET_PROPERTIES.y);
	submenuElement.style.removeProperty(SIZE_PROPERTIES.maxBlockSize);
};

const setOffset = (submenuElement, offsetX, offsetY) => {
	if (offsetX) {
		submenuElement.style.setProperty(OFFSET_PROPERTIES.x, `${offsetX}px`);
	} else {
		submenuElement.style.removeProperty(OFFSET_PROPERTIES.x);
	}

	if (offsetY) {
		submenuElement.style.setProperty(OFFSET_PROPERTIES.y, `${offsetY}px`);
	} else {
		submenuElement.style.removeProperty(OFFSET_PROPERTIES.y);
	}
};

const measureSubmenuRect = (submenuElement) =>
	submenuElement.getBoundingClientRect();

const applyPlacementState = (
	submenuElement,
	{ flippedInline = false } = {}
) => {
	submenuElement.classList.toggle(
		PLACEMENT_CLASSES.flippedInline,
		flippedInline
	);
	submenuElement.classList.add(PLACEMENT_CLASSES.positioned);
};

const resolveFlipState = (placementMode, overflow, boundary, menuItemRect) => {
	let flippedInline = false;

	if (placementMode === 'dropdown') {
		if (overflow.right > 0 && overflow.left <= 0) {
			flippedInline = true;
		}
	} else if (overflow.right > 0) {
		const spaceInlineEnd = boundary.right - menuItemRect.right;
		const spaceInlineStart = menuItemRect.left - boundary.left;

		if (spaceInlineStart > spaceInlineEnd) {
			flippedInline = true;
		}
	}

	return { flippedInline };
};

const resolveNudgeOffsets = (submenuRect, boundary) => {
	const minLeft = boundary.left;
	const maxLeft = boundary.right - submenuRect.width;
	const minTop = boundary.top;
	const targetLeft =
		maxLeft < minLeft
			? minLeft
			: Math.min(Math.max(submenuRect.left, minLeft), maxLeft);
	const offsetX = targetLeft - submenuRect.left;
	const offsetY = submenuRect.top < minTop ? minTop - submenuRect.top : 0;

	return { offsetX, offsetY };
};

const setMaxBlockSize = (submenuElement, submenuRect, boundary, offsetY) => {
	const availableBlockSize = Math.max(
		0,
		boundary.bottom - (submenuRect.top + offsetY)
	);
	const isScrollable = availableBlockSize < submenuRect.height;

	submenuElement.classList.toggle(
		PLACEMENT_CLASSES.scrollableBlock,
		isScrollable
	);

	if (isScrollable) {
		submenuElement.style.setProperty(
			SIZE_PROPERTIES.maxBlockSize,
			`${availableBlockSize}px`
		);
		return;
	}

	submenuElement.style.removeProperty(SIZE_PROPERTIES.maxBlockSize);
};

export const positionSubmenu = (menuItem, navigationElement) => {
	const submenuElement = getSubmenuElement(menuItem);

	if (
		!submenuElement ||
		!navigationElement?.classList.contains('is-menu-type-simple')
	) {
		return;
	}

	resetSubmenuPlacement(submenuElement);

	const placementMode = getSubmenuPlacementMode(menuItem, navigationElement);
	const boundary = getBoundaryRect(submenuElement);
	const menuItemRect = menuItem.getBoundingClientRect();
	let submenuRect = measureSubmenuRect(submenuElement);
	let overflow = getOverflowAmounts(submenuRect, boundary);

	const flipState = resolveFlipState(
		placementMode,
		overflow,
		boundary,
		menuItemRect
	);

	applyPlacementState(submenuElement, flipState);

	submenuRect = measureSubmenuRect(submenuElement);
	overflow = getOverflowAmounts(submenuRect, boundary);

	const { offsetX, offsetY } = resolveNudgeOffsets(submenuRect, boundary);

	setOffset(submenuElement, offsetX, offsetY);
	setMaxBlockSize(submenuElement, submenuRect, boundary, offsetY);
};

export const waitForSubmenuVisible = (submenuElement) =>
	new Promise((resolve, reject) => {
		const timeoutAt = window.performance.now() + 1000;

		const checkVisibility = () => {
			if (!submenuElement?.isConnected) {
				reject(
					new Error('Submenu disconnected before visibility check')
				);
				return;
			}

			const style = window.getComputedStyle(submenuElement);

			// Simple submenus can be intentionally hidden until their measured
			// placement is applied, but they still need to be measurable.
			if (
				style.display !== 'none' &&
				submenuElement.getClientRects().length > 0
			) {
				resolve();
				return;
			}

			if (window.performance.now() >= timeoutAt) {
				reject(new Error('Timed out waiting for submenu visibility'));
				return;
			}

			window.requestAnimationFrame(checkVisibility);
		};

		checkVisibility();
	});

const positionWatchers = new WeakMap();

const getScrollableAncestors = (element) => {
	const ancestors = [];
	let current = element?.parentElement;

	while (current) {
		const style = window.getComputedStyle(current);

		if (
			isClippingOverflow(style.overflow) ||
			isClippingOverflow(style.overflowY) ||
			isClippingOverflow(style.overflowX)
		) {
			ancestors.push(current);
		}

		current = current.parentElement;
	}

	return ancestors;
};

export const scheduleSubmenuPositioning = (menuItem, navigationElement) => {
	const submenuElement = getSubmenuElement(menuItem);

	if (
		!submenuElement ||
		!navigationElement?.classList.contains('is-menu-type-simple')
	) {
		return;
	}

	clearSubmenuPositioning(menuItem);
	positionSubmenu(menuItem, navigationElement);

	const runPositioning = () => {
		window.requestAnimationFrame(() => {
			positionSubmenu(menuItem, navigationElement);
		});
	};

	const handleUpdate = () => {
		if (!menuItem.classList.contains('has-open-submenu')) {
			return;
		}

		runPositioning();
	};

	const scrollTargets = [window, ...getScrollableAncestors(submenuElement)];

	scrollTargets.forEach((target) => {
		target.addEventListener('scroll', handleUpdate, {
			capture: true,
			passive: true,
		});
	});

	window.addEventListener('resize', handleUpdate, { passive: true });
	window.addEventListener('orientationchange', handleUpdate, {
		passive: true,
	});

	positionWatchers.set(menuItem, () => {
		scrollTargets.forEach((target) => {
			target.removeEventListener('scroll', handleUpdate, true);
		});
		window.removeEventListener('resize', handleUpdate);
		window.removeEventListener('orientationchange', handleUpdate);
	});
};

export const clearSubmenuPositioning = (menuItem) => {
	const cleanup = positionWatchers.get(menuItem);

	if (cleanup) {
		cleanup();
		positionWatchers.delete(menuItem);
	}

	resetSubmenuPlacement(getSubmenuElement(menuItem));
};

export const repositionOpenSimpleSubmenus = (navigationElement) => {
	if (!navigationElement?.classList.contains('is-menu-type-simple')) {
		return;
	}

	navigationElement
		.querySelectorAll(`${MENU_ITEM_WITH_CHILD_SELECTOR}.has-open-submenu`)
		.forEach((menuItem) => {
			positionSubmenu(menuItem, navigationElement);
		});
};
