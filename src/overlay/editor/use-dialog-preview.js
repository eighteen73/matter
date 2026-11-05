/**
 * Shows a modal or drawer block as its open dialog, as on the front end.
 *
 * The block element becomes a manual popover while open: that puts it in the
 * top layer with a real `::backdrop`, so the theme's dialog and backdrop
 * styles apply, without making the rest of the editor inert or moving focus
 * (as `showModal()` would). It opens and closes with the theme's transitions:
 * shown in its closed state, then given `open`; closing removes `open` and
 * waits for the transitions before leaving the top layer.
 */

/**
 * WordPress dependencies
 */
import { useEffect, useLayoutEffect, useState } from '@wordpress/element';

/**
 * Longest transition on an element, in ms.
 *
 * @param {Element} element Element.
 * @return {number} Duration.
 */
const transitionTime = (element) => {
	const style = element.ownerDocument.defaultView.getComputedStyle(element);
	const seconds = (value) =>
		value.split(',').map((part) => parseFloat(part) || 0);
	const durations = seconds(style.transitionDuration);
	const delays = seconds(style.transitionDelay);

	return Math.max(
		0,
		...durations.map(
			(duration, index) =>
				(duration + (delays[index % delays.length] ?? 0)) * 1000
		)
	);
};

const isShowing = (element) => {
	try {
		return element.matches(':popover-open');
	} catch {
		return false;
	}
};

/**
 * @param {Object}   ref     Block element ref.
 * @param {boolean}  isOpen  Whether the dialog should be open.
 * @param {boolean}  enabled Modal or drawer (not a collapsible).
 * @param {Function} onClose Called when the backdrop is clicked.
 * @return {boolean} Whether it's shown (open, or animating closed).
 */
export default function useDialogPreview(ref, isOpen, enabled, onClose) {
	const [isClosing, setIsClosing] = useState(false);
	const [wasOpen, setWasOpen] = useState(isOpen);

	// Start closing in the same render the selection moves on, so it stays
	// shown while its transitions run.
	if (wasOpen !== isOpen) {
		setWasOpen(isOpen);
		setIsClosing(enabled && !isOpen);
	}

	const isShown = enabled && (isOpen || isClosing);

	useLayoutEffect(() => {
		const element = ref.current;

		if (!enabled || !element) {
			return;
		}

		if (!isOpen) {
			element.removeAttribute('open');

			return;
		}

		if (!isShowing(element)) {
			// A style pass hidden (a closed popover isn't displayed), so it
			// doesn't transition from the trigger area's styles; one shown in
			// the dialog's closed state; then `open`, so the theme's
			// transitions run as on the front end.
			element.setAttribute('popover', 'manual');
			void element.offsetWidth;
			element.showPopover?.();
			void element.offsetWidth;
		}

		element.setAttribute('open', '');
	}, [ref, isOpen, enabled]);

	// Closing: once the transitions finish, leave the top layer.
	useEffect(() => {
		const element = ref.current;

		if (!isClosing || !element) {
			return;
		}

		const timer = element.ownerDocument.defaultView.setTimeout(
			() => setIsClosing(false),
			transitionTime(element)
		);

		return () => element.ownerDocument.defaultView.clearTimeout(timer);
	}, [ref, isClosing]);

	useLayoutEffect(() => {
		const element = ref.current;

		if (!element || isShown) {
			return;
		}

		if (isShowing(element)) {
			element.hidePopover?.();
		}

		element.removeAttribute('popover');
		element.removeAttribute('open');
	}, [ref, isShown]);

	// Clicks on the backdrop reach the dialog element, outside its box.
	useEffect(() => {
		const element = ref.current;

		if (!isShown || !element) {
			return;
		}

		const onClick = (event) => {
			if (event.target !== element) {
				return;
			}

			const box = element.getBoundingClientRect();
			const inside =
				event.clientX >= box.left &&
				event.clientX <= box.right &&
				event.clientY >= box.top &&
				event.clientY <= box.bottom;

			if (!inside) {
				onClose();
			}
		};

		element.addEventListener('click', onClick);

		return () => element.removeEventListener('click', onClick);
	}, [ref, isShown, onClose]);

	return isShown;
}
