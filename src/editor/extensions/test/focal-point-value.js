/**
 * Internal dependencies
 */
import { validPoint } from '../focal-point-value';

describe('validPoint', () => {
	it('keeps a point with numbers', () => {
		const point = { x: 0.25, y: 1 };

		expect(validPoint(point)).toBe(point);
		expect(validPoint({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
	});

	it('treats anything else as no point', () => {
		[
			undefined,
			null,
			false,
			'',
			'0.5,0.5',
			0.5,
			[],
			{},
			{ x: 0.5 },
			{ x: '0.5', y: '0.5' },
			{ x: NaN, y: 0.5 },
		].forEach((value) => expect(validPoint(value)).toBeUndefined());
	});
});
