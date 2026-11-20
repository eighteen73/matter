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
		 * Keep what puts the page back for a dialog. A dialog opened again
		 * before its close event fired still has the suspension of its last
		 * open: that is put back, so the shared depth doesn't stay raised.
		 *
		 * @param {Element}  dialog Dialog.
		 * @param {Function} resume Puts the page back.
		 */
		hold(dialog, resume) {
			const previous = resumes.get(dialog);

			resumes.set(dialog, resume);

			if (previous && previous !== resume) {
				previous();
			}
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
		 *
		 * @param {Function} keep Called with a dialog that is closed or gone:
		 *                        true if it is about to be shown again (a
		 *                        dialog that can't be closed, between the
		 *                        browser closing it and its close event), so
		 *                        its suspension stays.
		 */
		prune(keep = () => false) {
			const errors = [];

			[...resumes.keys()]
				.filter(
					(dialog) =>
						(!dialog.isConnected || !dialog.open) &&
						!(dialog.isConnected && keep(dialog))
				)
				.forEach((dialog) => {
					// One that throws doesn't leave the rest held.
					try {
						this.release(dialog);
					} catch (error) {
						errors.push(error);
					}
				});

			if (errors.length) {
				throw errors[0];
			}
		},

		get size() {
			return resumes.size;
		},
	};
};
