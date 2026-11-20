/**
 * Whether the page has a scrollbar that takes space: what is between the
 * window and the page's width. A page that scrolls has one (not with overlay
 * scrollbars, which take none), and so does a short page whose theme has
 * `overflow-y: scroll`, which `scrollHeight > clientHeight` misses.
 *
 * @return {boolean} Whether there is.
 */
export const hasScrollbar = () =>
	window.innerWidth - document.documentElement.clientWidth > 0;
