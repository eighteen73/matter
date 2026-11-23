/**
 * Internal dependencies
 */
import { suspendTransitions } from '../transitions';

describe('suspendTransitions', () => {
	let frames;

	beforeEach(() => {
		frames = [];
		jest.spyOn(window, 'requestAnimationFrame').mockImplementation(
			(callback) => frames.push(callback)
		);
	});

	afterEach(() => jest.restoreAllMocks());

	const flush = () => {
		// Two frames, as the real thing waits.
		for (let i = 0; i < 2; i++) {
			frames.splice(0).forEach((callback) => callback());
		}
	};

	it('switches transitions off, then puts them back', () => {
		const element = document.createElement('div');
		element.style.transition = 'opacity 1s';

		suspendTransitions([element]);
		expect(element.style.transition).toBe('none');

		flush();
		expect(element.style.transition).toBe('opacity 1s');
	});

	it('restores the original value when suspended again within two frames', () => {
		const element = document.createElement('div');
		element.style.transition = 'opacity 1s';

		suspendTransitions([element]);
		suspendTransitions([element]);

		flush();
		expect(element.style.transition).toBe('opacity 1s');
	});

	it('waits for the last of overlapping suspensions', () => {
		const element = document.createElement('div');
		element.style.transition = 'opacity 1s';

		suspendTransitions([element]);
		frames.splice(0).forEach((callback) => callback());
		suspendTransitions([element]);

		// The first suspension ends; the second still holds.
		frames.splice(0).forEach((callback) => callback());
		expect(element.style.transition).toBe('none');

		flush();
		expect(element.style.transition).toBe('opacity 1s');
	});
});
