import {
	store,
	getContext,
	getElement,
	withSyncEvent,
} from '@wordpress/interactivity';
import EmblaCarousel from 'embla-carousel';

const STORE = 'matter/lightbox';

const getGallery = (state, galleryId) => state.galleries?.[galleryId] || null;

const getGalleryImages = (state, galleryId) => {
	const gallery = getGallery(state, galleryId);
	if (!gallery?.images?.length) {
		return [];
	}
	return [...gallery.images].sort((a, b) => a.order - b.order);
};

const preloadImage = (src, srcset) => {
	if (!src || typeof document === 'undefined') {
		return;
	}
	const link = document.createElement('link');
	link.rel = 'preload';
	link.as = 'image';
	link.href = src;
	if (srcset) {
		link.imageSrcset = srcset;
	}
	document.head.appendChild(link);
};

const preloadNeighbors = (images, index) => {
	const current = images[index];
	preloadImage(current?.lightboxSrc, current?.lightboxSrcset);
	if (images.length < 2) {
		return;
	}
	const next = images[(index + 1) % images.length];
	const prev = images[(index - 1 + images.length) % images.length];
	if (next) {
		preloadImage(next.lightboxSrc, next.lightboxSrcset);
	}
	if (prev && prev !== next) {
		preloadImage(prev.lightboxSrc, prev.lightboxSrcset);
	}
};

let thumbsCarouselApi = null;
let thumbsScrollFrame = 0;
let thumbsOverflowRoot = null;

const updateThumbsOverflowClass = (root, viewport, track, api) => {
	if (!root) {
		return;
	}

	root.classList.add('has-thumbs-alignment');

	const overflowing = api
		? api.canScrollPrev() || api.canScrollNext()
		: track.scrollWidth > viewport.clientWidth + 1;

	root.classList.toggle('is-overflowing', overflowing);
};

const destroyThumbsCarousel = () => {
	if (thumbsScrollFrame) {
		window.cancelAnimationFrame(thumbsScrollFrame);
		thumbsScrollFrame = 0;
	}
	if (thumbsCarouselApi) {
		thumbsCarouselApi.destroy();
		thumbsCarouselApi = null;
	}
	if (thumbsOverflowRoot) {
		thumbsOverflowRoot.classList.remove(
			'has-thumbs-alignment',
			'is-overflowing'
		);
		thumbsOverflowRoot = null;
	}
};

