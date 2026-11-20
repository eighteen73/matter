/**
 * Make everything around an element inert, so only it is exposed to assistive
 * technology and the keyboard while it is open (a modal panel, the open level
 * of a drill-down menu).
 *
 * The siblings of the element, and of each of its ancestors up to `root`, get
 * `inert`. Only those that weren't inert already are touched, and releasing
 * removes exactly what was added, so an element someone else made inert stays
 * so.
 *
 * Live regions keep announcing: an element that is, or sits in, a live region
 * (`aria-live`, `role` status, alert or log) is never made inert, and a
 * sibling that only holds one is entered, so the rest of it is inert and the
 * path to the region is not.
 */

// Nothing to make inert, or that mustn't be.
const SKIPPED = ['SCRIPT', 'STYLE', 'TEMPLATE', 'LINK', 'NOSCRIPT'];

// What announces changes to assistive technology, which inert would silence.
const LIVE = '[aria-live], [role="status"], [role="alert"], [role="log"]';

// What each holder made inert, while it holds, and who is told of a modal.
const holders = new Set();
const pausers = new Set();

/**
 * Make an element inert, except live regions: one is left alone, and an
 * element that holds one is entered, so what is around the region is inert.
 *
 * @param {Element}   element Element to make inert.
 * @param {Element[]} changed Collects what was made inert.
 */
function silence(element, changed) {
	if (
		SKIPPED.includes(element.tagName) ||
		element.hasAttribute('inert') ||
		element.matches(LIVE)
	) {
		return;
	}

	if (element.querySelector(LIVE)) {
		[...element.children].forEach((child) => silence(child, changed));
		return;
	}

	element.setAttribute('inert', '');
	changed.push(element);
}

/**
 * Make the surroundings of an element inert.
 *
 * @param {Element} element      Element that stays active.
 * @param {Object}  options
 * @param {Element} options.root Ancestor to stop at: its children are the
 *                               last level made inert.
 * @param {string}  options.keep Selector for siblings to leave alone (e.g. a
 *                               backdrop that takes clicks).
 * @return {Function} Releases what was made inert.
 */
export function inertAround(element, { root = document.body, keep = '' } = {}) {
	const changed = [];

	holders.add(changed);

	for (let node = element; node && node !== root; ) {
		const parent = node.parentElement;

		if (!parent) {
			break;
		}

		[...parent.children].forEach((sibling) => {
			if (sibling !== node && !(keep && sibling.matches(keep))) {
				silence(sibling, changed);
			}
		});

		node = parent;
	}

	return () => {
		holders.delete(changed);
		changed.splice(0).forEach((sibling) => {
			sibling.removeAttribute('inert');
		});
	};
}

/**
 * A modal dialog that opens while something holds the page inert (a modal
 * opened from a button in an open panel) sits inside what is inert, where it
 * can't be used in every browser. This lets the holds around the dialog go,
 * and asks what else is paused for it (e.g. a focus trap), until it closes: the
 * browser itself keeps everything outside a modal dialog inert meanwhile.
 *
 * @param {Element} dialog The dialog about to be shown.
 * @return {Function} Puts back what is still held, and resumes what was paused.
 */
export function suspendForModal(dialog) {
	const released = [];

	holders.forEach((changed) => {
		changed
			.filter((element) => element.contains(dialog))
			.forEach((element) => {
				element.removeAttribute('inert');
				released.push([changed, element]);
			});
	});

	const resumes = [...pausers].map((pause) => pause(dialog));

	return () => {
		resumes.forEach((resume) => resume?.());
		released.forEach(([changed, element]) => {
			// Not if its holder let go meanwhile.
			if (changed.includes(element)) {
				element.setAttribute('inert', '');
			}
		});
	};
}

/**
 * Be told when a modal dialog is about to open over the page, to pause
 * what would fight it (a focus trap).
 *
 * @param {Function} pause Called with the dialog; returns a function that
 *                         resumes.
 * @return {Function} Stops being told.
 */
export function onModal(pause) {
	pausers.add(pause);

	return () => pausers.delete(pause);
}
