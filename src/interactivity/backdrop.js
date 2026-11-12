/**
 * Backdrop clicks on native dialogs. A click on a modal dialog's ::backdrop
 * targets the dialog itself, but so does a click whose press started inside
 * the dialog (e.g. selecting text) and was released on the backdrop, which
 * mustn't close it. Only a click pressed and released on the backdrop counts.
 */

// Where the latest press started.
let pressedOn = null;

document.addEventListener(
	'pointerdown',
	(event) => {
		pressedOn = event.target;
	},
	true
);

/**
 * Whether a click was on a dialog's backdrop.
 *
 * @param {Event}             event  Click.
 * @param {HTMLDialogElement} dialog Dialog.
 * @return {boolean} On the backdrop.
 */
export const isBackdropClick = (event, dialog) =>
	event.target === dialog && pressedOn === dialog;
