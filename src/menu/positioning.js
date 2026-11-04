/**
 * Edge-aware placement for dropdown submenus.
 *
 * Flips flyouts that would overflow the inline end, nudges panels back inside
 * the viewport (or clipping ancestors), caps their height so long menus scroll,
 * and centres megamenus on their parent item or the viewport.
 */

const SUBMENU = '.matter-menu__submenu';

const CLASSES = {
	positioned: 'is-positioned',
	flipped: 'is-flipped',
	scrollable: 'is-scrollable',
};

const PROPERTIES = {
	x: '--matter-menu--offset-x',
	y: '--matter-menu--offset-y',
	maxHeight: '--matter-menu--max-height',
	megamenuWidth: '--matter-menu--megamenu-width',
};

const BOUNDARY_PADDING = 8;

const watchers = new WeakMap();

const isClipping = (value) =>
	['hidden', 'clip', 'scroll', 'auto'].includes(value);

const getClippingAncestors = (element) => {
	const ancestors = [];
	let current = element?.parentElement;

	while (current) {
		const style = window.getComputedStyle(current);

		if (
			isClipping(style.overflow) ||
			isClipping(style.overflowX) ||
			isClipping(style.overflowY)
		) {
			ancestors.push(current);
		}

		current = current.parentElement;
	}

	return ancestors;
};

const getViewportRect = () => {
	const { clientWidth: width, clientHeight: height } =
		document.documentElement;

	return { top: 0, left: 0, right: width, bottom: height, width, height };
};

const getBoundary = (element) => {
	let rect = getViewportRect();

	getClippingAncestors(element).forEach((ancestor) => {
		const ancestorRect = ancestor.getBoundingClientRect();
		const top = Math.max(rect.top, ancestorRect.top);
		const left = Math.max(rect.left, ancestorRect.left);
		const right = Math.min(rect.right, ancestorRect.right);
		const bottom = Math.min(rect.bottom, ancestorRect.bottom);

		rect = { top, left, right, bottom };
	});

	return {
		top: rect.top + BOUNDARY_PADDING,
		left: rect.left + BOUNDARY_PADDING,
		right: rect.right - BOUNDARY_PADDING,
		bottom: rect.bottom - BOUNDARY_PADDING,
	};
};

const clamp = (value, min, max) =>
	max < min ? min : Math.min(Math.max(value, min), max);

const reset = (submenu) => {
	Object.values(CLASSES).forEach((className) =>
		submenu.classList.remove(className)
	);
	Object.values(PROPERTIES).forEach((property) =>
		submenu.style.removeProperty(property)
	);
};

const setOffset = (submenu, x, y) => {
	submenu.style.setProperty(PROPERTIES.x, `${x}px`);
	submenu.style.setProperty(PROPERTIES.y, `${y}px`);
};

const capHeight = (submenu, rect, boundary, offsetY) => {
	const available = Math.max(0, boundary.bottom - (rect.top + offsetY));
	const scrollable = available < rect.height;

	submenu.classList.toggle(CLASSES.scrollable, scrollable);

	if (scrollable) {
		submenu.style.setProperty(PROPERTIES.maxHeight, `${available}px`);
	}
};

/**
 * Position one open submenu.
 *
 * @param {Element} item       Menu item owning the submenu.
 * @param {Element} navigation The menu's <nav>.
 */
export const positionSubmenu = (item, navigation) => {
	const submenu = item.querySelector(SUBMENU);

	if (!submenu) {
		return;
	}

	reset(submenu);

	const boundary = getBoundary(submenu);
	const isMegamenu = item.classList.contains('is-megamenu');

	if (isMegamenu) {
		const viewport = getViewportRect();
		const isFull = item.classList.contains('is-megamenu-full');

		if (isFull) {
			submenu.style.setProperty(
				PROPERTIES.megamenuWidth,
				`${viewport.width}px`
			);
		}

		submenu.classList.add(CLASSES.positioned);

		const rect = submenu.getBoundingClientRect();
		const itemRect = item.getBoundingClientRect();
		const centre = item.classList.contains('is-megamenu-content')
			? itemRect.left + itemRect.width / 2
			: viewport.width / 2;
		const left = isFull
			? 0
			: clamp(
					centre - rect.width / 2,
					boundary.left,
					boundary.right - rect.width
				);
		const offsetY = rect.top < boundary.top ? boundary.top - rect.top : 0;

		setOffset(submenu, left - rect.left, offsetY);
		capHeight(submenu, rect, boundary, offsetY);
		return;
	}

	const isFlyout =
		navigation.classList.contains('is-vertical') ||
		!!item.parentElement?.closest(SUBMENU);

	let rect = submenu.getBoundingClientRect();

	if (rect.right > boundary.right) {
		const itemRect = item.getBoundingClientRect();
		const roomStart = itemRect.left - boundary.left;
		const roomEnd = boundary.right - itemRect.right;

		if (!isFlyout || roomStart > roomEnd) {
			submenu.classList.add(CLASSES.flipped);
		}
	}

	submenu.classList.add(CLASSES.positioned);
	rect = submenu.getBoundingClientRect();

	const left = clamp(rect.left, boundary.left, boundary.right - rect.width);
	const offsetY = rect.top < boundary.top ? boundary.top - rect.top : 0;

	setOffset(submenu, left - rect.left, offsetY);
	capHeight(submenu, rect, boundary, offsetY);
};

/**
 * Position a submenu and keep it positioned while it's open.
 *
 * @param {Element} item       Menu item owning the submenu.
 * @param {Element} navigation The menu's <nav>.
 */
export const watchSubmenu = (item, navigation) => {
	const submenu = item.querySelector(SUBMENU);

	if (!submenu) {
		return;
	}

	unwatchSubmenu(item);
	positionSubmenu(item, navigation);

	const update = () =>
		window.requestAnimationFrame(() => positionSubmenu(item, navigation));
	const targets = [window, ...getClippingAncestors(submenu)];

	targets.forEach((target) =>
		target.addEventListener('scroll', update, {
			capture: true,
			passive: true,
		})
	);
	window.addEventListener('resize', update, { passive: true });

	watchers.set(item, () => {
		targets.forEach((target) =>
			target.removeEventListener('scroll', update, { capture: true })
		);
		window.removeEventListener('resize', update);
	});
};

/**
 * Stop watching a submenu and clear its placement.
 *
 * @param {Element} item Menu item owning the submenu.
 */
export const unwatchSubmenu = (item) => {
	watchers.get(item)?.();
	watchers.delete(item);

	const submenu = item?.querySelector(SUBMENU);

	if (submenu) {
		reset(submenu);
	}
};
