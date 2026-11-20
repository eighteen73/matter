/**
 * The public `window.matter` API: the head stub's hand-over, `ready()` for a
 * present, a late and an unknown target, and the shape of event details.
 */
/**
 * Node dependencies
 */
import { readFileSync } from 'fs';
import { resolve as resolvePath } from 'path';

const SELECTOR = '.wp-block-matter-tabs';

/**
 * A fresh copy of the module, as another block's bundle would have.
 *
 * @return {Object} Module exports.
 */
const loadApi = () => {
	let api;

	jest.isolateModules(() => {
		api = require('../api');
	});

	return api;
};

/**
 * The stub exactly as PHP prints it (Assets::api_stub()).
 *
 * @return {string} Script.
 */
const stubScript = () => {
	const php = readFileSync(
		resolvePath(__dirname, '../../../includes/classes/Assets.php'),
		'utf8'
	);
	const [, script] = php.match(/'(\(function\(m\)\{if\(m\.ready\).*?)',\n/s);

	return script.replace('%s', JSON.stringify(['tabs', 'overlay']));
};

const block = (id) => {
	const element = document.createElement('div');

	element.className = 'wp-block-matter-tabs';
	element.id = id;
	document.body.append(element);

	return element;
};

const settled = (promise) =>
	Promise.race([
		promise.then((value) => ({ value })),
		new Promise((done) => setTimeout(() => done('pending'), 20)),
	]);

beforeEach(() => {
	delete window.matter;
	document.body.innerHTML = '';
});

describe('window.matter', () => {
	it('keeps its internals off the public object', () => {
		const api = loadApi();

		api.registerType('tabs', SELECTOR);
		api.registerInstance('tabs', block('a'), {});

		expect(Object.keys(window.matter).sort()).toEqual(['ready', 'tabs']);
		expect(
			Object.keys(window.matter).filter((key) => key.startsWith('_'))
		).toEqual([]);
	});

	it('shares one state between copies of the module', async () => {
		const first = loadApi();
		const second = loadApi();

		first.registerType('tabs', SELECTOR);
		second.registerType('overlay', '.wp-block-matter-modal');

		const element = block('shared');
		const instance = { name: 'shared' };

		second.registerInstance('tabs', element, instance);

		expect(window.matter.tabs('shared')).toBe(instance);
		await expect(window.matter.ready('shared')).resolves.toBe(instance);
	});
});

describe('the head stub', () => {
	it('defines ready() and null accessors', () => {
		// eslint-disable-next-line no-eval -- The script PHP prints.
		window.eval(stubScript());

		expect(window.matter.tabs('x')).toBeNull();
		expect(typeof window.matter.ready).toBe('function');
		expect(
			Object.keys(window.matter).filter((key) => key.startsWith('_'))
		).toEqual([]);
	});

	it('hands its queue to the first module, which settles it', async () => {
		// eslint-disable-next-line no-eval -- The script PHP prints.
		window.eval(stubScript());

		// The block is in the page, and its module hasn't started it yet.
		const element = block('late-tabs');
		const early = window.matter.ready('late-tabs');
		const stubReady = window.matter.ready;
		const api = loadApi();

		api.registerType('tabs', SELECTOR);

		expect(window.matter.ready).not.toBe(stubReady);

		const instance = { name: 'late' };

		api.registerInstance('tabs', element, instance);

		await expect(early).resolves.toBe(instance);
		expect(window.matter.tabs('late-tabs')).toBe(instance);
	});

	it('settles a call no module ever answers, once the page has loaded', async () => {
		const state = jest
			.spyOn(document, 'readyState', 'get')
			.mockReturnValue('loading');

		// eslint-disable-next-line no-eval -- The script PHP prints.
		window.eval(stubScript());

		const promise = window.matter.ready('nothing-here');

		expect(await settled(promise)).toBe('pending');

		window.dispatchEvent(new Event('load'));
		await expect(promise).resolves.toBeNull();
		state.mockRestore();
	});
});

