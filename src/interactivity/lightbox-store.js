import {
	store,
	getContext,
	getElement,
	withSyncEvent,
} from '@wordpress/interactivity';

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
			return `aspect-ratio:${ratio};object-fit:cover;`;
		},
		get thumbsVisible() {
			return Number(state.currentGallery?.lightboxThumbnailsVisible) || 0;
		},
		get thumbsClassName() {
			const visible = state.thumbsVisible;
			return visible > 0
				? 'matter-lightbox__thumbs has-visible-count'
				: 'matter-lightbox__thumbs';
		},
		get thumbsStyle() {
			const gallery = state.currentGallery;
			const visible = state.thumbsVisible;
			const parts = [];

			if (visible > 0) {
				parts.push(`--matter-lightbox--thumbs-visible:${visible}`);
			}
			if (gallery?.thumbnailGap) {
				parts.push(
					`--matter-lightbox--thumbnail-gap:${gallery.thumbnailGap}`
				);
			}
			return parts.join(';');
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
			document.documentElement.classList.add('has-matter-lightbox-open');
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
			state.isOpen = false;
			state.selectedGalleryId = null;
			state.selectedIndex = 0;
			document.documentElement.classList.remove(
				'has-matter-lightbox-open'
			);
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
		selectThumb: () => {
			const context = getContext();
			const index = context?.item?.index ?? context?.index;
			if (typeof index !== 'number') {
				return;
			}
			state.selectedIndex = index;
			preloadNeighbors(state.currentImages, index);
		},
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
	},
});
