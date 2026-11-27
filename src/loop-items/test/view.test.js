/**
 * Internal dependencies
 */
import { emit } from '../../interactivity/api';
import { filled } from '../view';

jest.mock('../../interactivity/api', () => ({
	emit: jest.fn(),
}));

/**
 * A list of loop items, as a post template renders it.
 *
 * @param {number[]} ids  Post IDs.
 * @param {string}   live A live block placeholder in each item, if any.
 * @return {HTMLElement} List.
 */
const list = (ids, live = '') => {
	const element = document.createElement('ul');

	element.innerHTML = ids
		.map(
			(id) =>
				`<li class="post-${id}"><div class="wp-block-matter-loop-item" data-id="${id}">${live ? `<div data-matter-live="${id}:0" aria-busy="true"></div>` : ''}<ul class="swatches"><li>Red</li></ul></div></li>`
		)
		.join('');

	return element;
};

// After the observer's callback and the task it sends the update in.
const settle = async () => {
	await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
};

const ids = (items) => items.map((item) => Number(item.dataset.id));

describe('matter-loop-items-update', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		emit.mockClear();
	});

	it('is sent once when a list arrives, with its items in order', async () => {
		const element = list([3, 1, 2]);

		document.body.append(element);
		await settle();

		expect(emit).toHaveBeenCalledTimes(1);

		const [target, type, name, detail] = emit.mock.calls[0];

		expect(target).toBe(element);
		expect([type, name]).toEqual(['loop-items', 'update']);
		expect(ids(detail.items)).toEqual([3, 1, 2]);
		expect(ids(detail.added)).toEqual([3, 1, 2]);
		await expect(detail.filled).resolves.toBe(true);
	});

	it('names only the items added to a list', async () => {
		const element = list([1, 2]);

		document.body.append(element);
		await settle();
		emit.mockClear();

		element.append(list([3]).firstElementChild);
		await settle();

		const detail = emit.mock.calls[0][3];

		expect(ids(detail.items)).toEqual([1, 2, 3]);
		expect(ids(detail.added)).toEqual([3]);
	});

	it('is sent when items are only removed, as positions change', async () => {
		const element = list([1, 2, 3]);

		document.body.append(element);
		await settle();
		emit.mockClear();

		element.firstElementChild.remove();
		await settle();

		expect(emit).toHaveBeenCalledTimes(1);

		const detail = emit.mock.calls[0][3];

		expect(ids(detail.items)).toEqual([2, 3]);
		expect(detail.added).toEqual([]);
	});

	it('is not sent for other changes', async () => {
		const element = list([1]);

		document.body.append(element);
		await settle();
		emit.mockClear();

		element.querySelector('.swatches').append(document.createElement('li'));
		document.body.append(document.createElement('p'));
		await settle();

		expect(emit).not.toHaveBeenCalled();
	});
});

describe('filled', () => {
	afterEach(() => {
		jest.useRealTimers();
	});

	it('settles once every live block is filled', async () => {
		const element = list([1, 2], 'live');
		const items = [
			...element.querySelectorAll('.wp-block-matter-loop-item'),
		];

		document.body.append(element);

		let done = false;
		const promise = filled(items).then((result) => {
			done = true;
			return result;
		});

		items[0].querySelector('[data-matter-live]').dataset.matterFilled =
			'1:0';
		await settle();

		expect(done).toBe(false);

		items[1].querySelector('[data-matter-live]').dataset.matterFilled =
			'2:0';

		await expect(promise).resolves.toBe(true);
	});

	it('gives up after 10 seconds', async () => {
		jest.useFakeTimers();

		const element = list([1], 'live');
		const promise = filled([
			element.querySelector('.wp-block-matter-loop-item'),
		]);

		jest.advanceTimersByTime(10000);

		await expect(promise).resolves.toBe(false);
	});
});
