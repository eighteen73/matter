/**
 * Menu behaviour (store: matter/menu).
 *
 * Markup is rendered by Navigation\Walker. Layout per menu type is pure CSS
 * (including per-breakpoint switching); this store handles opening/closing
 * submenus, keyboard support and focus management for the active type.
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
 * External dependencies
 */
import { createFocusTrap } from 'focus-trap';

/**
 * Internal dependencies
 */
import { unwatchSubmenu, watchSubmenu } from './positioning';

const SELECTORS = {
	menu: '.matter-menu',
	items: '.matter-menu__items',
	item: '.matter-menu__item',
	parent: '.matter-menu__item.has-submenu:not(.is-column)',
	link: '.matter-menu__link',
	toggle: '.matter-menu__toggle',
	submenu: '.matter-menu__submenu',
	panel: '.matter-panel',
	focusable:
		'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
};

const DROPDOWN = 'dropdown';
const DRILL_DOWN = 'drill-down';
const CLICK = 'click';
const HOVER = 'hover';
const NEXT_KEYS = ['ArrowDown', 'ArrowRight'];
const PREV_KEYS = ['ArrowUp', 'ArrowLeft'];

// Hover is only meaningful with a precise pointer; touch-capable laptops with a
// mouse still get hover menus.
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

const traps = new Map();

const isVisible = (element) =>
	!!element &&
	(typeof element.checkVisibility === 'function'
		? element.checkVisibility({ checkVisibilityCSS: true })
		: element.getClientRects().length > 0);

const getTarget = (event) => {
	const target = event?.target;

	if (!target) {
		return null;
	}

	return target.nodeType === 1 ? target : target.parentElement;
};

const getSubmenuId = (item) => {
	const match = item
		?.querySelector(`:scope > ${SELECTORS.toggle}`)
		?.getAttribute('aria-controls')
		?.match(/-(\d+)$/);

	return match ? Number(match[1]) : null;
};

const getItemForSubmenuId = (menu, submenuId) =>
	menu
		?.querySelector(`[aria-controls="${menu.id}-submenu-${submenuId}"]`)
		?.closest(SELECTORS.parent) || null;

const getOwnSubmenu = (item) =>
	item?.querySelector(`:scope > ${SELECTORS.submenu}`) || null;

/**
 * Focusable elements a submenu's arrow keys move between: its header controls,
 * its own items (not those in nested submenus), and all megamenu content.
 *
 * @param {Element} item Item owning the submenu.
 * @return {Element[]} Focusable elements.
 */
const getSubmenuFocusables = (item) => {
	const submenu = getOwnSubmenu(item);

	if (!submenu) {
		return [];
	}

	return [...submenu.querySelectorAll(SELECTORS.focusable)].filter(
		(element) =>
			isVisible(element) && element.closest(SELECTORS.submenu) === submenu
	);
};

const getTopLevelControls = (menu) =>
	[...(menu?.querySelector(SELECTORS.items)?.children ?? [])]
		.flatMap((item) => [
			item.querySelector(`:scope > ${SELECTORS.link}`),
			item.querySelector(`:scope > ${SELECTORS.toggle}`),
		])
		.filter((element) => element?.tagName !== 'SPAN' && isVisible(element));

const moveFocus = (elements, current, step) => {
	const index = elements.indexOf(current);
	const target = index === -1 ? null : elements[index + step];

	target?.focus();

	return !!target;
};

const deactivateTrap = (submenuId) => {
	traps.get(submenuId)?.deactivate();
	traps.delete(submenuId);
};

const openSubmenu = (context, submenuId, mode, item) => {
	if (context.menuType === DROPDOWN && item) {
		watchSubmenu(item, item.closest(SELECTORS.menu));
	}

	if (!context.openSubmenus.includes(submenuId)) {
		context.openSubmenus = [...context.openSubmenus, submenuId];
	}

	context.openModes[submenuId] = mode;
};

const closeSubmenu = (context, submenuId, item = null) => {
	const owner =
		item ||
		document
			.querySelector(`[id$="-submenu-${submenuId}"]`)
			?.closest(SELECTORS.parent);
	const descendants = owner
		? [...(getOwnSubmenu(owner)?.querySelectorAll(SELECTORS.parent) ?? [])]
		: [];

	[...descendants, owner].filter(Boolean).forEach((element) => {
		const id = getSubmenuId(element);

		unwatchSubmenu(element);
		deactivateTrap(id);
		context.openSubmenus = context.openSubmenus.filter(
			(open) => open !== id
		);
		delete context.openModes[id];
	});
};

const closeAll = (context, menu, except = null) => {
	[...context.openSubmenus].forEach((submenuId) => {
		const item = getItemForSubmenuId(menu, submenuId);

		if (item && except && item.contains(except)) {
			return;
		}

		closeSubmenu(context, submenuId, item);
	});
};

const trapDrillDown = (context, submenuId, item) => {
	const submenu = getOwnSubmenu(item);

	if (!submenu) {
		return;
	}

	const trap = createFocusTrap(submenu, {
		allowOutsideClick: true,
		escapeDeactivates: false,
		returnFocusOnDeactivate: true,
		// Always return to the submenu's toggle, whatever was focused before.
		setReturnFocus: () =>
			item.querySelector(`:scope > ${SELECTORS.toggle}`) || false,
		initialFocus: () => getSubmenuFocusables(item)[0] || submenu,
		fallbackFocus: submenu,
		// Wait for the slide-in panel to become visible before focusing it.
		checkCanFocusTrap: () =>
			new Promise((resolve) => {
				const start = window.performance.now();
				const check = () =>
					isVisible(submenu) ||
					window.performance.now() - start > 1000
						? resolve()
						: window.requestAnimationFrame(check);
				check();
			}),
	});

	traps.set(submenuId, trap);
	trap.activate();
};

