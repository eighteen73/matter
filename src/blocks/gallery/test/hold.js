/**
 * What the gallery lightbox holds on the page while it is open.
 */
import { release, showModal } from '../hold';

const mockResume = jest.fn();

jest.mock(
	'@matter/inert',
	() => ({
		acquireScrollLock: jest.fn(),
		releaseScrollLock: jest.fn(),
		suspendForModal: jest.fn(() => mockResume),
	}),
	{ virtual: true }
);

const { acquireScrollLock, releaseScrollLock, suspendForModal } =
	jest.requireMock('@matter/inert');

const lightbox = () => {
	const dialog = document.createElement('dialog');

	dialog.showModal = jest.fn();
	document.body.append(dialog);

	return dialog;
};

afterEach(() => {
	jest.clearAllMocks();
	document.body.innerHTML = '';
});

describe('the lightbox hold', () => {
	it('locks the page and lets the panel go while it is open, and puts it back on release', () => {
		const dialog = lightbox();

		showModal(dialog);

		expect(suspendForModal).toHaveBeenCalledWith(dialog, null);
		expect(acquireScrollLock).toHaveBeenCalledWith('has-overlay-open');
		expect(dialog.showModal).toHaveBeenCalled();
		expect(releaseScrollLock).not.toHaveBeenCalled();

		release(dialog);

		expect(mockResume).toHaveBeenCalledTimes(1);
		expect(releaseScrollLock).toHaveBeenCalledTimes(1);
	});

	it('releases once, however many times it is told to', () => {
		const dialog = lightbox();

		showModal(dialog);
		release(dialog);
		release(dialog);

		expect(releaseScrollLock).toHaveBeenCalledTimes(1);
	});

	it('is released if the dialog cannot be shown', () => {
		const dialog = lightbox();

		dialog.showModal.mockImplementation(() => {
			throw new Error('not connected');
		});

		expect(() => showModal(dialog)).toThrow('not connected');
		expect(mockResume).toHaveBeenCalledTimes(1);
		expect(releaseScrollLock).toHaveBeenCalledTimes(1);
	});

	it('lets go of the page when the lightbox is removed while open', async () => {
		const dialog = lightbox();

		showModal(dialog);
		dialog.remove();
		await Promise.resolve();

		expect(releaseScrollLock).toHaveBeenCalledTimes(1);
		expect(mockResume).toHaveBeenCalledTimes(1);
	});

	it('still releases the scroll lock if resuming fails', () => {
		const dialog = lightbox();

		showModal(dialog);
		mockResume.mockImplementationOnce(() => {
			throw new Error('resume failed');
		});

		expect(() => release(dialog)).toThrow('resume failed');
		expect(releaseScrollLock).toHaveBeenCalledTimes(1);
	});
});
