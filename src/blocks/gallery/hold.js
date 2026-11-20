/**
 * What a gallery's lightbox holds while it is open as a modal: it lets go of
 * what a panel holds inert (so it can be used), pauses the panel's focus trap,
 * and locks the page's scroll, all shared with modals and panels.
 */

/**
 * WordPress dependencies
 */
import {
	acquireScrollLock,
	releaseScrollLock,
	suspendForModal,
} from '@matter/inert';

/**
 * Internal dependencies
 */
import { focused } from '../../interactivity/focus';

// Dialog => the function that puts it all back.
const holds = new WeakMap();

/**
 * Let go of the page: what the lightbox held, and the watch on its removal.
 *
 * @param {HTMLDialogElement} dialog Lightbox.
 */
export const release = (dialog) => {
	const put = holds.get(dialog);

	holds.delete(dialog);
	put?.();
};

/**
 * Show the lightbox as a modal, with what that needs from the page. A lightbox
 * taken out of the page while open (its gallery removed by a script, with no
 * client-side navigation to tear it down) lets go of the page too.
 *
 * @param {HTMLDialogElement} dialog Lightbox.
 */
export const showModal = (dialog) => {
	release(dialog);

	const resume = suspendForModal(dialog, focused());

	try {
		acquireScrollLock('has-overlay-open');
	} catch (error) {
		resume();
		throw error;
	}

	const watcher = new window.MutationObserver(() => {
		if (!dialog.isConnected) {
			release(dialog);
		}
	});

	watcher.observe(document.body, { childList: true, subtree: true });

	holds.set(dialog, () => {
		watcher.disconnect();

		try {
			resume();
		} finally {
			releaseScrollLock('has-overlay-open');
		}
	});

	try {
		dialog.showModal();
	} catch (error) {
		release(dialog);
		throw error;
	}
};
