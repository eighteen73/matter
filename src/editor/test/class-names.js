/**
 * Internal dependencies
 */
import { cleanClass, hasVariant, schemeClasses } from '../class-names';

const schemes = [{ slug: 'default' }, { slug: 'brand' }, { slug: 'Odd Name!' }];

describe('schemeClasses', () => {
	it('gives a defined scheme its classes', () => {
		expect(schemeClasses('brand', schemes)).toEqual([
			'has-scheme',
			'has-scheme-brand',
		]);
	});

	it('gives a scheme the theme no longer defines nothing, so it inherits', () => {
		expect(schemeClasses('gone', schemes)).toEqual([]);
		expect(schemeClasses('brand', [])).toEqual([]);
		expect(schemeClasses('brand', undefined)).toEqual([]);
	});

	it('gives no scheme nothing', () => {
		expect(schemeClasses(undefined, schemes)).toEqual([]);
		expect(schemeClasses('', schemes)).toEqual([]);
	});

	it('cleans the slug as PHP does', () => {
		expect(schemeClasses('Odd Name!', schemes)).toEqual([
			'has-scheme',
			'has-scheme-OddName',
		]);
		expect(cleanClass('a%20b c_d-e')).toBe('abc_d-e');
	});
});

describe('hasVariant', () => {
	const names = ['default', 'feature'];

	it('is true for a registered variant', () => {
		expect(hasVariant('is-style-feature', names)).toBe(true);
		expect(hasVariant('foo is-style-default bar', names)).toBe(true);
	});

	it('is false with no variant class, or one that was removed', () => {
		expect(hasVariant('', names)).toBe(false);
		expect(hasVariant(undefined, names)).toBe(false);
		expect(hasVariant('has-x', names)).toBe(false);
		expect(hasVariant('is-style-removed', names)).toBe(false);
		expect(hasVariant('is-style-removed', undefined)).toBe(false);
	});

	it('looks at every variant class', () => {
		expect(hasVariant('is-style-removed is-style-feature', names)).toBe(
			true
		);
	});

	it('does not match part of a longer name', () => {
		expect(hasVariant('is-style-feature-wide', names)).toBe(false);
		expect(hasVariant('not-is-style-feature', names)).toBe(false);
	});
});
