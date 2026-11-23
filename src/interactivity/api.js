/**
 * Matter's public JavaScript API, shared by every interactive block.
 *
 *     matter.carousel( 'hero' )?.goTo( 2 );
 *     matter.ready( 'faq' ).then( ( accordion ) => accordion?.open( 0 ) );
 *     document.addEventListener( 'matter-tabs-change', ( event ) => … );
 *
 * `matter.{type}( target )` returns a block's instance: methods plus read-only
 * state. `target` is an element ID (usually the block's HTML anchor; a leading
 * `#` is allowed) or an element. It resolves to that block itself if it is
 * one, else the first one of the type inside it, else the one around it.
 * Instances exist once the block has started (after hydration), when it
 * dispatches `matter-{type}-ready`; `matter.ready( target )` waits for that,
 * and resolves with `null` once the page has loaded and the target isn't, or
 * isn't in, a block (a typo, a block that isn't on this page).
 *
 * Each block's script module bundles this file, so the copies share their
 * state through one object under a symbol on `window.matter`
 * (`Symbol.for( 'matter' )`), which keeps it out of the public API. A small
 * stub printed in the page's head (Assets::api_stub()) defines
 * `matter.ready()` and the accessors before any module loads, so theme
 * scripts can call them early, or on pages without the block; its calls wait
 * in the same state object, and the first module to load takes them over.
 */

const KEY = Symbol.for('matter');

/**
 * The state every copy of this file shares, and the public object.
 *
 * @return {{matter: Object, state: Object}} `window.matter` and its private state.
 */
const shared = () => {
	window.matter ??= {};

	const matter = window.matter;
	// Element => { type, instance }, type => selector, and the `ready()`
	// calls still waiting (each a function returning whether it settled).
	const state = (matter[KEY] ??= {});

	state.instances ??= new WeakMap();
	state.selectors ??= {};
	state.waiting ??= [];

	// The head stub (or nothing) defined `ready`: take over its queue.
	if (state.stub || !matter.ready) {
		const queued = state.queue ?? [];

		state.stub = false;
		state.queue = [];
		matter.ready = ready;
		// After the module has registered its block type, so a queued call
		// can find the block.
		Promise.resolve().then(() =>
			queued.forEach(([target, resolvePromise]) =>
				ready(target).then(resolvePromise)
			)
		);
	}

	return { matter, state };
};

/**
 * A target as an element.
 *
 * @param {string|Element} target Element ID (or `#id`) or element.
 * @return {Element|null} Element.
 */
const toElement = (target) => {
	const element =
		typeof target === 'string'
			? (document.getElementById(target) ??
				(target.startsWith('#')
					? document.getElementById(target.slice(1))
					: null))
			: target;

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
	const selectors = Object.values(shared().state.selectors);

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
 * Resolves with a block's instance once it has started. Once the page has
 * loaded, a target that isn't (and isn't in or around) a block resolves with
 * `null`; a block that exists but hasn't started yet is still waited for, until
 * it is removed from the page (then `null`). So after load `ready()` resolves
 * `null` for a block that isn't on the page yet, even if client-side navigation
 * inserts it later; wait for `matter-{type}-ready` for that. A waiter whose
 * element has been removed is dropped each time a block registers.
 *
 * @param {string|Element} target Element ID or element.
 * @return {Promise<Object|null>} Instance.
 */
function ready(target) {
	const { state } = shared();

	return new Promise((resolvePromise) => {
		// What the target pointed at when it was last seen: once that has been
		// removed from the page (a client-side navigation, say) nothing can
		// start it, so the wait is over.
		let seen = null;

		const find = (loaded) => {
			const element = blockFor(target);
			const entry = element && state.instances.get(element);

			seen = toElement(target) ?? element ?? seen;

			if (!entry && seen && !seen.isConnected) {
				resolvePromise(null);
				return true;
			}

			if (entry) {
				resolvePromise(entry.instance);
				return true;
			}

			if (loaded && !element) {
				resolvePromise(null);
				return true;
			}

			return false;
		};

		if (find(document.readyState === 'complete')) {
			return;
		}

		state.waiting.push(find);

		if (!state.waitingForLoad && document.readyState !== 'complete') {
			state.waitingForLoad = true;
			window.addEventListener(
				'load',
				() => {
					state.waiting = state.waiting.filter((wait) => !wait(true));
				},
				{ once: true }
			);
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
	const { matter, state } = shared();

	state.selectors[type] = selector;

	// The head stub's placeholder (returns null) gives way to the real one.
	if (matter[type] && !matter[type]._stub) {
		return;
	}

	matter[type] = (target) => {
		const element = resolve(target, selector);

		return element
			? (state.instances.get(element)?.instance ?? null)
			: null;
	};
}

/**
 * Mark a block as running: `is-enhanced`, which the block's CSS hides content
 * behind (so a block whose module fails keeps its content showing). Blocks
 * call it first in `callbacks.init`. It also marks the page (`matter-ready-{type}`
 * on `<html>`): this type's module has run, so a block of the type inserted
 * later is about to start, and its CSS keeps hiding after `matter-late`.
 *
 * @param {string}     type     Block type (`accordion`, `menu`).
 * @param {...Element} elements Block root, and anything else that goes with it.
 */
export function enhance(type, ...elements) {
	document.documentElement.classList.add(`matter-ready-${type}`);
	elements.forEach((element) => element?.classList.add('is-enhanced'));
}

/**
 * Register a block's instance and announce it (`matter-{type}-ready`).
 *
 * @param {string}  type     Type.
 * @param {Element} element  Block element.
 * @param {Object}  instance Instance.
 */
export function registerInstance(type, element, instance) {
	const { state } = shared();

	state.instances.set(element, { type, instance });
	// Also lets go of waiters whose element has left the page.
	state.waiting = state.waiting.filter((find) => !find(false));
	emit(element, type, 'ready', { instance });
}

/**
 * Dispatch `matter-{type}-{name}` from a block. `detail.id` is the element's
 * ID (or `null`), and `detail.instance` the block's instance (`null` before
 * it has registered).
 *
 * @param {Element} element Block element.
 * @param {string}  type    Type.
 * @param {string}  name    Event name.
 * @param {Object}  detail  Event detail.
 */
export function emit(element, type, name, detail = {}) {
	const { state } = shared();

	element.dispatchEvent(
		new CustomEvent(`matter-${type}-${name}`, {
			bubbles: true,
			detail: {
				id: element.id || null,
				instance: state.instances.get(element)?.instance ?? null,
				...detail,
			},
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
