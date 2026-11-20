/**
 * Internal dependencies
 */
import { withScheme } from '../with-scheme';

describe('withScheme', () => {
	it('adds https:// to an address typed without it', () => {
		expect(withScheme('instagram.com/shop')).toBe(
			'https://instagram.com/shop'
		);
		expect(withScheme(' www.example.com ')).toBe('https://www.example.com');
		expect(withScheme('//example.com')).toBe('https://example.com');
	});

	it('leaves full, relative, other-scheme and empty values alone', () => {
		[
			'https://example.com',
			'http://example.com',
			'mailto:shop@example.com',
			'/contact/',
			'#top',
			'contact-us',
			'about/team',
			'./x',
			'../x',
			'../../a/b',
			'..',
			'',
		].forEach((value) => expect(withScheme(value)).toBe(value));
	});

	it('treats what a browser reads as another site as an address, as the server does', () => {
		expect(withScheme('/\t/evil.com')).toBe('https://evil.com');
		expect(withScheme('//\\evil.com')).toBe('https://evil.com');
		expect(withScheme('/%2F%2Fevil.com')).toBe('/%2F%2Fevil.com');
		expect(withScheme('/a b')).toBe('/a b');
	});
});
