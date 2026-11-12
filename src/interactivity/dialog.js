/**
 * Closing native dialogs with an exit transition, in every browser.
 *
 * A dialog leaves the top layer the moment it closes, so CSS alone can only
 * animate the exit where the browser supports transitioning `overlay` and
 * `display` (Chromium). Instead the dialog stays open with `is-closing`
 * (styled as its closed state, e.g. faded and scaled down), and closes once
 * the transitions it starts have finished. Without a transition (reduced
 * motion, a theme that removes them, a grouped modal switching) it closes at
 * once. Reopening while it closes cancels the close.
 */

const CLOSING = 'is-closing';

// Longest wait for transitions, in case one never ends.
const MAX_WAIT = 1000;

/**
 * Transitions the closing state started on a dialog, its ::backdrop and its
 * contents (e.g. the lightbox image's scale). Not animations: they may run
 * forever (a carousel's timer inside).
 *
 * @param {HTMLDialogElement} dialog Dialog.
 * @return {Animation[]} Running transitions.
 */
const transitionsOf = (dialog) =>
	dialog
		.getAnimations({ subtree: true })
		.filter(
			(animation) =>
				animation instanceof window.CSSTransition &&
				dialog.contains(animation.effect?.target)
		);

/**
 * Close a dialog after its closing transition.
 *
 * @param {HTMLDialogElement} dialog Dialog.
 */
export function closeDialog(dialog) {
	if (!dialog?.open || dialog.classList.contains(CLOSING)) {
		return;
	}

	dialog.classList.add(CLOSING);

	// Apply the closing styles now, so their transitions start.
	void window.getComputedStyle(dialog).opacity;

	const transitions = transitionsOf(dialog);
	const finish = () => {
		// Reopened meanwhile (cancelClose), or closed some other way.
		if (!dialog.classList.contains(CLOSING)) {
			return;
		}

		// Close first: the dialog is hidden at once, so dropping the class
		// afterwards can't show its open state for a frame.
		if (dialog.open) {
			dialog.close();
		}

		dialog.classList.remove(CLOSING);
	};

	if (!transitions.length) {
		finish();
		return;
	}

	Promise.race([
		Promise.all(
			transitions.map((transition) => transition.finished.catch(() => {}))
		),
		new Promise((resolve) => window.setTimeout(resolve, MAX_WAIT)),
	]).then(finish);
}

/**
 * Stop closing a dialog (it was reopened before it finished).
 *
 * @param {HTMLDialogElement} dialog Dialog.
 */
export function cancelClose(dialog) {
	dialog?.classList.remove(CLOSING);
}

/**
 * Whether a dialog is on its way out.
 *
 * @param {HTMLDialogElement} dialog Dialog.
 * @return {boolean} Closing.
 */
export const isClosing = (dialog) => !!dialog?.classList.contains(CLOSING);
