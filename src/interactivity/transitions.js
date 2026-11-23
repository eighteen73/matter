/**
 * Each suspended element's original inline value, and how many suspensions
 * hold it, so overlapping ones restore it once, when the last ends.
 */
const holds = new WeakMap();

/**
 * Switch off transitions while a layout changes mode.
 *
 * When the viewport crosses a breakpoint, an element can swap one layout for
 * another (an inline menu becomes an off-canvas panel). Its transitions would
 * animate that swap, e.g. the panel visibly sliding off the screen. Called
 * from a media query's change event, this runs before the new styles apply,
 * so they apply instantly; transitions come back on the next frames.
 *
 * @param {Iterable<Element>} elements Elements whose transitions to suspend.
 */
export const suspendTransitions = (elements) => {
	const list = [...elements].filter(Boolean);

	list.forEach((element) => {
		const held = holds.get(element);

		if (held) {
			++held.count;
			return;
		}

		// Any transition set inline before (by a theme script), to put
		// back. Only the first suspension records it: a later one would see
		// the 'none' of the first.
		holds.set(element, { count: 1, value: element.style.transition });

		// Inline, so it outranks stylesheet rules without !important.
		element.style.transition = 'none';
	});

	// Two frames: the new styles are applied, then painted, without transitions.
	window.requestAnimationFrame(() =>
		window.requestAnimationFrame(() =>
			list.forEach((element) => {
				const held = holds.get(element);

				if (held && --held.count <= 0) {
					element.style.transition = held.value;
					holds.delete(element);
				}
			})
		)
	);
};
