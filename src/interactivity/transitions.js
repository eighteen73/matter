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

	list.forEach((element) =>
		element.style.setProperty('transition', 'none', 'important')
	);

	// Two frames: the new styles are applied, then painted, without transitions.
	window.requestAnimationFrame(() =>
		window.requestAnimationFrame(() =>
			list.forEach((element) =>
				element.style.removeProperty('transition')
			)
		)
	);
};
