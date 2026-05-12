/**
 * Shallow-merge Embla options: when mergeWithBase is true, advanced keys override base; callers must still apply structural keys (container, slides) after this.
 *
 * @param {Object}   args
 * @param {Object}   args.baseOptions       Resolved UI / default options.
 * @param {Object}   args.advancedOptions   Parsed advanced JSON object.
 * @param {boolean}  args.mergeWithBase     When false, use advanced only (fallback to base if advanced empty).
 * @return {Object}  Merged options without container/slides.
 */
export function buildMergedEmblaOptions({
	baseOptions,
	advancedOptions,
	mergeWithBase,
}) {
	const base =
		baseOptions &&
		typeof baseOptions === 'object' &&
		!Array.isArray(baseOptions)
			? { ...baseOptions }
			: {};

	const advanced =
		advancedOptions &&
		typeof advancedOptions === 'object' &&
		!Array.isArray(advancedOptions)
			? { ...advancedOptions }
			: {};

	if (mergeWithBase !== false) {
		return { ...base, ...advanced };
	}

	if (Object.keys(advanced).length === 0) {
		return base;
	}

	return { ...advanced };
}
