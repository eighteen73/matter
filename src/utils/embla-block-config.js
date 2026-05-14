import ClassNames from 'embla-carousel-class-names';
import Autoplay from 'embla-carousel-autoplay';
import AutoScroll from 'embla-carousel-auto-scroll';

import breakpoints, {
	breakpointTokens,
	emblaMinWidthQuery,
} from '../constants/breakpoints';

export const DEFAULT_EMBLA_CONFIG = {
	options: {
		loop: false,
		axis: 'x',
		slidesToScroll: 1,
	},
	plugins: {
		autoplay: {
			active: false,
			type: 'normal',
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

/**
 * Normalize a raw `emblaConfig` value (or undefined) against the block defaults,
 * so consumers always see the full `{ options, plugins, breakpointLayers }` shape.
 *
 * @param {Object|undefined} input
 * @return {Object}
 */
export const normalizeEmblaConfig = (input) =>
	deepMerge(DEFAULT_EMBLA_CONFIG, isPlainObject(input) ? input : {});

/**
 * Apply per-breakpoint partials to a resolved Embla config. Per-token
 * `options` partials are written into `options.breakpoints[(min-width: Npx)]`
 * (the nested shape Embla's `OptionsHandler.optionsAtMedia` reads — flat
 * media-query keys on the root options are silently ignored). Per-token
 * plugin partials are written into each plugin's own `breakpoints` map
 * (same shape — Autoplay/AutoScroll inherit `breakpoints` from Embla's
 * `CreateOptionsType`).
 *
 * Tokens are iterated in ascending min-width order so wider breakpoints win
 * when Embla merges overlapping matches.
 *
 * @param {Object} resolved
 * @param {Object} [layers]
 * @return {{ options: Object, plugins: Object }}
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

	for (const token of breakpointTokens) {
		const layer = safeLayers[token];
		const px = breakpoints[token]?.px;

		if (!isPlainObject(layer) || !px) {
			continue;
		}

		const query = emblaMinWidthQuery(px);

		if (
			isPlainObject(layer.options) &&
			Object.keys(layer.options).length
		) {
			optionBreakpoints[query] = isPlainObject(
				optionBreakpoints[query]
			)
				? deepMerge(optionBreakpoints[query], layer.options)
				: { ...layer.options };
		}

		if (!isPlainObject(layer.plugins)) {
			continue;
		}

		for (const pluginKey of Object.keys(layer.plugins)) {
			const pluginLayer = layer.plugins[pluginKey];

			if (
				!isPlainObject(pluginLayer) ||
				!Object.keys(pluginLayer).length
			) {
				continue;
			}

			const existingPlugin = isPlainObject(plugins[pluginKey])
				? { ...plugins[pluginKey] }
				: {};
			const existingBreakpoints = isPlainObject(
				existingPlugin.breakpoints
			)
				? { ...existingPlugin.breakpoints }
				: {};

			existingBreakpoints[query] = isPlainObject(
				existingBreakpoints[query]
			)
				? deepMerge(existingBreakpoints[query], pluginLayer)
				: { ...pluginLayer };

			existingPlugin.breakpoints = existingBreakpoints;
			plugins[pluginKey] = existingPlugin;
		}
	}

	if (Object.keys(optionBreakpoints).length) {
		options.breakpoints = optionBreakpoints;
	}

	return { options, plugins };
};

/**
 * Produce the merged Embla options and plugin state from the block's
 * `emblaConfig`, the advanced JSON override, and the merge flag.
 *
 * - When `advancedEmblaConfigMerge` is `true`, the advanced JSON is deep-merged
 *   on top of the UI-driven `emblaConfig`.
 * - When `false` and the advanced object is non-empty, the advanced JSON is
 *   layered on the schema defaults — i.e. the JSON is authoritative and the UI
 *   panel is ignored.
 * - When `false` and the advanced object is empty, the UI-driven `emblaConfig`
 *   is used as-is.
 *
 * After resolving the base shape, per-breakpoint partials in
 * `emblaConfig.breakpointLayers` are compiled into Embla's responsive
 * media-query keys on both core options and plugin options.
 *
 * @param {Object}  args
 * @param {Object}  [args.emblaConfig]
 * @param {Object}  [args.advancedEmblaConfig]
 * @param {boolean} [args.advancedEmblaConfigMerge]
 * @return {{ emblaOptions: Object, pluginState: Object }}
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
 * Build the Embla plugin array for the given normalized plugin state.
 *
 * Both `Autoplay` and `AutoScroll` are always registered so the autoplay
 * `type` can switch between them per-breakpoint via Embla's plugin
 * breakpoints API: only the plugin matching the effective `type` is left
 * `active` at any given media query, the other is forced inactive.
 *
 * Any non-`active`/`type` autoplay fields (e.g. `speed`, `delay`) are passed
 * through to both plugins; each plugin ignores options it doesn't recognise.
 *
 * @param {Object}  pluginState
 * @param {Object}  [opts]
 * @param {boolean} [opts.forceInactive] Force autoplay/auto-scroll off (e.g. in the editor preview).
 * @return {Array}
 */
export const buildEmblaPlugins = (pluginState, { forceInactive = false } = {}) => {
	const plugins = [ClassNames()];
	const autoplay = isPlainObject(pluginState?.autoplay)
		? pluginState.autoplay
		: {};
	const {
		active: baseActive = false,
		type: baseType = 'normal',
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
				layerActiveRaw !== undefined
					? !!layerActiveRaw
					: !!baseActive;
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
