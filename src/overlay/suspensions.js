/**
 * What a modal dialog's suspension of the held page needs to put back (see
 * `suspendForModal()`), by the dialog's element, so it is put back whatever
 * happens to the dialog: it closes, it is replaced by a same-ID dialog before
 * its own cleanup runs, or a script removes it while it is open.
 */

/**
 * @return {Object} The suspensions.
 */
export const createSuspensions = () => {
	const resumes = new Map();

	return {
		/**
		 * Keep what puts the page back for a dialog.
		 *
		 * @param {Element}  dialog Dialog.
		 * @param {Function} resume Puts the page back.
		 */
		hold(dialog, resume) {
			resumes.set(dialog, resume);
		},

		/**
		 * Put the page back for a dialog, once.
		 *
		 * @param {Element} dialog Dialog.
		 */
		release(dialog) {
			const resume = resumes.get(dialog);

			resumes.delete(dialog);
			resume?.();
		},

		/**
		 * Put the page back for every dialog that is gone or closed without
		 * anyone saying so (removed from the page while open).
		 */
		prune() {
			[...resumes.keys()]
				.filter((dialog) => !dialog.isConnected || !dialog.open)
				.forEach((dialog) => this.release(dialog));
		},

		get size() {
			return resumes.size;
		},
	};
};
