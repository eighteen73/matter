import { toCssSpacingValue } from './spacing';

const CORNER_SIDES = {
	'top-right': ['top', 'right'],
	'top-left': ['top', 'left'],
};

/**
 * Build inline position styles for the close block.
 *
 * @param {string} position       Placement (`inline`, `top-left`, or `top-right`).
 * @param {string} positionOffset Inset value.
 * @return {Object<string, string>} Style object.
 */
export function getPositionStyles(position, positionOffset = '0') {
	if (position === 'inline' || !CORNER_SIDES[position]) {
		return {};
	}

	const sides = CORNER_SIDES[position];
	const cssOffset = toCssSpacingValue(positionOffset);

	return {
		position: 'absolute',
		[sides[0]]: cssOffset,
		[sides[1]]: cssOffset,
	};
}
