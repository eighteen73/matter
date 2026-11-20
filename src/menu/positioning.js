/**
 * Edge-aware placement for dropdown submenus.
 *
 * Flips flyouts that would overflow the inline end (the right edge in
 * left-to-right languages, the left in right-to-left), nudges panels back inside
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
	x: '--menu-offset-x',
	y: '--menu-offset-y',
	maxHeight: '--menu-max-height',
	megamenuWidth: '--menu-megamenu-width',
	maxWidth: '--menu-max-width',
};

// Closed submenus aren't displayed (so they never widen the page); this class
// displays one while it's measured.
const MEASURING = 'is-measuring';

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

const getBoundary = (ancestors) => {
	let rect = getViewportRect();

	ancestors.forEach((ancestor) => {
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

// Placement is cleared to measure the submenu where the stylesheet puts it. A
// submenu that is already showing keeps `is-positioned` while it's measured
// again: dropping it would restart its fade (the measuring forces a style
// recalculation), and the panel would flicker on every scroll.
const reset = (submenu, keepPositioned = false) => {
	Object.values(CLASSES).forEach((className) => {
		if (!keepPositioned || className !== CLASSES.positioned) {
			submenu.classList.remove(className);
		}
	});
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
 * @param {Element}   item        Menu item owning the submenu.
 * @param {Element}   navigation  The menu's <nav>.
 * @param {Element[]} [ancestors] The submenu's clipping ancestors, if already known.
 */
export const positionSubmenu = (item, navigation, ancestors) => {
	const submenu = item.querySelector(SUBMENU);

	if (!submenu) {
		return;
	}

	reset(submenu, submenu.classList.contains(CLASSES.positioned));
	submenu.classList.add(MEASURING);

	const boundary = getBoundary(ancestors ?? getClippingAncestors(submenu));
	const isMegamenu = item.classList.contains('is-megamenu');

	if (isMegamenu) {
		const viewport = getViewportRect();
		const isFull = item.classList.contains('is-megamenu-full');

		if (isFull) {
			submenu.style.setProperty(
				PROPERTIES.megamenuWidth,
				`${viewport.width}px`
			);
		} else {
			// The visible width (100vw would include the scrollbar).
			submenu.style.setProperty(
				PROPERTIES.maxWidth,
				`${boundary.right - boundary.left}px`
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
		submenu.classList.remove(MEASURING);
		return;
	}

	const isFlyout =
		navigation.classList.contains('is-vertical') ||
		!!item.parentElement?.closest(SUBMENU);

	let rect = submenu.getBoundingClientRect();

	// A submenu extends towards the inline end: right in left-to-right
	// languages, left in right-to-left, so that is the edge it overflows.
	const isRtl = window.getComputedStyle(submenu).direction === 'rtl';
	const overflows = isRtl
		? rect.left < boundary.left
		: rect.right > boundary.right;

	if (overflows) {
		const itemRect = item.getBoundingClientRect();
		const roomLeft = itemRect.left - boundary.left;
		const roomRight = boundary.right - itemRect.right;
		const roomEnd = isRtl ? roomLeft : roomRight;
		const roomStart = isRtl ? roomRight : roomLeft;

		if (!isFlyout || roomStart > roomEnd) {
			submenu.classList.add(CLASSES.flipped);
		}
	}

	submenu.classList.add(CLASSES.positioned);
	rect = submenu.getBoundingClientRect();

	// A nested submenu lines its first item up with the item that opened it.
	const shiftY = item.parentElement?.closest(SUBMENU)
		? -(parseFloat(window.getComputedStyle(submenu).paddingTop) || 0)
		: 0;
	const top = rect.top + shiftY;
	const left = clamp(rect.left, boundary.left, boundary.right - rect.width);
	const offsetY = shiftY + (top < boundary.top ? boundary.top - top : 0);

	setOffset(submenu, left - rect.left, offsetY);
	capHeight(submenu, rect, boundary, offsetY);
	submenu.classList.remove(MEASURING);
};

/**
 * What a placement depends on, besides the clipping ancestors (found once,
 * when the submenu opens): where the item is, and the size of the viewport.
 *
 * @param {Element} item Menu item owning the submenu.
 * @return {string} A value that changes when the placement may need to change.
 */
const getSignature = (item) => {
	const { left, top, width, height } = item.getBoundingClientRect();
	const { clientWidth, clientHeight } = document.documentElement;

	return [left, top, width, height, clientWidth, clientHeight].join();
};

/**
 * Position a submenu and keep it positioned while it's open.
 *
 * The clipping ancestors are found once, on opening. Scrolling and resizing
 * then measure the item alone, and the submenu is placed again only when the
 * item has moved or the viewport has changed size (a sticky header's menu
 * doesn't move while the page scrolls).
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

	const ancestors = getClippingAncestors(submenu);
	let signature = getSignature(item);
	let frame = 0;

	positionSubmenu(item, navigation, ancestors);

	const measure = () => {
		frame = 0;

		const next = getSignature(item);

		if (next !== signature) {
			signature = next;
			positionSubmenu(item, navigation, ancestors);
		}
	};
	// One check per frame, however many scroll events arrive.
	const update = () => {
		if (!frame) {
			frame = window.requestAnimationFrame(measure);
		}
	};
	const targets = [window, ...ancestors];

	targets.forEach((target) =>
		target.addEventListener('scroll', update, {
			capture: true,
			passive: true,
		})
	);
	window.addEventListener('resize', update, { passive: true });

	watchers.set(item, () => {
		window.cancelAnimationFrame(frame);
		targets.forEach((target) =>
			target.removeEventListener('scroll', update, { capture: true })
		);
		window.removeEventListener('resize', update);
	});
};

/**
 * Stop watching a submenu.
 *
 * Its placement is kept, so a closing submenu fades out where it is; it's
 * recalculated the next time it opens.
 *
 * @param {Element} item Menu item owning the submenu.
 */
export const unwatchSubmenu = (item) => {
	watchers.get(item)?.();
	watchers.delete(item);
};

/**
 * Clear the placement of every submenu in a menu (e.g. when it changes type).
 *
 * @param {Element} navigation The menu's <nav>.
 */
export const clearPlacements = (navigation) => {
	navigation?.querySelectorAll(SUBMENU).forEach(reset);
};
