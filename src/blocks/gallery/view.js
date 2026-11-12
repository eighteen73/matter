/**
 * Gallery lightbox (store: matter/gallery).
 *
 * A native <dialog> per gallery: arrow keys and buttons move between images,
 * Escape / backdrop / close button close it, and focus returns to the image's
 * enlarge button.
 *
 * A grid limited to "Images to show" shows whole rows at the number of columns
 * that fit (the server hides images beyond the limit until this runs).
 *
 * API: `matter.gallery( target )` → instance (see README); events
 * `matter-gallery-ready`, `-open`, `-change` and `-close`. A gallery in the
 * carousel layout also has a `matter.carousel()` instance.
 */

/**
 * WordPress dependencies
 */
import {
	getContext,
	getElement,
	store,
	withScope,
	withSyncEvent,
} from '@wordpress/interactivity';

/**
 * Internal dependencies
 */
import {
	emit,
	fromDirective,
	registerInstance,
	registerType,
	resolve,
} from '../../interactivity/api';
import { isBackdropClick } from '../../interactivity/backdrop';

const SELECTOR = '.wp-block-matter-gallery';

registerType('gallery', SELECTOR);

// Gallery element => instance; last announced image.
const instances = new WeakMap();
const announced = new WeakMap();

const getDialog = (element) =>
	element
		.closest(SELECTOR)
		?.querySelector('.wp-block-matter-gallery__lightbox');

/**
 * Open the lightbox at an image.
 *
 * @param {Element} element Gallery, or an element in it.
 * @param {Object}  context Gallery context.
 * @param {number}  index   Image index.
 */
const show = (element, context, index) => {
	const dialog = getDialog(element);

	if (!dialog || !context.images.length) {
		return;
	}

	context.index = Math.min(Math.max(0, index), context.images.length - 1);
	announced.set(element.closest(SELECTOR), context.index);

	if (!dialog.open) {
		dialog.showModal();
		emit(element.closest(SELECTOR), 'gallery', 'open', {
			index: context.index,
		});
	}
};

const instanceFor = (target) => instances.get(resolve(target, SELECTOR));

const CAPTION_TOGGLE = '.wp-block-matter-gallery__caption-toggle';

/**
 * Show or hide an image's caption (the "tooltip" caption style).
 *
 * @param {Element} button The image's caption button.
 * @param {boolean} open   Whether to show it.
 */
const setCaption = (button, open) => {
	button.setAttribute('aria-expanded', String(open));
	button
		.closest('.wp-block-image')
		?.classList.toggle('is-caption-open', open);
};

/**
 * Hide a gallery's open captions.
 *
 * @param {Element}      gallery Gallery.
 * @param {Element|null} except  A caption button to leave alone.
 */
const closeCaptions = (gallery, except = null) =>
	gallery
		?.querySelectorAll(`${CAPTION_TOGGLE}[aria-expanded="true"]`)
		.forEach((button) => button !== except && setCaption(button, false));

