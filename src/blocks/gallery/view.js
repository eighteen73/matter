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
		// "View all" (grid with a limit): open the lightbox at the first image,
		// or reveal the hidden images when there's no lightbox.
		viewAll() {
			const context = getContext();
			const { ref } = getElement();
			const dialog = getDialog(ref);

			if (dialog) {
				context.index = 0;
				dialog.showModal();
				return;
			}

			ref.closest('.wp-block-matter-gallery')
				.querySelectorAll('.wp-block-matter-gallery__items > [hidden]')
				.forEach((figure) => figure.removeAttribute('hidden'));
			ref.hidden = true;
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

			// Return focus to the enlarge button for the image being viewed, or
			// to "View all" when that image is hidden.
			const gallery = ref.closest('.wp-block-matter-gallery');
			const button = gallery?.querySelectorAll(
				'.wp-block-matter-gallery__open'
			)[index];

			if (button && !button.closest('[hidden]')) {
				button.focus();
			} else {
				gallery
					?.querySelector('.wp-block-matter-gallery__more')
					?.focus();
			}
		},
	},
});
