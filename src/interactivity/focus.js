/**
 * Focus helpers shared by overlays and panels.
 */

/**
 * The focused element, or null when focus is on the page itself.
 *
 * @return {Element|null} Focused element.
 */
export const focused = () => {
	const { activeElement, body } = window.document;

	return activeElement && activeElement !== body ? activeElement : null;
};

/**
 * Whether an element can take focus back: it is still in the page and shown.
 *
 * @param {Element|undefined} element Element.
 * @return {boolean} Whether it can.
 */
export const isUsable = (element) =>
	!!element?.isConnected &&
	element.checkVisibility?.({ checkVisibilityCSS: true }) !== false;

/**
 * Focus the first of some elements that takes it.
 *
 * @param {Array<Element|undefined>} candidates In order of preference.
 * @return {Element|undefined} The element now focused.
 */
export const focusFirst = (candidates) =>
	candidates.find((element) => {
		if (!isUsable(element)) {
			return false;
		}

		element.focus({ preventScroll: true });

		return focused() === element;
	});
