/**
 * Gallery lightbox (store: matter/gallery).
 *
 * A native <dialog> per gallery: arrow keys and buttons move between images,
 * Escape / backdrop / close button close it, and focus returns to the image's
 * enlarge button.
 */

/**
 * WordPress dependencies
 */
import {
	getContext,
	getElement,
	store,
	withSyncEvent,
} from '@wordpress/interactivity';

const getDialog = (element) =>
	element
		.closest('.wp-block-matter-gallery')
		?.querySelector('.wp-block-matter-gallery__lightbox');

const { actions } = store('matter/gallery', {
	state: {
		get image() {
			const { images, index } = getContext();

			return images[index] ?? {};
		},
		get counter() {
			const { images, index, counter } = getContext();

			return counter
				.replace('%1$d', index + 1)
				.replace('%2$d', images.length);
		},
	},
	actions: {
		open() {
			const context = getContext();
			const { ref } = getElement();

			context.index = context.imageIndex;
			getDialog(ref)?.showModal();
		},
		close() {
			getDialog(getElement().ref)?.close();
		},
		prev() {
			const context = getContext();

			context.index =
				(context.index - 1 + context.images.length) %
				context.images.length;
		},
		next() {
			const context = getContext();

			context.index = (context.index + 1) % context.images.length;
		},
		onKeydown: withSyncEvent((event) => {
			if (event.key === 'ArrowLeft') {
				event.preventDefault();
				actions.prev();
			} else if (event.key === 'ArrowRight') {
				event.preventDefault();
				actions.next();
			}
		}),
		onBackdropClick: withSyncEvent((event) => {
			if (event.target === getElement().ref) {
				event.target.close();
			}
		}),
		onClose() {
			const { ref } = getElement();
			const { index } = getContext();

			// Return focus to the enlarge button for the image being viewed.
			ref.closest('.wp-block-matter-gallery')
				?.querySelectorAll('.wp-block-matter-gallery__open')
				[index]?.focus();
		},
	},
});
