/**
 * Internal dependencies
 */
import { toCssSpacingValue } from '../../../utils/spacing';

const AXIS_TO_FLEX_DIRECTION = {
	x: 'row',
	y: 'column',
};

const AXIS_TO_CONTAINER_HEIGHT = {
	x: 'auto',
	y: '400px',
};

/**
 * Resolve CSS variable values for base and breakpoint layers.
 *
 * @param {Object}   params                  Params object.
 * @param {Object}   params.baseOptions      Base carousel options.
 * @param {Object}   params.breakpointLayers Breakpoint layers.
 * @param {string[]} params.breakpointTokens Breakpoint token list.
 * @return {Object<string, Object<string, string>>} Resolved values by breakpoint.
 */
function resolveResponsiveValues({
	baseOptions,
	breakpointLayers,
	breakpointTokens,
}) {
	const baseSlidesToShow = baseOptions?.slidesToShow ?? 1;
	const baseAxis =
		typeof baseOptions?.axis === 'string' ? baseOptions.axis : 'x';
	const resolvedBaseAxis = ['x', 'y'].includes(baseAxis) ? baseAxis : 'x';
	const baseSlideGap =
		typeof baseOptions?.slideGap === 'string' ? baseOptions.slideGap : '';
	const resolvedValues = {
		base: getResolvedValues({
			slidesToShow: baseSlidesToShow,
			axis: resolvedBaseAxis,
			slideGap: baseSlideGap,
		}),
	};

	let previousSlidesToShow = baseSlidesToShow;
	let previousAxis = resolvedBaseAxis;
	let previousSlideGap = baseSlideGap;

	for (const breakpoint of breakpointTokens) {
		const options = breakpointLayers?.[breakpoint]?.options || {};
		previousSlidesToShow = options.slidesToShow ?? previousSlidesToShow;

		if (
			typeof options.axis === 'string' &&
			['x', 'y'].includes(options.axis)
		) {
			previousAxis = options.axis;
		}

		if (typeof options.slideGap === 'string' && options.slideGap !== '') {
			previousSlideGap = options.slideGap;
		}

		resolvedValues[breakpoint] = getResolvedValues({
			slidesToShow: previousSlidesToShow,
			axis: previousAxis,
			slideGap: previousSlideGap,
		});
	}

	return resolvedValues;
}

/**
 * Get resolved CSS values for one breakpoint.
 *
 * @param {Object}        params              Params object.
 * @param {string|number} params.slidesToShow Slides to show.
 * @param {string}        params.axis         Resolved axis.
 * @param {string}        params.slideGap     Resolved slide gap.
 * @return {Object<string, string>} Resolved values.
 */
function getResolvedValues({ slidesToShow, axis, slideGap }) {
	const cssSlideGap = toCssSpacingValue(slideGap);

	return {
		'slides-to-show': `${slidesToShow}`,
		direction: AXIS_TO_FLEX_DIRECTION[axis] ?? 'row',
		'container-height': AXIS_TO_CONTAINER_HEIGHT[axis] ?? 'auto',
		'slide--gap': cssSlideGap,
		'slide--gap-left': axis === 'x' ? cssSlideGap : '0',
		'slide--gap-top': axis === 'y' ? cssSlideGap : '0',
	};
}

/**
 * Build CSS rules from resolved breakpoint values.
 *
 * @param {string} params.selector         CSS selector.
 * @param {Object} params.resolvedValues   Resolved values by breakpoint.
 * @param {Object} params.breakpointConfig Breakpoint config.
 * @return {Array} CSS rules.
 */
function buildResponsiveRules({ selector, resolvedValues, breakpointConfig }) {
	if (!resolvedValues?.base) {
		return [];
	}

	const rules = [
		{
			selector,
			declarations: getCssDeclarations(resolvedValues.base),
		},
	];
	let previousValues = resolvedValues.base;

	for (const [breakpoint, config] of Object.entries(breakpointConfig)) {
		const values = resolvedValues[breakpoint];

		if (!values) {
			continue;
		}

		const changedValues = Object.fromEntries(
			Object.entries(values).filter(
				([key, value]) => previousValues[key] !== value
			)
		);

		previousValues = values;

		if (!Object.keys(changedValues).length || !config?.value) {
			continue;
		}

		rules.push({
			rulesGroup: `@media (min-width: ${config.value})`,
			selector,
			declarations: getCssDeclarations(changedValues),
		});
	}

	return rules;
}

/**
 * Get CSS declarations.
 *
 * @param {Object} values Resolved values.
 * @return {Object<string, string>} CSS declarations.
 */
function getCssDeclarations(values) {
	return Object.fromEntries(
		Object.entries(values).map(([key, value]) => [
			`--matter-carousel--${key}`,
			value,
		])
	);
}

/**
 * Compile CSS rules into a stylesheet string.
 *
 * @param {Array} rules CSS rules.
 * @return {string} Stylesheet.
 */
function compileCssRules(rules) {
	return rules
		.map(({ rulesGroup, selector, declarations }) => {
			const cssDeclarations = Object.entries(declarations)
				.map(([property, value]) => `${property}:${value}`)
				.join(';');
			const rule = `${selector}{${cssDeclarations}}`;

			return rulesGroup ? `${rulesGroup}{${rule}}` : rule;
		})
		.join('');
}

/**
 * Build carousel stylesheet for editor rendering.
 *
 * @param {string}   selector                CSS selector.
 * @param {Object}   params                  Params object.
 * @param {Object}   params.baseOptions      Base carousel options.
 * @param {Object}   params.breakpointLayers Breakpoint layers.
 * @param {string[]} params.breakpointTokens Breakpoint token list.
 * @param {Object}   params.breakpointConfig Breakpoint config.
 * @return {string} Stylesheet.
 */
export function buildCarouselStylesheet(
	selector,
	{ baseOptions, breakpointLayers, breakpointTokens, breakpointConfig }
) {
	const resolvedValues = resolveResponsiveValues({
		baseOptions,
		breakpointLayers,
		breakpointTokens,
	});
	const rules = buildResponsiveRules({
		selector,
		resolvedValues,
		breakpointConfig,
	});

	return compileCssRules(rules);
}
