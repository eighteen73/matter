/**
 * A modal's suspension of the held page is put back for a dialog that is
 * removed while open or replaced by one with the same ID, so the next modal
 * pauses what must be paused again (the shared depth is back to 0).
 */
import { onModal, suspendForModal } from '../../interactivity/inert';
import { createSuspensions } from '../suspensions';

const dialog = (id) => {
	const element = document.createElement('dialog');

	element.id = id;
	element.setAttribute('open', '');
	document.body.append(element);

	return element;
};

describe('suspensions', () => {
	let paused;
	let resumed;
	let stop;

	beforeEach(() => {
		document.body.innerHTML = '';
		paused = 0;
		resumed = 0;
		stop = onModal(() => {
			++paused;

			return () => ++resumed;
		});
	});

	afterEach(() => stop());

	// Open one modal, then the first of a new group: only the first of a group
	// pauses what is paused for modals.
	const pausesAgain = () => {
		const before = paused;
		const next = dialog('next');
		const release = suspendForModal(next);

		const result = paused === before + 1;

		release();
		next.remove();

		return result;
	};

	it('puts the page back when the dialog is removed while open', () => {
		const suspensions = createSuspensions();
		const first = dialog('a');

		suspensions.hold(first, suspendForModal(first));
		expect(paused).toBe(1);

		first.remove();
		suspensions.prune();

		expect(resumed).toBe(1);
		expect(suspensions.size).toBe(0);
		expect(pausesAgain()).toBe(true);
	});

	it('puts the page back for a dialog replaced by one with the same ID', () => {
		const suspensions = createSuspensions();
		const old = dialog('same');

		suspensions.hold(old, suspendForModal(old));

		// The router swaps in the new one first; the old one's cleanup runs
		// after, and puts back what it held, by its own element.
		old.replaceWith(dialog('same'));
		suspensions.release(old);

		expect(resumed).toBe(1);
		expect(pausesAgain()).toBe(true);
	});

	it('leaves a dialog that is still open and in the page alone', () => {
		const suspensions = createSuspensions();
		const first = dialog('open');

		suspensions.hold(first, suspendForModal(first));
		suspensions.prune();

		expect(resumed).toBe(0);
		expect(suspensions.size).toBe(1);

		suspensions.release(first);
		suspensions.release(first);

		expect(resumed).toBe(1);
	});

	it('puts back the earlier suspension of a dialog opened again before its close event', () => {
		const suspensions = createSuspensions();
		const first = dialog('again');

		suspensions.hold(first, suspendForModal(first));
		// Shown again before `close` was handled: a second suspension.
		suspensions.hold(first, suspendForModal(first));

		// One suspension remains, not two: closing it ends the modal.
		expect(suspensions.size).toBe(1);
		expect(resumed).toBe(0);

		suspensions.release(first);

		expect(resumed).toBe(1);
		expect(pausesAgain()).toBe(true);
	});

	it('keeps the suspension of a closed dialog that is about to be shown again', () => {
		const suspensions = createSuspensions();
		const first = dialog('gate');

		suspensions.hold(first, suspendForModal(first));
		first.removeAttribute('open');
		suspensions.prune((candidate) => candidate === first);

		expect(resumed).toBe(0);
		expect(suspensions.size).toBe(1);

		// Not if it was removed meanwhile.
		first.remove();
		suspensions.prune(() => true);

		expect(resumed).toBe(1);
	});
});

describe('prune, with a resume that throws', () => {
	it('puts the rest back, then throws the first error', () => {
		document.body.innerHTML = '';

		const suspensions = createSuspensions();
		const first = dialog('a');
		const second = dialog('b');
		const resumed = jest.fn();

		suspensions.hold(first, () => {
			throw new Error('first');
		});
		suspensions.hold(second, resumed);
		first.remove();
		second.remove();

		expect(() => suspensions.prune()).toThrow('first');
		expect(resumed).toHaveBeenCalledTimes(1);
		expect(suspensions.size).toBe(0);
	});
});
