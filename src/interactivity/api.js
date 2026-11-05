/**
 * Matter's public JavaScript API, shared by every interactive block.
 *
 *     matter.carousel( 'hero' )?.goTo( 2 );
 *     matter.ready( 'faq' ).then( ( accordion ) => accordion.open( 0 ) );
 *     document.addEventListener( 'matter-tabs-change', ( event ) => … );
 *
 * `matter.{type}( target )` returns a block's instance: methods plus read-only
 * state. `target` is an element ID (usually the block's HTML anchor) or an
 * element; it resolves to that block, or the first one of the type inside it.
 * Instances exist once the block has started (after hydration), when it
 * dispatches `matter-{type}-ready`; `matter.ready( target )` waits for that.
 *
 * Each block's script module bundles this file, so state lives on
 * `window.matter`, shared between them.
 */

const api = () => {
	window.matter ??= {};

	const matter = window.matter;

	// Element => { type, instance }.
	matter._instances ??= new WeakMap();
	matter._selectors ??= {};
	matter._waiting ??= [];
	matter.ready ??= ready;

	return matter;
};

/**
 * The element a target refers to, for a block selector.
 *
 * @param {string|Element} target   Element ID or element.
 * @param {string}         selector Block selector.
 * @return {Element|null} Block element.
 */
export function resolve(target, selector) {
	const element =
		typeof target === 'string' ? document.getElementById(target) : target;

	if (!(element instanceof window.Element)) {
		return null;
	}

	return element.matches(selector)
		? element
		: (element.querySelector(selector) ?? element.closest(selector));
}

/**
 * Resolves with a block's instance once it has started.
 *
 * @param {string|Element} target Element ID or element.
 * @return {Promise<Object>} Instance.
 */
function ready(target) {
	const matter = api();

	return new Promise((resolvePromise) => {
		const find = () => {
			// The target itself first, then a block inside (or around) it.
			const own = matter._instances.get(
				typeof target === 'string'
					? document.getElementById(target)
					: target
			);

			if (own) {
				resolvePromise(own.instance);

				return true;
			}

			for (const selector of Object.values(matter._selectors)) {
				const element = resolve(target, selector);
				const entry = element && matter._instances.get(element);

				if (entry) {
					resolvePromise(entry.instance);

					return true;
				}
			}

			return false;
		};

		if (!find()) {
			matter._waiting.push(find);
		}
	});
}

/**
 * Register a block type: adds `matter.{type}( target )`.
 *
 * @param {string} type     Type, e.g. 'carousel'.
 * @param {string} selector Block selector.
 */
export function registerType(type, selector) {
	const matter = api();

	matter._selectors[type] = selector;
	matter[type] ??= (target) => {
		const element = resolve(target, selector);

		return element
			? (matter._instances.get(element)?.instance ?? null)
			: null;
	};
}

/**
 * Register a block's instance and announce it (`matter-{type}-ready`).
 *
 * @param {string}  type     Type.
 * @param {Element} element  Block element.
 * @param {Object}  instance Instance.
 */
export function registerInstance(type, element, instance) {
	const matter = api();

	matter._instances.set(element, { type, instance });
	matter._waiting = matter._waiting.filter((find) => !find());
	emit(element, type, 'ready', { instance });
}

/**
 * Dispatch `matter-{type}-{name}` from a block. `detail.id` is the block's ID.
 *
 * @param {Element} element Block element.
 * @param {string}  type    Type.
 * @param {string}  name    Event name.
 * @param {Object}  detail  Event detail.
 */
export function emit(element, type, name, detail = {}) {
	element.dispatchEvent(
		new CustomEvent(`matter-${type}-${name}`, {
			bubbles: true,
			detail: { id: element.id || null, ...detail },
		})
	);
}

/**
 * Whether an action was called by a directive (with an event, or nothing)
 * rather than through the API (with a target).
 *
 * @param {*} target First argument.
 * @return {boolean} From a directive.
 */
export const fromDirective = (target) =>
	target === undefined || target instanceof Event;
