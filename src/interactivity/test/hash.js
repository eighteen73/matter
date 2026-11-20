/**
 * The hash as an ID: decoded, and not thrown on by invalid percent-encoding.
 */
import { hashId, scrollWhenShown } from '../hash';

describe('hashId', () => {
	it('decodes an encoded hash', () => {
		expect(hashId('#caf%C3%A9')).toBe('café');
		expect(hashId('plain')).toBe('plain');
		expect(hashId('')).toBe('');
	});

	it('returns an invalid encoding as it is, not an error', () => {
		expect(() => hashId('#%E0%A4%A')).not.toThrow();
		expect(hashId('#%E0%A4%A')).toBe('%E0%A4%A');
	});

	it('reads the page hash by default', () => {
		window.location.hash = '#%E0%A4%A';

		expect(hashId()).toBe('%E0%A4%A');

		window.location.hash = '';
	});
});

describe('scrollWhenShown', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('waits until the element is rendered, then scrolls once', () => {
		let shown = false;
		const target = {
			checkVisibility: () => shown,
			scrollIntoView: jest.fn(),
		};

		scrollWhenShown(target);
		jest.advanceTimersByTime(16);
		expect(target.scrollIntoView).not.toHaveBeenCalled();

		shown = true;
		jest.advanceTimersByTime(16);
		expect(target.scrollIntoView).toHaveBeenCalledTimes(1);
		expect(target.scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
	});

	it('gives up waiting after a while, and scrolls anyway', () => {
		const target = {
			checkVisibility: () => false,
			scrollIntoView: jest.fn(),
		};

		scrollWhenShown(target, 3);
		jest.advanceTimersByTime(200);
		expect(target.scrollIntoView).toHaveBeenCalledTimes(1);
	});
});
