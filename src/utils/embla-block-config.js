import ClassNames from 'embla-carousel-class-names';
import Autoplay from 'embla-carousel-autoplay';
import AutoScroll from 'embla-carousel-auto-scroll';

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
 * so consumers always see the full `{ options, plugins }` shape.
 *
 * @param {Object|undefined} input
 * @return {Object}
 */
export const normalizeEmblaConfig = (input) =>
	deepMerge(DEFAULT_EMBLA_CONFIG, isPlainObject(input) ? input : {});

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

	return {
		emblaOptions: isPlainObject(resolved.options) ? resolved.options : {},
		pluginState: isPlainObject(resolved.plugins) ? resolved.plugins : {},
	};
};

/**
 * Build the Embla plugin array for the given normalized plugin state.
 * Currently wires ClassNames plus either Autoplay or AutoScroll depending on
 * `pluginState.autoplay.type`.
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
	const { active = false, type = 'normal', ...rest } = autoplay;
	const pluginOptions = {
		speed: 1,
		...rest,
		active: forceInactive ? false : !!active,
	};

	if (type === 'scroll') {
		plugins.push(AutoScroll(pluginOptions));
	} else {
		plugins.push(Autoplay(pluginOptions));
	}

	return plugins;
};
