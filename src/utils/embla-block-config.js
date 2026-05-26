import ClassNames from 'embla-carousel-class-names';
import Autoplay from 'embla-carousel-autoplay';
import AutoScroll from 'embla-carousel-auto-scroll';

import breakpoints, {
	breakpointTokens,
	minWidthQuery,
} from '../constants/breakpoints/data';

export const DEFAULT_EMBLA_CONFIG = {
	options: {
		loop: false,
		axis: 'x',
		slidesToScroll: 1,
		active: true,
	},
	plugins: {
		autoplay: {
			active: false,
			type: 'slide',
			speed: 1,
		},
	},
	breakpointLayers: {},
};

const isPlainObject = (value) =>
	value !== null && typeof value === 'object' && !Array.isArray(value);

const deepMerge = (target, source) => {
	if (!isPlainObject(source)) {
		return isPlainObject(target) ? { ...target } : {};
	}
	const base = isPlainObject(target) ? { ...target } : {};
	for (const key of Object.keys(source)) {
		const next = source[key];
		const prev = base[key];
		base[key] =
			isPlainObject(prev) && isPlainObject(next)
				? deepMerge(prev, next)
				: next;
	}
	return base;
};

/** @param {Object|undefined} input */
export const normalizeEmblaConfig = (input) =>
	deepMerge(DEFAULT_EMBLA_CONFIG, isPlainObject(input) ? input : {});

/**
 * Compile UI `breakpointLayers` into Embla `options.breakpoints` and
 * `plugins.autoplay.breakpoints` (ascending min-width).
 * @param {Object} resolved - The resolved Embla config.
 * @param {Object} layers   - The breakpoint layers.
 */
const applyBreakpointLayers = (resolved, layers) => {
	const safeResolved = isPlainObject(resolved) ? resolved : {};
	const safeLayers = isPlainObject(layers) ? layers : {};
	const options = isPlainObject(safeResolved.options)
		? { ...safeResolved.options }
		: {};
	const plugins = isPlainObject(safeResolved.plugins)
		? { ...safeResolved.plugins }
		: {};

	const optionBreakpoints = isPlainObject(options.breakpoints)
		? { ...options.breakpoints }
		: {};

	let autoplay = isPlainObject(plugins.autoplay)
		? { ...plugins.autoplay }
		: {};
	const autoplayBreakpoints = isPlainObject(autoplay.breakpoints)
		? { ...autoplay.breakpoints }
		: {};

	for (const token of breakpointTokens) {
		const layer = safeLayers[token];
		const px = breakpoints[token]?.px;

		if (!isPlainObject(layer) || !px) {
			continue;
		}

		const query = minWidthQuery(px);

		if (isPlainObject(layer.options) && Object.keys(layer.options).length) {
			optionBreakpoints[query] = isPlainObject(optionBreakpoints[query])
				? deepMerge(optionBreakpoints[query], layer.options)
				: { ...layer.options };
		}

		const autoplayLayer = layer.plugins?.autoplay;
		if (isPlainObject(autoplayLayer) && Object.keys(autoplayLayer).length) {
			autoplayBreakpoints[query] = isPlainObject(
				autoplayBreakpoints[query]
			)
				? deepMerge(autoplayBreakpoints[query], autoplayLayer)
				: { ...autoplayLayer };
		}
	}

	if (Object.keys(optionBreakpoints).length) {
		options.breakpoints = optionBreakpoints;
	}
	if (Object.keys(autoplayBreakpoints).length) {
		autoplay = { ...autoplay, breakpoints: autoplayBreakpoints };
		plugins.autoplay = autoplay;
	}

	return { options, plugins };
};

/**
 * @param {Object}  args
 * @param {Object}  [args.emblaConfig]
 * @param {Object}  [args.advancedEmblaConfig]
 * @param {boolean} [args.advancedEmblaConfigMerge]
 */
export const prepareEmblaBlockState = ({
	emblaConfig,
	advancedEmblaConfig,
	advancedEmblaConfigMerge,
} = {}) => {
	const base = normalizeEmblaConfig(emblaConfig);
	const advanced = isPlainObject(advancedEmblaConfig)
		? advancedEmblaConfig
		: {};
	const mergeWithBase = advancedEmblaConfigMerge === true;
	const hasAdvanced = Object.keys(advanced).length > 0;

	let resolved;
	if (mergeWithBase) {
		resolved = deepMerge(base, advanced);
	} else if (hasAdvanced) {
		resolved = deepMerge(DEFAULT_EMBLA_CONFIG, advanced);
	} else {
		resolved = base;
	}

	const compiled = applyBreakpointLayers(resolved, resolved.breakpointLayers);

	return {
		emblaOptions: compiled.options,
		pluginState: compiled.plugins,
	};
};

/**
 * Register ClassNames plus Autoplay and AutoScroll (mutually exclusive via
 * `active` / per-breakpoint `type`) so responsive autoplay type can switch.
 * @param {Object}  pluginState                 - The plugin state.
 * @param {boolean} [pluginState.forceInactive] - The force inactive flag.
 */
export const buildEmblaPlugins = (
	pluginState,
	{ forceInactive = false } = {}
) => {
	const plugins = [ClassNames()];
	const autoplay = isPlainObject(pluginState?.autoplay)
		? pluginState.autoplay
		: {};
	const {
		active: baseActive = false,
		type: baseType = 'slide',
		breakpoints: rawBreakpoints,
		...rest
	} = autoplay;

	const wantBaseActive = !forceInactive && !!baseActive;
	const autoplayBaseActive = wantBaseActive && baseType !== 'scroll';
	const autoScrollBaseActive = wantBaseActive && baseType === 'scroll';

	const autoplayBreakpoints = {};
	const autoScrollBreakpoints = {};

	if (isPlainObject(rawBreakpoints)) {
		for (const [query, rawLayer] of Object.entries(rawBreakpoints)) {
			if (!isPlainObject(rawLayer)) {
				continue;
			}
			const {
				active: layerActiveRaw,
				type: layerTypeRaw,
				...layerRest
			} = rawLayer;
			const effectiveActive =
				layerActiveRaw !== undefined ? !!layerActiveRaw : !!baseActive;
			const effectiveType =
				layerTypeRaw !== undefined ? layerTypeRaw : baseType;
			const wantLayerActive = !forceInactive && effectiveActive;
			autoplayBreakpoints[query] = {
				...layerRest,
				active: wantLayerActive && effectiveType !== 'scroll',
			};
			autoScrollBreakpoints[query] = {
				...layerRest,
				active: wantLayerActive && effectiveType === 'scroll',
			};
		}
	}

	const sharedOptions = { speed: 1, ...rest };

	const autoplayOptions = {
		...sharedOptions,
		active: autoplayBaseActive,
	};
	if (Object.keys(autoplayBreakpoints).length) {
		autoplayOptions.breakpoints = autoplayBreakpoints;
	}
	plugins.push(Autoplay(autoplayOptions));

	const autoScrollOptions = {
		...sharedOptions,
		active: autoScrollBaseActive,
	};
	if (Object.keys(autoScrollBreakpoints).length) {
		autoScrollOptions.breakpoints = autoScrollBreakpoints;
	}
	plugins.push(AutoScroll(autoScrollOptions));

	return plugins;
};
