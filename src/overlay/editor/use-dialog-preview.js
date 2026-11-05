/**
 * Opens and closes a modal's or drawer's editor dialog as on the front end.
 *
 * The dialog element is a manual popover (hidden while closed): showing it
 * puts it in the top layer with a real `::backdrop`, so the theme's dialog
 * and backdrop styles apply, without making the rest of the editor inert or
 * moving focus (as `showModal()` would). It opens and closes with the
 * theme's transitions: shown in its closed state, then given `open`; closing
 * removes `open` and waits for the transitions before hiding.
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
 * @param {Object}   ref     Dialog element ref (a `popover="manual"` element).
 * @param {boolean}  isOpen  Whether the dialog should be open.
 * @param {Function} onClose Called when the backdrop is clicked.
 * @return {boolean} Whether it's shown (open, or animating closed).
 */
export default function useDialogPreview(ref, isOpen, onClose) {
	const [isClosing, setIsClosing] = useState(false);
	const [wasOpen, setWasOpen] = useState(isOpen);

	// Start closing in the same render the selection moves on, so it stays
	// shown while its transitions run.
	if (wasOpen !== isOpen) {
		setWasOpen(isOpen);
		setIsClosing(!isOpen);
	}

	const isShown = isOpen || isClosing;

	useLayoutEffect(() => {
		const element = ref.current;

		if (!element) {
			return;
		}

		if (!isOpen) {
			element.removeAttribute('open');

			return;
		}

		if (!isShowing(element)) {
			// Shown in the dialog's closed state for a style pass, then
			// opened, so the theme's transitions run.
			element.showPopover?.();
			void element.offsetWidth;
		}

		element.setAttribute('open', '');
	}, [ref, isOpen]);

	// Closing: once the transitions finish, hide it.
	useEffect(() => {
		const element = ref.current;

		if (!isClosing || !element) {
			return;
		}

		const view = element.ownerDocument.defaultView;
		const timer = view.setTimeout(
			() => setIsClosing(false),
			transitionTime(element)
		);

		return () => view.clearTimeout(timer);
	}, [ref, isClosing]);

	useLayoutEffect(() => {
		const element = ref.current;

		if (element && !isShown && isShowing(element)) {
			element.removeAttribute('open');
			element.hidePopover?.();
		}
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
