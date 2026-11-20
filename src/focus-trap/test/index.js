/**
 * The shared focus trap, with the real focus-trap module: a trap told to rest
 * before it is active stays at rest until it is told to resume.
 */
import { createTrap } from '../index';
import { onModal, suspendForModal } from '../../interactivity/inert';

const build = () => {
	document.body.innerHTML = `
		<button id="outside">outside</button>
		<div id="content"><button id="first">first</button><button id="second">second</button></div>
		<dialog id="dialog"><button id="modal">modal</button></dialog>`;

	return document.getElementById('content');
};

const trapFor = (content) =>
	createTrap([content], {
		tabbableOptions: { displayCheck: 'none' },
		fallbackFocus: content,
		initialFocus: () => document.getElementById('first'),
	});

describe('createTrap pause and unpause before it is active', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('stays inactive, and leaves focus alone, when paused before it activates', () => {
		const content = build();
		const trap = trapFor(content);
		const modal = document.getElementById('modal');

		modal.focus();
		trap.pause();
		trap.activate();
		jest.runAllTimers();

		expect(trap.active).toBe(false);
		expect(document.activeElement).toBe(modal);
	});

	it('takes focus when it resumes', () => {
		const content = build();
		const trap = trapFor(content);

		trap.pause();
		trap.activate();
		jest.runAllTimers();
		trap.unpause();
		jest.runAllTimers();

		expect(trap.active).toBe(true);
		expect(document.activeElement).toBe(document.getElementById('first'));
		trap.deactivate({ returnFocus: false });
	});

	it('activates as usual when it was never paused, or resumed before it activates', () => {
		const content = build();
		const trap = trapFor(content);

		trap.pause();
		trap.unpause();
		trap.activate();
		jest.runAllTimers();

		expect(trap.active).toBe(true);
		trap.deactivate({ returnFocus: false });
	});

	it('forgets a pause when it is deactivated', () => {
		const content = build();
		const trap = trapFor(content);

		trap.pause();
		trap.activate();
		trap.deactivate();
		trap.unpause();
		jest.runAllTimers();

		expect(trap.active).toBe(false);
	});

	it('is held back by a modal that is open when it activates (the panel opened over a modal)', () => {
		const content = build();
		const dialog = document.getElementById('dialog');
		const modal = document.getElementById('modal');
		const trap = trapFor(content);
		const stop = onModal(() => {
			trap.pause();

			return () => trap.unpause();
		});
		const end = suspendForModal(dialog);

		modal.focus();
		trap.activate();
		jest.runAllTimers();

		expect(document.activeElement).toBe(modal);

		end();
		jest.runAllTimers();

		expect(trap.active).toBe(true);
		expect(content.contains(document.activeElement)).toBe(true);
		trap.deactivate({ returnFocus: false });
		stop();
	});
});
