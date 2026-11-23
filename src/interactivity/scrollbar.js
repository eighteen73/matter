/**
 * Whether the page has a scrollbar that takes space: a page that scrolls (or
 * whose theme has `overflow-y: scroll`, which a short page doesn't need) in a
 * browser whose scrollbars take room, not overlay ones, which take none.
 *
 * Not worked out from `window.innerWidth`, which on a phone that has been
 * pinch-zoomed is the visual viewport and says nothing about the scrollbar.
 * The scrollbar's thickness is measured on a probe that scrolls, and whether
 * the page shows one from its overflow and height.
 *
 * @return {boolean} Whether there is.
 */
export const hasScrollbar = () => {
	const probe = document.createElement('div');

	probe.style.cssText =
		'position:absolute;inset:0 auto auto 0;width:100px;height:100px;overflow:scroll;visibility:hidden;pointer-events:none';
	document.body.append(probe);

	const thickness = probe.offsetWidth - probe.clientWidth;

	probe.remove();

	if (thickness <= 0) {
		return false;
	}

	// The viewport takes its overflow from the root element, else the body.
	const root = document.documentElement;
	const overflow = [root, document.body]
		.map((element) => window.getComputedStyle(element).overflowY)
		.find((value, index) => (value && value !== 'visible') || index === 1);

	if (overflow === 'hidden' || overflow === 'clip') {
		return false;
	}

	return overflow === 'scroll' || root.scrollHeight > root.clientHeight;
};
