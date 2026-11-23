/**
 * Focus traps shared by Matter's menus and panels: one copy of focus-trap
 * (the `matter/focus-trap` script module, imported as `@matter/focus-trap`),
 * so their traps share one stack and pause and resume each other properly.
 *
 * `releaseTrapsWithin( element )` deactivates the traps inside an element
 * without moving focus, e.g. a drill-down menu's trap when the panel holding
 * it closes, so focus goes back to the panel's toggle rather than to a
 * control in the closing panel.
 */

/**
 * External dependencies
 */
import { createFocusTrap } from 'focus-trap';

// Active trap => its container elements.
const containers = new Map();

/**
 * Create a focus trap (as focus-trap's createFocusTrap).
 *
 * @param {Element|Element[]} element Container, or containers.
 * @param {Object}            options focus-trap options.
 * @return {Object} Trap.
 */
export function createTrap(element, options = {}) {
	const trap = createFocusTrap(element, {
		...options,
		onPostDeactivate: () => {
			containers.delete(trap);
			options.onPostDeactivate?.();
		},
	});

	const activate = trap.activate.bind(trap);
	const deactivate = trap.deactivate.bind(trap);
	const pause = trap.pause.bind(trap);
	const unpause = trap.unpause.bind(trap);

	// focus-trap ignores pause() and unpause() until the trap is active, and
	// activating pulls focus in. A trap told to rest before it is active (a
	// modal dialog is open already) is therefore not activated at all until
	// it is told to resume.
	let resting = false;
	let waiting = null;

	trap.activate = (...args) => {
		if (trap.active) {
			return trap;
		}

		if (resting) {
			waiting = args;
			return trap;
		}

		containers.set(
			trap,
			[].concat(element).filter((node) => node instanceof window.Node)
		);

		return activate(...args);
	};

	trap.pause = (...args) => {
		if (trap.active) {
			return pause(...args);
		}

		resting = true;

		return trap;
	};

	trap.unpause = (...args) => {
		if (trap.active) {
			return unpause(...args);
		}

		resting = false;

		if (waiting) {
			const activation = waiting;

			waiting = null;
			trap.activate(...activation);
		}

		return trap;
	};

	trap.deactivate = (...args) => {
		resting = false;
		waiting = null;

		return deactivate(...args);
	};

	return trap;
}

/**
 * Deactivate the traps inside an element, without returning focus.
 *
 * @param {Element} element Element.
 */
export function releaseTrapsWithin(element) {
	[...containers].forEach(([trap, nodes]) => {
		const isInside =
			nodes.length > 0 &&
			nodes.every((node) => node !== element && element.contains(node));

		if (isInside) {
			trap.deactivate({ returnFocus: false });
		}
	});
}