describe('matter.ready()', () => {
	it('resolves for a block that has started, by ID, #ID or element', async () => {
		const api = loadApi();

		api.registerType('tabs', SELECTOR);

		const element = block('present');
		const instance = {};

		api.registerInstance('tabs', element, instance);

		await expect(window.matter.ready('present')).resolves.toBe(instance);
		await expect(window.matter.ready('#present')).resolves.toBe(instance);
		await expect(window.matter.ready(element)).resolves.toBe(instance);
	});

	it('waits for a block that starts later', async () => {
		const api = loadApi();

		api.registerType('tabs', SELECTOR);

		const element = block('slow');
		const promise = window.matter.ready('#slow');

		expect(await settled(promise)).toBe('pending');

		const instance = {};

		api.registerInstance('tabs', element, instance);
		await expect(promise).resolves.toBe(instance);
	});

	it('resolves null for a target that is not a block, once the page has loaded', async () => {
		const api = loadApi();

		api.registerType('tabs', SELECTOR);
		block('exists').className = 'not-a-block';

		await expect(window.matter.ready('#missing')).resolves.toBeNull();
		await expect(window.matter.ready('exists')).resolves.toBeNull();
	});

	it('settles an unknown target when the load event fires', async () => {
		const state = jest
			.spyOn(document, 'readyState', 'get')
			.mockReturnValue('loading');
		const api = loadApi();

		api.registerType('tabs', SELECTOR);

		const promise = window.matter.ready('#missing');

		expect(await settled(promise)).toBe('pending');

		window.dispatchEvent(new Event('load'));
		await expect(promise).resolves.toBeNull();
		state.mockRestore();
	});

	it('lets go of a waiter whose element left the page, when another block registers', async () => {
		const api = loadApi();

		api.registerType('tabs', SELECTOR);

		const gone = block('gone');
		const promise = window.matter.ready('#gone');
		const other = block('other');

		// Seen once (still there, not started), then removed.
		api.registerInstance('tabs', other, {});
		expect(await settled(promise)).toBe('pending');

		gone.remove();
		api.registerInstance('tabs', block('third'), {});

		await expect(promise).resolves.toBeNull();
	});

	it('lets go of a waiter for an element that is removed before it starts', async () => {
		const api = loadApi();

		api.registerType('tabs', SELECTOR);

		const element = block('detached');
		const promise = window.matter.ready(element);

		expect(await settled(promise)).toBe('pending');

		element.remove();
		api.registerInstance('tabs', block('next'), {});

		await expect(promise).resolves.toBeNull();
	});

	it('keeps waiting for a block that is there but has not started', async () => {
		const api = loadApi();

		api.registerType('tabs', SELECTOR);
		block('unstarted');

		const promise = window.matter.ready('#unstarted');

		window.dispatchEvent(new Event('load'));
		expect(await settled(promise)).toBe('pending');
	});

	it('finds the first block inside a target, else the one around it', async () => {
		const api = loadApi();

		api.registerType('tabs', SELECTOR);

		const outer = block('inner-tabs');
		const wrapper = document.createElement('section');
		const inner = document.createElement('div');

		wrapper.id = 'wrapper';
		inner.className = 'child';
		outer.append(inner);
		document.body.append(wrapper);
		wrapper.append(block('inside'));

		const instance = {};

		api.registerInstance(
			'tabs',
			document.getElementById('inside'),
			instance
		);

		await expect(window.matter.ready('wrapper')).resolves.toBe(instance);

		const around = {};

		api.registerInstance('tabs', outer, around);
		await expect(window.matter.ready(inner)).resolves.toBe(around);
	});
});

describe('events', () => {
	it('carry the element ID and the instance, always', () => {
		const api = loadApi();

		api.registerType('tabs', SELECTOR);

		const element = block('events');
		const seen = [];

		document.addEventListener('matter-tabs-ready', (event) =>
			seen.push(['ready', event.detail])
		);
		document.addEventListener('matter-tabs-change', (event) =>
			seen.push(['change', event.detail])
		);

		const instance = {};

		api.registerInstance('tabs', element, instance);
		api.emit(element, 'tabs', 'change', { index: 2 });
		api.emit(block('unregistered'), 'tabs', 'change');

		expect(seen[0]).toEqual(['ready', { id: 'events', instance }]);
		expect(seen[1]).toEqual([
			'change',
			{ id: 'events', instance, index: 2 },
		]);
		expect(seen[2][1]).toEqual({ id: 'unregistered', instance: null });
	});

	it('use null for an element without an ID', () => {
		const api = loadApi();
		const element = document.createElement('div');

		let detail;

		element.addEventListener('matter-tabs-x', (event) => {
			detail = event.detail;
		});
		api.emit(element, 'tabs', 'x');

		expect(detail).toEqual({ id: null, instance: null });
	});
});