const { actions } = store('matter/gallery', {
	callbacks: {
		init() {
			const context = getContext();
			const { ref } = getElement();
			const step = withScope((offset) => {
				const count = context.images.length;

				if (count) {
					context.index = (context.index + offset + count) % count;
				}
			});

			const instance = {
				element: ref,
				get id() {
					return ref.id || null;
				},
				get isOpen() {
					return !!getDialog(ref)?.open;
				},
				/** The image shown in the lightbox. */
				get index() {
					return context.index;
				},
				get count() {
					return context.images.length;
				},
				open: withScope((index = 0) => show(ref, context, index)),
				close: () => getDialog(ref)?.close(),
				next: () => step(1),
				prev: () => step(-1),
			};

			instances.set(ref, instance);
			announced.set(ref, context.index);
			registerInstance('gallery', ref, instance);

			// Open captions close on a click elsewhere, or Escape.
			if (ref.querySelector(CAPTION_TOGGLE)) {
				const { ownerDocument } = ref;

				ownerDocument.addEventListener('click', (event) => {
					if (
						!event.target.closest?.(
							`${CAPTION_TOGGLE}, .wp-block-image figcaption`
						)
					) {
						closeCaptions(ref);
					}
				});
				ownerDocument.addEventListener('keydown', (event) => {
					const open = ref.querySelector(
						`${CAPTION_TOGGLE}[aria-expanded="true"]`
					);

					if (event.key === 'Escape' && open) {
						closeCaptions(ref);
						open.focus();
					}
				});
			}
		},
		// Announce moving between images while the lightbox is open.
		announce() {
			const { index } = getContext();
			const { ref } = getElement();

			if (
				!instances.has(ref) ||
				announced.get(ref) === index ||
				!getDialog(ref)?.open
			) {
				return;
			}

			announced.set(ref, index);
			emit(ref, 'gallery', 'change', { index });
		},
		fitRows() {
			const { limit } = getContext();
			const { ref } = getElement();
			const grid = ref.querySelector(
				':scope > .wp-block-matter-gallery__items'
			);
			const more = ref.querySelector(
				':scope > .wp-block-matter-gallery__more'
			);

			if (
				!limit ||
				!grid ||
				!more ||
				ref.classList.contains('is-carousel')
			) {
				return;
			}

			const figures = [...grid.children].filter((child) =>
				child.matches('.wp-block-image')
			);
			const update = () => {
				// Everything is showing ("View all" without a lightbox).
				if (more.hidden) {
					return;
				}

				const columns =
					window
						.getComputedStyle(grid)
						.gridTemplateColumns.split(' ')
						.filter(Boolean).length || 1;
				const visible = Math.floor(limit / columns) * columns || limit;

				figures.forEach((figure, index) => {
					figure.hidden = index >= visible;
				});
			};
			const observer = new window.ResizeObserver(update);

			observer.observe(grid);

			return () => observer.disconnect();
		},
	},
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
		/**
		 * From an image's enlarge button; or, from the API,
		 * `open( target, index )`.
		 *
		 * @param {*}      target Directive event, or gallery ID/element.
		 * @param {number} index  Image index (API).
		 */
		open(target, index = 0) {
			if (!fromDirective(target)) {
				instanceFor(target)?.open(index);

				return;
			}

			const context = getContext();

			show(getElement().ref, context, context.imageIndex);
		},
		// An image's info button: show or hide its caption.
		toggleCaption() {
			const { ref } = getElement();
			const open = ref.getAttribute('aria-expanded') !== 'true';

			closeCaptions(ref.closest(SELECTOR), ref);
			setCaption(ref, open);
		},
		// The carousel layout's "expand" control: the current slide's image.
		openCurrent() {
			const { ref } = getElement();
			const figures = [
				...(ref
					.closest(SELECTOR)
					?.querySelectorAll(
						'.wp-block-matter-carousel__track > .wp-block-image'
					) ?? []),
			];

			show(
				ref,
				getContext(),
				Math.max(
					0,
					figures.findIndex((figure) =>
						figure.classList.contains('is-selected')
					)
				)
			);
		},
		// "View all" (grid with a limit): open the lightbox at the first image,
		// or reveal the hidden images when there's no lightbox.
		viewAll() {
			const context = getContext();
			const { ref } = getElement();
			const dialog = getDialog(ref);

			if (dialog) {
				show(ref, context, 0);
				return;
			}

			const revealed = [
				...ref
					.closest('.wp-block-matter-gallery')
					.querySelectorAll(
						'.wp-block-matter-gallery__items > [hidden]'
					),
			];

			revealed.forEach((figure) => figure.removeAttribute('hidden'));
			ref.hidden = true;

			// The button had focus and is gone: move it to the first image
			// revealed (its link or button, else the image itself).
			const first = revealed[0];
			const target =
				first?.querySelector('a[href], button:not([disabled])') ??
				first;

			if (target) {
				if (target === first) {
					first.tabIndex = -1;
				}

				target.focus();
			}
		},
		close(target) {
			if (!fromDirective(target)) {
				instanceFor(target)?.close();

				return;
			}

			getDialog(getElement().ref)?.close();
		},
		prev(target) {
			if (!fromDirective(target)) {
				instanceFor(target)?.prev();

				return;
			}

			const context = getContext();

			context.index =
				(context.index - 1 + context.images.length) %
				context.images.length;
		},
		next(target) {
			if (!fromDirective(target)) {
				instanceFor(target)?.next();

				return;
			}

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
			const { ref } = getElement();

			if (isBackdropClick(event, ref)) {
				ref.close();
			}
		}),
		onClose() {
			const { ref } = getElement();
			const { index } = getContext();

			emit(ref.closest(SELECTOR), 'gallery', 'close', { index });

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
