/**
 * A menu taken out of the page lets go of what it holds: its listeners, a
 * dropdown's placement watchers and a drill-down's focus trap and inert.
 */
let config;
let mockContext;
let mockElement;

jest.mock(
	'@wordpress/interactivity',
	() => ({
		getContext: () => mockContext,
		getElement: () => mockElement,
		store: jest.fn((name, definition) => {
			config = definition;

			return { state: definition.state, actions: definition.actions };
		}),
		withScope: (callback) => callback,
		withSyncEvent: (callback) => callback,
	}),
	{ virtual: true }
);

const mockTrap = {
	activate: jest.fn(),
	deactivate: jest.fn(() => mockTrap.onDeactivate?.()),
	pause: jest.fn(),
	unpause: jest.fn(),
};
const mockReleaseInert = jest.fn();

jest.mock(
	'@matter/focus-trap',
	() => ({
		createTrap: (element, options) => {
			mockTrap.onDeactivate = options.onDeactivate;

			return mockTrap;
		},
	}),
	{ virtual: true }
);
jest.mock(
	'@matter/inert',
	() => ({
		inertAround: jest.fn(() => mockReleaseInert),
		onModal: jest.fn(() => jest.fn()),
	}),
	{ virtual: true }
);

const mediaQuery = () => ({
	matches: false,
	addEventListener: jest.fn(),
	removeEventListener: jest.fn(),
});

describe('menu teardown', () => {
	let nav;
	let item;
	let toggle;
	let queryListeners;

	beforeEach(() => {
		jest.clearAllMocks();
		queryListeners = [];
		window.matchMedia = jest.fn(() => {
			const query = mediaQuery();

			queryListeners.push(query);

			return query;
		});
		window.requestAnimationFrame = jest.fn(() => 1);

		document.body.innerHTML = `
			<div class="matter-panel"><nav id="menu" class="matter-menu">
				<ul class="matter-menu__items">
					<li class="matter-menu__item has-submenu">
						<a class="matter-menu__link" href="#">One</a>
						<button class="matter-menu__toggle" aria-controls="menu-submenu-1"></button>
						<div class="matter-menu__submenu"><ul><li><a href="#">Child</a></li></ul></div>
					</li>
				</ul>
			</nav></div>`;
		nav = document.getElementById('menu');
		item = nav.querySelector('.has-submenu');
		toggle = item.querySelector('.matter-menu__toggle');

		jest.isolateModules(() => {
			require('../view');
		});
	});

	const start = (types) => {
		mockContext = {
			types,
			openSubmenus: [],
			openModes: {},
			submenuId: 1,
		};
		mockElement = { ref: nav };

		return config.callbacks.init();
	};

	it('closes an open drill-down: its trap lets go and its inert comes off', () => {
		const cleanup = start([{ type: 'drill-down' }]);

		mockElement = { ref: toggle };
		config.actions.toggleSubmenu();

		expect(mockTrap.activate).toHaveBeenCalled();
		expect(mockContext.openSubmenus).toEqual([1]);

		cleanup();

		expect(mockTrap.deactivate).toHaveBeenCalled();
		expect(mockReleaseInert).toHaveBeenCalledTimes(1);
		expect(mockContext.openSubmenus).toEqual([]);
	});

	it('removes the breakpoint and panel listeners', () => {
		const panel = nav.closest('.matter-panel');
		const add = jest.spyOn(panel, 'addEventListener');
		const cleanup = start([
			{ type: 'drill-down' },
			{ type: 'dropdown', query: '(min-width: 60em)' },
		]);

		expect(add).toHaveBeenCalledWith(
			'matter-panel-close',
			expect.any(Function),
			expect.objectContaining({ signal: expect.any(AbortSignal) })
		);

		const options = queryListeners.at(-1).addEventListener.mock.calls[0][2];

		expect(options.signal.aborted).toBe(false);

		cleanup();

		expect(options.signal.aborted).toBe(true);
	});

	it('clears a pending hover close and a dropdown placement watcher', () => {
		const removeResize = jest.spyOn(window, 'removeEventListener');
		const cleanup = start([{ type: 'dropdown' }]);

		mockElement = { ref: item };
		mockContext.opensOn = 'hover';
		config.actions.toggleSubmenu();

		expect(mockContext.openSubmenus).toEqual([1]);

		cleanup();

		expect(mockContext.openSubmenus).toEqual([]);
		expect(removeResize).toHaveBeenCalledWith(
			'resize',
			expect.any(Function)
		);
	});
});