const { state, actions } = store(STORE, {
	state: {
		isOpen: false,
		selectedGalleryId: null,
		selectedIndex: 0,
		galleries: {},
		get currentGallery() {
			return getGallery(state, state.selectedGalleryId);
		},
		get currentImages() {
			if (!state.selectedGalleryId) {
				return [];
			}
			return getGalleryImages(state, state.selectedGalleryId);
		},
		get currentImage() {
			return state.currentImages[state.selectedIndex] || null;
		},
		get currentSrc() {
			return (
				state.currentImage?.lightboxSrc || state.currentImage?.src || ''
			);
		},
		get currentSrcset() {
			return state.currentImage?.lightboxSrcset || '';
		},
		get currentSizes() {
			return state.currentImage?.lightboxSizes || '';
		},
		get currentAlt() {
			return state.currentImage?.alt || '';
		},
		get currentCaption() {
			return state.currentImage?.caption || '';
		},
		get showCaptions() {
			const gallery = state.currentGallery;
			if (!gallery) {
				return false;
			}
			return gallery.showCaptions !== false;
		},
		get showCurrentCaption() {
			return state.showCaptions && !!state.currentCaption;
		},
		get hasNavigation() {
			return state.currentImages.length > 1;
		},
		get showThumbnails() {
			const gallery = state.currentGallery;
			if (!gallery) {
				return false;
			}
			if (gallery.lightboxThumbnails === false) {
				return false;
			}
			return state.hasNavigation;
		},
		get currentThumbs() {
			return state.currentImages.map((image, index) => ({
				src:
					image.lightboxThumbSrc || image.thumbSrc || image.src || '',
				alt: image.alt || '',
				index,
				isActive: index === state.selectedIndex,
			}));
		},
		get currentThumbAspectRatio() {
			return state.currentGallery?.lightboxThumbnailAspectRatio || '1';
		},
		get currentThumbImageStyle() {
			const ratio = state.currentThumbAspectRatio;
			const focal =
				state.currentGallery?.lightboxThumbnailFocalPoint || {};
			const x =
				typeof focal.x === 'number' && !Number.isNaN(focal.x)
					? focal.x
					: 0.5;
			const y =
				typeof focal.y === 'number' && !Number.isNaN(focal.y)
					? focal.y
					: 0.5;
			return `aspect-ratio:${ratio};object-fit:cover;object-position:${x * 100}% ${y * 100}%;`;
		},
		get thumbsStyle() {
			const gallery = state.currentGallery;
			if (!gallery?.thumbnailGap) {
				return '';
			}
			return `--matter-lightbox--thumbnail-gap:${gallery.thumbnailGap}`;
		},
		get backdropStyle() {
			const gallery = state.currentGallery;
			if (!gallery) {
				return '';
			}

			const parts = [];
			if (gallery.backdropColor) {
				parts.push(
					`--matter-lightbox--backdrop-color:${gallery.backdropColor}`
				);
			}
			if (
				gallery.backdropOpacity !== undefined &&
				gallery.backdropOpacity !== null &&
				gallery.backdropOpacity !== ''
			) {
				parts.push(
					`--matter-lightbox--backdrop-opacity:${gallery.backdropOpacity}`
				);
			}
			if (
				gallery.backdropBlur !== undefined &&
				gallery.backdropBlur !== null &&
				gallery.backdropBlur !== ''
			) {
				parts.push(
					`--matter-lightbox--backdrop-blur:${gallery.backdropBlur}`
				);
			}
			return parts.join(';');
		},
	},
	actions: {
		open: ({ galleryId, index = 0 } = {}) => {
			if (!galleryId) {
				return;
			}
			const images = getGalleryImages(state, galleryId);
			if (!images.length) {
				return;
			}
			const safeIndex = Math.max(0, Math.min(index, images.length - 1));
			state.selectedGalleryId = galleryId;
			state.selectedIndex = safeIndex;
			state.isOpen = true;
			document.documentElement.classList.add('has-lightbox-open');
			preloadNeighbors(images, safeIndex);
		},
		openFromContext: () => {
			const context = getContext();
			actions.open({
				galleryId: context?.galleryId,
				index: typeof context?.index === 'number' ? context.index : 0,
			});
		},
		close: () => {
			destroyThumbsCarousel();
			state.isOpen = false;
			state.selectedGalleryId = null;
			state.selectedIndex = 0;
			document.documentElement.classList.remove('has-lightbox-open');
		},
		onNativeClose: () => {
			if (!state.isOpen) {
				return;
			}
			actions.close();
		},
		onCancel: withSyncEvent((event) => {
			if (!state.isOpen) {
				return;
			}
			event.preventDefault();
			actions.close();
		}),
		onBackdropClick: withSyncEvent((event) => {
			const { ref } = getElement();
			if (!state.isOpen || !ref) {
				return;
			}

			// Dialog is fullscreen; ::backdrop shows through transparent areas.
			// Clicks land on the dialog or the content shell, not interactive children.
			if (
				event.target === ref ||
				event.target?.classList?.contains('matter-lightbox__content')
			) {
				actions.close();
			}
		}),
		showNext: () => {
			if (!state.hasNavigation) {
				return;
			}
			const next = (state.selectedIndex + 1) % state.currentImages.length;
			state.selectedIndex = next;
			preloadNeighbors(state.currentImages, next);
		},
		showPrevious: () => {
			if (!state.hasNavigation) {
				return;
			}
			const prev =
				(state.selectedIndex - 1 + state.currentImages.length) %
				state.currentImages.length;
			state.selectedIndex = prev;
			preloadNeighbors(state.currentImages, prev);
		},
		selectThumb: withSyncEvent((event) => {
			if (
				thumbsCarouselApi &&
				typeof thumbsCarouselApi.clickAllowed === 'function' &&
				!thumbsCarouselApi.clickAllowed()
			) {
				event.preventDefault();
				return;
			}

			const context = getContext();
			const index = context?.item?.index ?? context?.index;
			if (typeof index !== 'number') {
				return;
			}
			state.selectedIndex = index;
			preloadNeighbors(state.currentImages, index);
		}),
		handleKeydown: withSyncEvent((event) => {
			if (!state.isOpen) {
				return;
			}
			if (event.key === 'ArrowRight') {
				actions.showNext();
			} else if (event.key === 'ArrowLeft') {
				actions.showPrevious();
			}
		}),
	},
	callbacks: {
		syncDialog: () => {
			const { ref } = getElement();
			if (!ref || typeof ref.showModal !== 'function') {
				return;
			}

			if (state.isOpen && !ref.open) {
				ref.showModal();
				return;
			}

			if (!state.isOpen && ref.open) {
				ref.close();
			}
		},
		syncCaptionHtml: () => {
			const { ref } = getElement();
			if (!ref) {
				return;
			}
			const html = state.showCurrentCaption ? state.currentCaption : '';
			if (ref.innerHTML !== html) {
				ref.innerHTML = html;
			}
		},
		syncThumbsCarousel: () => {
			const { ref } = getElement();
			const shouldShow = state.isOpen && state.showThumbnails;
			const selectedIndex = state.selectedIndex;
			const thumbCount = state.currentThumbs.length;

			if (!shouldShow || !ref || thumbCount < 2) {
				destroyThumbsCarousel();
				return;
			}

			const viewport = ref.querySelector(
				'.matter-lightbox__thumbs-viewport'
			);
			const track = ref.querySelector('.matter-lightbox__thumbs-track');

			if (!viewport || !track) {
				return;
			}

			if (thumbsScrollFrame) {
				window.cancelAnimationFrame(thumbsScrollFrame);
			}

			thumbsScrollFrame = window.requestAnimationFrame(() => {
				thumbsScrollFrame = 0;

				if (!state.isOpen || !state.showThumbnails) {
					destroyThumbsCarousel();
					return;
				}

				if (!thumbsCarouselApi) {
					thumbsCarouselApi = EmblaCarousel(viewport, {
						containScroll: 'keepSnaps',
						dragFree: true,
						container: track,
						slides: '.matter-lightbox__thumb',
					});
				} else {
					thumbsCarouselApi.reInit();
				}

				thumbsOverflowRoot = ref;
				updateThumbsOverflowClass(
					ref,
					viewport,
					track,
					thumbsCarouselApi
				);

				// Re-check after layout settles (images/aspect can change width).
				window.requestAnimationFrame(() => {
					if (!thumbsCarouselApi || thumbsOverflowRoot !== ref) {
						return;
					}
					updateThumbsOverflowClass(
						ref,
						viewport,
						track,
						thumbsCarouselApi
					);
				});

				thumbsCarouselApi.scrollTo(selectedIndex);
			});
		},
	},
});
