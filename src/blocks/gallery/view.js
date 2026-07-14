import {
	store,
	getContext,
	getElement,
	withSyncEvent,
} from '@wordpress/interactivity';
import EmblaCarousel from 'embla-carousel';

import {
	prepareCarouselBlockState,
	buildCarouselPlugins,
} from '../../utils/carousel/config';
import {
	addPrevNextBtnsClickHandlers,
	addThumbsClickHandlers,
} from '../../utils/carousel/handlers';

const STORE = 'matter/gallery';

const captionKey = (galleryId, index) => `${galleryId}:${index}`;

const { state, actions } = store(STORE, {
	state: {
		openCaptionKey: null,
		get isCaptionOpen() {
			const context = getContext();
			if (!context || typeof context.index !== 'number') {
				return false;
			}
			return (
				state.openCaptionKey ===
				captionKey(context.galleryId, context.index)
			);
		},
		get captionTriggerLabel() {
			const context = getContext();
			if (!context) {
				return '';
			}
			return state.isCaptionOpen
				? context.captionHideLabel || 'Hide caption'
				: context.captionShowLabel || 'Show caption';
		},
	},
	actions: {
		toggleCaption: withSyncEvent((event) => {
			event.preventDefault();
			event.stopPropagation();
			const context = getContext();
			if (!context || typeof context.index !== 'number') {
				return;
			}
			const key = captionKey(context.galleryId, context.index);
			state.openCaptionKey = state.openCaptionKey === key ? null : key;
		}),
		closeCaption: () => {
			state.openCaptionKey = null;
		},
		onCaptionOutsidePointerDown: withSyncEvent((event) => {
			if (!state.openCaptionKey) {
				return;
			}
			const target = event.target;
			if (
				target?.closest?.(
					'.wp-block-matter-gallery__caption-trigger, .wp-block-matter-gallery__caption-popover'
				)
			) {
				return;
			}
			actions.closeCaption();
		}),
		onCaptionKeydown: withSyncEvent((event) => {
			if (!state.openCaptionKey || event.key !== 'Escape') {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			actions.closeCaption();
		}),
	},
	callbacks: {
		loadCarousel: () => {
			const context = getContext(STORE);

			if (context?.type !== 'carousel') {
				return;
			}

			const { ref } = getElement();
			const viewportNode = ref.querySelector(
				'.wp-block-matter-gallery__viewport'
			);
			const containerNode = ref.querySelector(
				'.wp-block-matter-gallery__track'
			);

			if (!viewportNode || !containerNode) {
				return;
			}

			const { carouselOptions, pluginState } = prepareCarouselBlockState({
				carouselConfig: context.carouselConfig,
				advancedCarouselConfig: context.advancedCarouselConfig,
				advancedCarouselConfigMerge:
					context.advancedCarouselConfigMerge,
			});

			const carouselApi = EmblaCarousel(
				viewportNode,
				{
					...carouselOptions,
					container: containerNode,
					slides: '.wp-block-matter-gallery__slide',
				},
				buildCarouselPlugins(pluginState)
			);

			context.carouselApi = carouselApi;

			const prevButtonNode = ref.querySelector(
				'.wp-block-matter-gallery__button--previous'
			);
			const nextButtonNode = ref.querySelector(
				'.wp-block-matter-gallery__button--next'
			);
			const thumbsViewportNode = ref.querySelector(
				'.wp-block-matter-gallery__thumbs-viewport'
			);
			const thumbsContainerNode = ref.querySelector(
				'.wp-block-matter-gallery__thumbs-track'
			);

			if (prevButtonNode && nextButtonNode) {
				const removePrevNextBtnsClickHandlers =
					addPrevNextBtnsClickHandlers(
						carouselApi,
						prevButtonNode,
						nextButtonNode
					);
				carouselApi.on('destroy', removePrevNextBtnsClickHandlers);
			}

			if (thumbsViewportNode && thumbsContainerNode) {
				const thumbsCarouselApi = EmblaCarousel(thumbsViewportNode, {
					containScroll: 'keepSnaps',
					container: thumbsContainerNode,
					dragFree: true,
				});
				const removeThumbsClickHandlers = addThumbsClickHandlers(
					carouselApi,
					thumbsCarouselApi,
					thumbsContainerNode
				);

				carouselApi.on('destroy', removeThumbsClickHandlers);
				carouselApi.on('destroy', () => thumbsCarouselApi.destroy());
			}
		},
	},
});
