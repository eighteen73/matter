/**
 * Dropdown placement flips on the edge a submenu overflows: the right in
 * left-to-right menus, the left in right-to-left ones.
 */
import { positionSubmenu, unwatchSubmenu, watchSubmenu } from '../positioning';

const VIEWPORT = 1000;

const rect = (left, width, top = 100, height = 100) => ({
	left,
	right: left + width,
	top,
	bottom: top + height,
	width,
	height,
});

/**
 * A menu whose item and submenu are at the given places. The submenu's rect
 * follows the `is-flipped` class, as the stylesheet would place it.
 *
 * @param {Object}  options
 * @param {boolean} options.rtl    Direction.
 * @param {boolean} options.nested Whether the item is inside another submenu (a flyout).
 * @param {number}  options.itemAt Item's left edge.
 * @param {number}  options.width  Submenu width.
 */
const build = ({ rtl, nested = false, itemAt, width }) => {
	document.body.innerHTML = `
		<nav class="matter-menu is-horizontal" style="direction: ${rtl ? 'rtl' : 'ltr'}">
			<div class="matter-menu__submenu">
				<div class="item"><div class="matter-menu__submenu"></div></div>
			</div>
			<div class="item"><div class="matter-menu__submenu"></div></div>
		</nav>`;

	const navigation = document.querySelector('nav');
	const item = nested
		? document.querySelector('.item')
		: navigation.querySelector(':scope > .item');
	const submenu = item.querySelector('.matter-menu__submenu');
	const itemWidth = 100;

	item.getBoundingClientRect = () => rect(itemAt, itemWidth);
	submenu.getBoundingClientRect = () => {
		const flipped = submenu.classList.contains('is-flipped');

		// By default the submenu's inline start edge is on the item's, and it
		// runs towards the inline end; flipped, the other edges line up.
		const startsAtItemStart = rtl ? flipped : !flipped;
		const left = startsAtItemStart ? itemAt : itemAt + itemWidth - width;

		return rect(left, width);
	};

	// jsdom doesn't inherit `direction`; the element's own is what's read.
	const computed = window.getComputedStyle.bind(window);

	jest.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
		const style = computed(element);

		return new Proxy(style, {
			get: (target, property) => {
				if (property === 'direction') {
					return rtl ? 'rtl' : 'ltr';
				}

				return Reflect.get(target, property);
			},
		});
	});

	Object.defineProperty(document.documentElement, 'clientWidth', {
		configurable: true,
		value: VIEWPORT,
	});
	Object.defineProperty(document.documentElement, 'clientHeight', {
		configurable: true,
		value: 800,
	});

	return { navigation, item, submenu };
};

afterEach(() => jest.restoreAllMocks());

describe('positionSubmenu', () => {
	it('flips a left-to-right submenu that overflows the right edge', () => {
		const { navigation, item, submenu } = build({
			rtl: false,
			itemAt: 850,
			width: 300,
		});

		positionSubmenu(item, navigation);
		expect(submenu.classList.contains('is-flipped')).toBe(true);
	});

	it('leaves a left-to-right submenu that fits', () => {
		const { navigation, item, submenu } = build({
			rtl: false,
			itemAt: 100,
			width: 300,
		});

		positionSubmenu(item, navigation);
		expect(submenu.classList.contains('is-flipped')).toBe(false);
	});

	it('flips a right-to-left submenu that overflows the left edge', () => {
		const { navigation, item, submenu } = build({
			rtl: true,
			itemAt: 50,
			width: 300,
		});

		positionSubmenu(item, navigation);
		expect(submenu.classList.contains('is-flipped')).toBe(true);
	});

	it('does not flip a right-to-left submenu for the right edge', () => {
		// Near the right edge a right-to-left submenu runs leftwards: room.
		const { navigation, item, submenu } = build({
			rtl: true,
			itemAt: 850,
			width: 300,
		});

		positionSubmenu(item, navigation);
		expect(submenu.classList.contains('is-flipped')).toBe(false);
	});

	it('opens a right-to-left flyout towards the side with more room', () => {
		const { navigation, item, submenu } = build({
			rtl: true,
			nested: true,
			itemAt: 20,
			width: 300,
		});

		positionSubmenu(item, navigation);
		// Overflows the left edge, with more room on the right.
		expect(submenu.classList.contains('is-flipped')).toBe(true);
	});
});

describe('watchSubmenu', () => {
	const frame = () =>
		new Promise((resolve) => window.requestAnimationFrame(resolve));
	const scroll = async () => {
		window.dispatchEvent(new Event('scroll'));
		await frame();
		await frame();
	};

	it('measures the item alone while it stays where it is', async () => {
		const { navigation, item, submenu } = build({
			rtl: false,
			itemAt: 100,
			width: 300,
		});

		watchSubmenu(item, navigation);

		const measured = jest.spyOn(window, 'getComputedStyle');
		const before = measured.mock.calls.length;

		await scroll();
		await scroll();

		expect(measured.mock.calls.length).toBe(before);
		expect(submenu.classList.contains('is-positioned')).toBe(true);
		unwatchSubmenu(item);
	});

	it('places the submenu again when the item moves, keeping it positioned', async () => {
		const { navigation, item, submenu } = build({
			rtl: false,
			itemAt: 100,
			width: 300,
		});

		watchSubmenu(item, navigation);

		const movedTo = 850;
		item.getBoundingClientRect = () => rect(movedTo, 100);
		submenu.getBoundingClientRect = () => rect(movedTo, 300);
		await scroll();

		expect(submenu.classList.contains('is-flipped')).toBe(true);
		expect(submenu.classList.contains('is-positioned')).toBe(true);
		unwatchSubmenu(item);
	});

	describe('when the submenu itself resizes', () => {
		let observers;

		beforeEach(() => {
			observers = [];
			window.ResizeObserver = class {
				constructor(callback) {
					this.callback = callback;
					this.disconnect = jest.fn();
					this.observe = jest.fn();
					observers.push(this);
				}
			};
		});

		afterEach(() => {
			delete window.ResizeObserver;
		});

		const report = (observer, width, height = 100) =>
			observer.callback([{ contentRect: { width, height } }]);

		it('places it again, and unwatching disconnects the observer', () => {
			const { navigation, item, submenu } = build({
				rtl: false,
				itemAt: 850,
				width: 100,
			});

			watchSubmenu(item, navigation);

			const [observer] = observers;

			expect(observer.observe).toHaveBeenCalledWith(submenu);
			expect(submenu.classList.contains('is-flipped')).toBe(false);

			// Its first report is the size it already has.
			report(observer, 100);
			expect(submenu.classList.contains('is-flipped')).toBe(false);

			// It grows past the room to the right: placed again, flipped.
			submenu.getBoundingClientRect = () => {
				const flipped = submenu.classList.contains('is-flipped');

				return flipped ? rect(850 + 100 - 300, 300) : rect(850, 300);
			};
			report(observer, 300);
			expect(submenu.classList.contains('is-flipped')).toBe(true);

			unwatchSubmenu(item);
			expect(observer.disconnect).toHaveBeenCalled();
		});
	});
});
