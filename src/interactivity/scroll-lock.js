/**
 * The page's scroll lock, shared by everything that stops the page scrolling
 * behind it (modals, drawers, panels), so they can be open together in any
 * order.
 *
 * Each holder adds its own class to `<html>` (`has-overlay-open`,
 * `has-panel-open`), which is what the stylesheets key off and what is
 * documented. The scrollbar's space is kept by one class, `has-scroll-gutter`,
 * decided once, by the first holder, while the page still has its scrollbar:
 * with another lock already on, the root's overflow is hidden and there is
 * nothing to measure. Later holders inherit it, and the last one to let go
 * removes it.
 */
import { hasScrollbar } from './scrollbar';

const GUTTER_CLASS = 'has-scroll-gutter';

// How many holds each open class has now.
const holds = new Map();

const total = () => [...holds.values()].reduce((sum, count) => sum + count, 0);

/**
 * Lock the page's scroll, for one holder.
 *
 * @param {string} openClass The class this holder puts on `<html>`.
 */
export const acquireScrollLock = (openClass) => {
	const root = document.documentElement;

	// Keep the scrollbar's space only on a page that has a scrollbar that
	// takes space (measured, so a theme's `overflow-y: scroll` counts and an
	// overlay scrollbar doesn't): a page without one would shift sideways for
	// a gutter with nothing in it.
	if (!total()) {
		root.classList.toggle(GUTTER_CLASS, hasScrollbar());
	}

	holds.set(openClass, (holds.get(openClass) ?? 0) + 1);
	root.classList.add(openClass);
};

/**
 * Let go of one hold. The page scrolls again when the last holder has.
 *
 * @param {string} openClass The class the holder put on `<html>`.
 */
export const releaseScrollLock = (openClass) => {
	const count = holds.get(openClass) ?? 0;
	const root = document.documentElement;

	if (count > 1) {
		holds.set(openClass, count - 1);
		return;
	}

	holds.delete(openClass);
	root.classList.remove(openClass);

	if (!total()) {
		root.classList.remove(GUTTER_CLASS);
	}
};
