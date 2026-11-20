/**
 * The hash as an ID: decoded, and not thrown on by invalid percent-encoding.
 */
import { hashId } from '../hash';

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
