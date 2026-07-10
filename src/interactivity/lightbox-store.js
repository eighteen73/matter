import { store, getContext, withSyncEvent } from '@wordpress/interactivity';

const STORE = 'matter/lightbox';

const getGalleryImages = (state, galleryId) => {
	const gallery = state.galleries?.[galleryId];
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
		get currentThumbs() {
			return state.currentImages.map((image, index) => ({
				src: image.thumbSrc || image.src || '',
				alt: image.alt || '',
				index,
				isActive: index === state.selectedIndex,
			}));
		},
		get currentThumbAspectRatio() {
			const gallery = state.galleries?.[state.selectedGalleryId];
			return gallery?.thumbnailAspectRatio || '1';
		},
		get currentThumbImageStyle() {
			const ratio = state.currentThumbAspectRatio;
			return `aspect-ratio:${ratio};object-fit:cover;`;
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
			if (event.key === 'Escape') {
				actions.close();
			} else if (event.key === 'ArrowRight') {
				actions.showNext();
			} else if (event.key === 'ArrowLeft') {
				actions.showPrevious();
			}
		}),
	},
});
