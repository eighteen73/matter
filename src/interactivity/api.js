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
 * `window.matter`, shared between them. A small stub printed in the page's
 * head (Assets::api_stub()) defines `matter.ready()` and the accessors before
 * any module loads, so theme scripts can call them early, or on pages
 * without the block; the first module to load takes over its queue.
 */

const api = () => {
	window.matter ??= {};

	const matter = window.matter;

	// Element => { type, instance }.
	matter._instances ??= new WeakMap();
	matter._selectors ??= {};
	matter._waiting ??= [];

	if (matter._stub || !matter.ready) {
		const queued = matter._queue ?? [];

		matter._stub = false;
		matter._queue = [];
		matter.ready = ready;
		queued.forEach(([target, resolvePromise]) =>
			ready(target).then(resolvePromise)
		);
	}

	return matter;
};

/**
 * A target as an element.
 *
 * @param {string|Element} target Element ID or element.
 * @return {Element|null} Element.
 */
const toElement = (target) => {
	const element =
		typeof target === 'string' ? document.getElementById(target) : target;

	return element instanceof window.Element ? element : null;
};

/**
 * The Matter block a target refers to, of any type: the target itself if
 * it's one (even if it hasn't started yet, so a block nested inside it isn't
 * mistaken for it), else the first block inside it in page order, else the
 * block around it.
 *
 * @param {string|Element} target Element ID or element.
 * @return {Element|null} Block element.
 */
const blockFor = (target) => {
	const element = toElement(target);
	const selectors = Object.values(api()._selectors);

	if (!element || !selectors.length) {
		return null;
	}

	if (selectors.some((selector) => element.matches(selector))) {
		return element;
	}

	const any = selectors.join(',');

	return element.querySelector(any) ?? element.closest(any);
};

/**
 * The element a target refers to, for a block selector.
 *
 * @param {string|Element} target   Element ID or element.
 * @param {string}         selector Block selector.
 * @return {Element|null} Block element.
 */
export function resolve(target, selector) {
	const element = toElement(target);

	if (!element) {
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
			const element = blockFor(target);
			const entry = element && matter._instances.get(element);

			if (entry) {
				resolvePromise(entry.instance);
			}

			return !!entry;
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

	// The head stub's placeholder (returns null) gives way to the real one.
	if (matter[type] && !matter[type]._stub) {
		return;
	}

	matter[type] = (target) => {
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
