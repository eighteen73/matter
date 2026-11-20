/**
 * Make everything around an element inert, so only it is exposed to assistive
 * technology and the keyboard while it is open (a modal panel, the open level
 * of a drill-down menu).
 *
 * The siblings of the element, and of each of its ancestors up to `root`, get
 * `inert`. Only those that weren't inert already are touched, and releasing
 * removes exactly what was added, so an element someone else made inert stays
 * so.
 */

// Nothing to make inert, or that mustn't be.
const SKIPPED = ['SCRIPT', 'STYLE', 'TEMPLATE', 'LINK', 'NOSCRIPT'];

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
			if (
				sibling === node ||
				SKIPPED.includes(sibling.tagName) ||
				sibling.hasAttribute('inert') ||
				(keep && sibling.matches(keep))
			) {
				return;
			}

			sibling.setAttribute('inert', '');
			changed.push(sibling);
		});

		node = parent;
	}

	return () => {
		changed.splice(0).forEach((sibling) => {
			sibling.removeAttribute('inert');
		});
	};
}
