/**
 * Internal dependencies
 */
import {
	buildResponsiveSpacingCssVars,
	toCssSpacingValue,
} from '../../../utils/spacing';

const AXIS_TO_FLEX_DIRECTION = {
	x: 'row',
	y: 'column',
};

const AXIS_TO_CONTAINER_HEIGHT = {
	x: 'auto',
	y: '400px',
};

/**
 * Build responsive slides-to-show CSS custom properties.
 *
 * @param {Object}   params                  Params object.
 * @param {Object}   params.baseOptions      Base carousel options.
 * @param {Object}   params.breakpointLayers Breakpoint layers.
 * @param {string[]} params.breakpointTokens Breakpoint token list.
 * @return {Object<string, string|number>}    CSS variable map.
 */
function buildSlidesToShowCssVars({
	baseOptions,
	breakpointLayers,
	breakpointTokens,
}) {
	const baseSlidesToShow = baseOptions?.slidesToShow ?? 1;
	const styles = {
		'--wp--custom--matter-carousel--slides-to-show-base': baseSlidesToShow,
	};
	let previousValue = baseSlidesToShow;

	for (const breakpoint of breakpointTokens) {
		previousValue =
			breakpointLayers?.[breakpoint]?.options?.slidesToShow ??
			previousValue;
		styles[`--wp--custom--matter-carousel--slides-to-show-${breakpoint}`] =
			previousValue;
	}

	return styles;
}

/**
 * Build responsive direction CSS custom properties.
 *
 * @param {Object}   params                  Params object.
 * @param {Object}   params.baseOptions      Base carousel options.
 * @param {Object}   params.breakpointLayers Breakpoint layers.
 * @param {string[]} params.breakpointTokens Breakpoint token list.
 * @return {Object<string, string>}           CSS variable map.
 */
function buildDirectionCssVars({
	baseOptions,
	breakpointLayers,
	breakpointTokens,
}) {
	const baseAxis =
		typeof baseOptions?.axis === 'string' ? baseOptions.axis : 'x';
	const baseDirection = AXIS_TO_FLEX_DIRECTION[baseAxis] ?? 'row';
	const styles = {
		'--wp--custom--matter-carousel--direction-base': baseDirection,
	};

	for (const breakpoint of breakpointTokens) {
		const breakpointAxis =
			breakpointLayers?.[breakpoint]?.options?.axis ?? baseAxis;
		styles[`--wp--custom--matter-carousel--direction-${breakpoint}`] =
			AXIS_TO_FLEX_DIRECTION[breakpointAxis] ?? baseDirection;
	}

	return styles;
}

/**
 * Build responsive container height CSS custom properties.
 *
 * @param {Object}   params                  Params object.
 * @param {Object}   params.baseOptions      Base carousel options.
 * @param {Object}   params.breakpointLayers Breakpoint layers.
 * @param {string[]} params.breakpointTokens Breakpoint token list.
 * @return {Object<string, string>}           CSS variable map.
 */
function buildContainerHeightCssVars({
	baseOptions,
	breakpointLayers,
	breakpointTokens,
}) {
	const baseAxis =
		typeof baseOptions?.axis === 'string' ? baseOptions.axis : 'x';
	const baseHeight = AXIS_TO_CONTAINER_HEIGHT[baseAxis] ?? 'auto';
	const styles = {
		'--wp--custom--matter-carousel--container-height-base': baseHeight,
	};

	for (const breakpoint of breakpointTokens) {
		const breakpointAxis =
			breakpointLayers?.[breakpoint]?.options?.axis ?? baseAxis;
		styles[
			`--wp--custom--matter-carousel--container-height-${breakpoint}`
		] = AXIS_TO_CONTAINER_HEIGHT[breakpointAxis] ?? baseHeight;
	}

	return styles;
}

/**
 * Build axis-aware responsive slide gap offset CSS custom properties.
 *
 * @param {Object}   params                  Params object.
 * @param {Object}   params.baseOptions      Base carousel options.
 * @param {Object}   params.breakpointLayers Breakpoint layers.
 * @param {string[]} params.breakpointTokens Breakpoint token list.
 * @return {Object<string, string>}           CSS variable map.
 */
function buildSlideGapOffsetCssVars({
	baseOptions,
	breakpointLayers,
	breakpointTokens,
}) {
	const baseAxis =
		typeof baseOptions?.axis === 'string' ? baseOptions.axis : 'x';
	const resolvedBaseAxis = ['x', 'y'].includes(baseAxis) ? baseAxis : 'x';
	const baseSlideGap =
		typeof baseOptions?.slideGap === 'string' ? baseOptions.slideGap : '';
	const styles = getSlideGapOffsetCssVars({
		breakpoint: 'base',
		axis: resolvedBaseAxis,
		slideGap: baseSlideGap,
	});

	for (const breakpoint of breakpointTokens) {
		const breakpointAxis =
			breakpointLayers?.[breakpoint]?.options?.axis ?? resolvedBaseAxis;
		const resolvedBreakpointAxis = ['x', 'y'].includes(breakpointAxis)
			? breakpointAxis
			: resolvedBaseAxis;
		const breakpointSlideGap =
			breakpointLayers?.[breakpoint]?.options?.slideGap || '';
		Object.assign(
			styles,
			getSlideGapOffsetCssVars({
				breakpoint,
				axis: resolvedBreakpointAxis,
				slideGap: breakpointSlideGap || baseSlideGap,
			})
		);
	}

	return styles;
}

/**
 * Get slide gap offset CSS variables for a single breakpoint.
 *
 * @param {Object} params            Params object.
 * @param {string} params.breakpoint Breakpoint token.
 * @param {string} params.axis       Resolved axis.
 * @param {string} params.slideGap   Resolved slide gap.
 * @return {Object<string, string>}   CSS variable map.
 */
function getSlideGapOffsetCssVars({ breakpoint, axis, slideGap }) {
	const cssSlideGap = toCssSpacingValue(slideGap);

	return {
		[`--wp--custom--matter-carousel--slide--gap-left-${breakpoint}`]:
			axis === 'x' ? cssSlideGap : '0',
		[`--wp--custom--matter-carousel--slide--gap-top-${breakpoint}`]:
			axis === 'y' ? cssSlideGap : '0',
	};
}

/**
 * Build carousel CSS custom properties for editor rendering.
 *
 * @param {Object}   params                  Params object.
 * @param {Object}   params.baseOptions      Base carousel options.
 * @param {Object}   params.breakpointLayers Breakpoint layers.
 * @param {string[]} params.breakpointTokens Breakpoint token list.
 * @return {Object<string, string|number>}    CSS variable map.
 */
export function buildCarouselStyleVars({
	baseOptions,
	breakpointLayers,
	breakpointTokens,
}) {
	return {
		...buildSlidesToShowCssVars({
			baseOptions,
			breakpointLayers,
			breakpointTokens,
		}),
		...buildDirectionCssVars({
			baseOptions,
			breakpointLayers,
			breakpointTokens,
		}),
		...buildContainerHeightCssVars({
			baseOptions,
			breakpointLayers,
			breakpointTokens,
		}),
		...buildResponsiveSpacingCssVars({
			prefix: '--wp--custom--matter-carousel--slide--gap',
			baseValue: baseOptions?.slideGap,
			breakpointLayers,
			breakpointTokens,
		}),
		...buildSlideGapOffsetCssVars({
			baseOptions,
			breakpointLayers,
			breakpointTokens,
		}),
	};
}
