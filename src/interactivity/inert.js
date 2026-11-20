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
		changed.splice(0).forEach((sibling) => {
			sibling.removeAttribute('inert');
		});
	};
}
