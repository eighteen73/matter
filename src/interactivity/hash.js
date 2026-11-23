/**
 * The page's `#hash` as an ID: decoded, or as it is when it isn't valid
 * percent-encoding (`#%E0%A4%A` throws a `URIError` in `decodeURIComponent`).
 *
 * @param {string} hash Hash with or without the `#`; the page's by default.
 * @return {string} The ID the hash names, empty for none.
 */
export const hashId = (hash = window.location.hash) => {
	const id = hash.replace(/^#/, '');

	try {
		return decodeURIComponent(id);
	} catch {
		return id;
	}
};

/**
 * Scroll to an element that is about to be shown (its tab was just selected,
 * its accordion item just opened). The Interactivity API applies the change
 * after the state is set, so the element can still be hidden in the next
 * frame, where a scroll does nothing: wait, for a few frames, until it is
 * rendered.
 *
 * @param {Element} target Element to scroll to.
 * @param {number}  frames Most frames to wait.
 */
export const scrollWhenShown = (target, frames = 30) => {
	const isShown = () =>
		typeof target.checkVisibility === 'function'
			? target.checkVisibility()
			: target.getClientRects().length > 0;

	const attempt = (left) => {
		if (isShown() || left <= 0) {
			target.scrollIntoView({ block: 'start' });
			return;
		}

		window.requestAnimationFrame(() => attempt(left - 1));
	};

	window.requestAnimationFrame(() => attempt(frames));
};

/**
 * Whether a link goes to the page it's on: the same origin, path and query
 * (so only the hash differs). A link to another page, or the same path with
 * another query, that happens to end in `#id` is an ordinary link.
 *
 * @param {HTMLAnchorElement} link Link.
 * @return {boolean} Whether it is to this page.
 */
export const isSamePage = (link) => {
	const url = new URL(link.href, window.location.href);

	return (
		url.origin === window.location.origin &&
		url.pathname === window.location.pathname &&
		url.search === window.location.search
	);
};

/**
 * Whether a link opens in this tab. One for a new tab or window, or a download,
 * isn't a trigger: its own behaviour is the point of it.
 *
 * @param {HTMLAnchorElement} link Link.
 * @return {boolean} Whether it navigates this page.
 */
export const opensHere = (link) =>
	(link.target === '' || link.target === '_self') &&
	!link.hasAttribute('download');
