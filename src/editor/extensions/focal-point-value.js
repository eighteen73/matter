/**
 * A post's focal point from its meta: `{ x, y }` as fractions, or nothing.
 * Meta that isn't an object (a string, a number, `false` for no value), or a
 * point without numbers, is no point.
 *
 * @param {*} value The meta value.
 * @return {{x: number, y: number}|undefined} The point, if there is one.
 */
export const validPoint = (value) =>
	value &&
	typeof value === 'object' &&
	Number.isFinite(value.x) &&
	Number.isFinite(value.y)
		? value
		: undefined;
