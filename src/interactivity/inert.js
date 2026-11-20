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

// What each holder made inert, while it holds, and how many holders have each
// element: the first sets `inert` and the last removes it, in whatever order
// they let go. Who is told of a modal dialog is below.
const holders = new Set();
const counts = new WeakMap();
const pausers = new Set();

/**
 * Count a holder of an element, making it inert if nobody holds it yet. An
 * element that was inert before any holder is left as it is.
 *
 * @param {Element}   element Element to hold.
 * @param {Element[]} changed The holder's elements.
 */
function hold(element, changed) {
	const held = counts.get(element);

	if (held) {
		counts.set(element, held + 1);
		changed.push(element);
		return;
	}

	if (element.hasAttribute('inert')) {
		return;
	}

	element.setAttribute('inert', '');
	counts.set(element, 1);
	changed.push(element);
}

/**
 * Make an element inert, except live regions: one is left alone, and an
 * element that holds one is entered, so what is around the region is inert.
 *
 * @param {Element}   element Element to make inert.
 * @param {Element[]} changed Collects what was held.
 */
function silence(element, changed) {
	if (
		SKIPPED.includes(element.tagName) ||
		element.matches(LIVE) ||
		(element.hasAttribute('inert') && !counts.has(element))
	) {
		return;
	}

	if (element.querySelector(LIVE)) {
		[...element.children].forEach((child) => silence(child, changed));
		return;
	}

	hold(element, changed);
}

/**
 * Make the surroundings of an element inert.
 *
 * If the element itself sits inside something another holder made inert (a
 * panel opened from inside another), that is let go for as long as this holds,
 * and put back after.
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
	const lifted = new Set();
	let released = false;

	const release = () => {
		if (released) {
			return;
		}

		released = true;
		holders.delete(changed);

		changed.splice(0).forEach((sibling) => {
			const held = (counts.get(sibling) ?? 1) - 1;

			if (held > 0) {
				counts.set(sibling, held);
			} else {
				counts.delete(sibling);
				sibling.removeAttribute('inert');
			}
		});

		// What was let go of for this holder, if others still hold it.
		lifted.forEach((container) => {
			if (counts.has(container)) {
				container.setAttribute('inert', '');
			}
		});
	};

	holders.forEach((others) =>
		others
			.filter((other) => other.contains(element))
			.forEach((other) => {
				other.removeAttribute('inert');
				lifted.add(other);
			})
	);

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

	return release;
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
	const suspended = new Set();

	holders.forEach((changed) =>
		changed
			.filter((element) => element.contains(dialog))
			.forEach((element) => {
				element.removeAttribute('inert');
				suspended.add(element);
			})
	);

	const resumes = [...pausers].map((pause) => pause(dialog));

	return () => {
		resumes.forEach((resume) => resume?.());
		suspended.forEach((element) => {
			// Not if every holder let go meanwhile.
			if (counts.has(element)) {
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
