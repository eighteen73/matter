/**
 * Whether the page has a scrollbar that takes space, whatever `innerWidth`
 * says: on a pinch-zoomed phone it is the visual viewport.
 */
import { hasScrollbar } from '../scrollbar';

// jsdom has no layout: the scrollbar's thickness (the probe's `offsetWidth`
// less its `clientWidth`), the page's height and the root's overflow are
// given, and `innerWidth`, which a zoom changes and which must not matter.
const page = ({ thickness = 15, scrolls = false, overflow = '', inner }) => {
	jest.spyOn(
		window.HTMLElement.prototype,
		'offsetWidth',
		'get'
	).mockReturnValue(100 + thickness);
	jest.spyOn(
		window.HTMLElement.prototype,
		'clientWidth',
		'get'
	).mockReturnValue(100);
	Object.defineProperty(document.documentElement, 'scrollHeight', {
		configurable: true,
		value: scrolls ? 2000 : 600,
	});
	Object.defineProperty(document.documentElement, 'clientHeight', {
		configurable: true,
		value: 600,
	});
	document.documentElement.style.overflowY = overflow;
	Object.defineProperty(window, 'innerWidth', {
		configurable: true,
		value: inner ?? 400,
	});
};

describe('hasScrollbar', () => {
	afterEach(() => {
		jest.restoreAllMocks();
		document.documentElement.style.overflowY = '';
		document.body.style.overflowY = '';
	});

	it('is true for a page that scrolls, where scrollbars take room', () => {
		page({ scrolls: true });

		expect(hasScrollbar()).toBe(true);
	});

	it('is true for a short page whose theme always shows the scrollbar', () => {
		page({ scrolls: false, overflow: 'scroll' });

		expect(hasScrollbar()).toBe(true);
	});

	it('is false for a short page, and for one locked with overflow hidden', () => {
		page({ scrolls: false });
		expect(hasScrollbar()).toBe(false);

		page({ scrolls: true, overflow: 'hidden' });
		expect(hasScrollbar()).toBe(false);
	});

	it('is false with overlay scrollbars, which take no room', () => {
		page({ thickness: 0, scrolls: true });

		expect(hasScrollbar()).toBe(false);
	});

	it('reads the body when the root leaves overflow alone', () => {
		page({ scrolls: false });
		document.body.style.overflowY = 'scroll';

		expect(hasScrollbar()).toBe(true);
	});

	it("doesn't depend on innerWidth, which a pinch zoom changes", () => {
		// Zoomed out (wider than the page) with no scrollbar, then zoomed in
		// (narrower) with one.
		page({ scrolls: false, inner: 520 });
		expect(hasScrollbar()).toBe(false);

		page({ scrolls: true, inner: 200 });
		expect(hasScrollbar()).toBe(true);
	});

	it('leaves nothing in the page', () => {
		page({ scrolls: true });
		document.body.innerHTML = '';
		hasScrollbar();

		expect(document.body.children).toHaveLength(0);
	});
});
