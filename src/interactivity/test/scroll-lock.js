/**
 * The scroll lock shared by modals, drawers and panels.
 */
import { acquireScrollLock, releaseScrollLock } from '../scroll-lock';
import { hasScrollbar } from '../scrollbar';

jest.mock('../scrollbar', () => ({ hasScrollbar: jest.fn() }));

const html = document.documentElement;

afterEach(() => {
	html.className = '';
	hasScrollbar.mockReset();
});

describe('the scroll lock', () => {
	it('adds its class and, on a page with a scrollbar, the gutter class', () => {
		hasScrollbar.mockReturnValue(true);
		acquireScrollLock('has-a-open');

		expect(html.classList.contains('has-a-open')).toBe(true);
		expect(html.classList.contains('has-scroll-gutter')).toBe(true);

		releaseScrollLock('has-a-open');

		expect(html.className).toBe('');
	});

	it('adds no gutter class to a page without a scrollbar', () => {
		hasScrollbar.mockReturnValue(false);
		acquireScrollLock('has-a-open');

		expect(html.classList.contains('has-scroll-gutter')).toBe(false);

		releaseScrollLock('has-a-open');
	});

	it('measures only for the first lock: later ones inherit, whichever lets go first', () => {
		hasScrollbar.mockReturnValue(true);
		acquireScrollLock('has-a-open');

		// With the first lock on, the page's overflow is hidden and a
		// measurement would say there is no scrollbar.
		hasScrollbar.mockReturnValue(false);
		acquireScrollLock('has-b-open');

		expect(hasScrollbar).toHaveBeenCalledTimes(1);
		expect(html.classList.contains('has-scroll-gutter')).toBe(true);

		releaseScrollLock('has-a-open');

		expect(html.classList.contains('has-a-open')).toBe(false);
		expect(html.classList.contains('has-b-open')).toBe(true);
		expect(html.classList.contains('has-scroll-gutter')).toBe(true);

		releaseScrollLock('has-b-open');

		expect(html.className).toBe('');
	});

	it('counts holds of the same class: the last release removes it', () => {
		hasScrollbar.mockReturnValue(true);
		acquireScrollLock('has-a-open');
		acquireScrollLock('has-a-open');
		releaseScrollLock('has-a-open');

		expect(html.classList.contains('has-a-open')).toBe(true);
		expect(html.classList.contains('has-scroll-gutter')).toBe(true);

		releaseScrollLock('has-a-open');

		expect(html.className).toBe('');
	});

	it('ignores a release with nothing held', () => {
		releaseScrollLock('has-a-open');

		expect(html.className).toBe('');
	});
});