/**
 * The menu type for the current viewport.
 *
 * @param {Array} types Type ranges: { type, query }.
 * @return {string} Active menu type.
 */
const resolveType = (types) =>
	[...types]
		.reverse()
		.find(({ query }) => !query || window.matchMedia(query).matches)
		?.type ?? types[0]?.type;

const { state } = store(
	'matter/menu',
	{
		state: {
			get isSubmenuOpen() {
				const context = getContext();

				return context.openSubmenus.includes(context.submenuId);
			},
		},
		actions: {
			openOnHover() {
				const context = getContext();

				if (
					context.menuType !== DROPDOWN ||
					context.opensOn !== HOVER ||
					!finePointer.matches
				) {
					return;
				}

				const { ref } = getElement();

				openSubmenu(context, context.submenuId, HOVER, ref);
			},
			closeOnHover() {
				const context = getContext();

				if (
					context.menuType !== DROPDOWN ||
					context.openModes[context.submenuId] !== HOVER
				) {
					return;
				}

				const { ref } = getElement();

				closeSubmenu(context, context.submenuId, ref);
			},
			toggleSubmenu() {
				const context = getContext();
				const { ref } = getElement();
				const item = ref.closest(SELECTORS.parent);

				if (state.isSubmenuOpen) {
					closeSubmenu(context, context.submenuId, item);
					return;
				}

				// Dropdown siblings close when another at the same level opens.
				[...(item.parentElement?.children ?? [])]
					.filter(
						(sibling) =>
							sibling !== item && context.menuType === DROPDOWN
					)
					.forEach((sibling) => {
						const id = getSubmenuId(sibling);

						if (id !== null && context.openSubmenus.includes(id)) {
							closeSubmenu(context, id, sibling);
						}
					});

				openSubmenu(context, context.submenuId, CLICK, item);

				if (context.menuType === DRILL_DOWN) {
					trapDrillDown(context, context.submenuId, item);
				}
			},
			closeSubmenu() {
				const context = getContext();
				const { ref } = getElement();
				const item = ref.closest(SELECTORS.parent);

				closeSubmenu(context, context.submenuId, item);
				item?.querySelector(`:scope > ${SELECTORS.toggle}`)?.focus();
			},
			onKeydown: withSyncEvent((event) => {
				const target = getTarget(event);

				if (!target) {
					return;
				}

				const context = getContext();
				const { ref: menu } = getElement();
				const { key } = event;

				if (key === 'Escape') {
					// Close the innermost open submenu containing focus.
					const item = [...menu.querySelectorAll(SELECTORS.parent)]
						.reverse()
						.find(
							(candidate) =>
								candidate.contains(target) &&
								context.openSubmenus.includes(
									getSubmenuId(candidate)
								)
						);

					if (item) {
						event.preventDefault();
						event.stopPropagation();
						closeSubmenu(context, getSubmenuId(item), item);
						item.querySelector(
							`:scope > ${SELECTORS.toggle}`
						)?.focus();
					}

					return;
				}

				const isNext = NEXT_KEYS.includes(key);
				const isPrev = PREV_KEYS.includes(key);

				if (!isNext && !isPrev && key !== 'Home' && key !== 'End') {
					return;
				}

				const submenu = target.closest(SELECTORS.submenu);
				const owner = submenu?.closest(SELECTORS.parent);
				const list =
					owner && menu.contains(owner)
						? getSubmenuFocusables(owner)
						: getTopLevelControls(menu);

				if (!list.includes(target)) {
					return;
				}

				let moved = false;

				if (isNext || isPrev) {
					moved = moveFocus(list, target, isNext ? 1 : -1);
				} else if (list.length) {
					(key === 'Home' ? list[0] : list[list.length - 1]).focus();
					moved = true;
				}

				if (moved) {
					event.preventDefault();
				}
			}),
			onFocusOut: withSyncEvent((event) => {
				const context = getContext();

				// Only dropdowns close when focus leaves. A null relatedTarget
				// means a click on non-focusable content (handled by
				// onDocumentClick), so leave things open.
				if (context.menuType !== DROPDOWN || !event.relatedTarget) {
					return;
				}

				const { ref } = getElement();

				closeAll(context, ref, event.relatedTarget);
			}),
			onDocumentClick: withSyncEvent((event) => {
				const context = getContext();

				if (
					context.menuType !== DROPDOWN ||
					!context.openSubmenus.length
				) {
					return;
				}

				const { ref } = getElement();

				closeAll(context, ref, getTarget(event));
			}),
		},
		callbacks: {
			init() {
				const context = getContext();
				const { ref } = getElement();

				context.menuType = resolveType(context.types);

				// Follow the active type as the viewport crosses breakpoints.
				const sync = withScope(() => {
					const type = resolveType(context.types);

					if (type !== context.menuType) {
						closeAll(context, ref);
						context.menuType = type;
					}
				});

				context.types
					.filter(({ query }) => query)
					.forEach(({ query }) =>
						window
							.matchMedia(query)
							.addEventListener('change', sync)
					);

				// Reset when a containing panel closes.
				ref.closest(SELECTORS.panel)?.addEventListener(
					'matter-panel-close',
					withScope(() => closeAll(context, ref))
				);
			},
		},
	},
	{ lock: true }
);

// Safari needs a document click listener for reliable focusout events.
document.addEventListener('click', () => {});
