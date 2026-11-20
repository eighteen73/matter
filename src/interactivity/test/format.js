import { format } from '../format';

describe('format', () => {
	it('fills numbered placeholders, in any order', () => {
		expect(format('%1$d of %2$d', 2, 5)).toBe('2 of 5');
		expect(format('%2$d من %1$d', 2, 5)).toBe('5 من 2');
	});

	it('fills plain %d and %s in order', () => {
		expect(format('Go to slide %d', 3)).toBe('Go to slide 3');
		expect(format('%s of %s', 1, 4)).toBe('1 of 4');
	});

	it('accepts %s where the source says %d, and the reverse', () => {
		expect(format('%1$s of %2$s', 1, 4)).toBe('1 of 4');
		expect(format('Image %1$d: %3$s', 1, 4, 'A cat')).toBe(
			'Image 1: A cat'
		);
	});

	it('uses a value more than once', () => {
		expect(format('%1$d (%1$d of %2$d)', 2, 5)).toBe('2 (2 of 5)');
	});

	it('leaves a placeholder with no value as written', () => {
		expect(format('%1$d of %2$d', 2)).toBe('2 of %2$d');
	});

	it('keeps values literal', () => {
		expect(format('%1$s', '$& and %2$d')).toBe('$& and %2$d');
	});

	it('writes %% as a percent sign', () => {
		expect(format('%1$d%% done', 40)).toBe('40% done');
	});
});
