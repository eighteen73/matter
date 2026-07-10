import { store, getContext, getElement } from '@wordpress/interactivity';
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

store(STORE, {
	callbacks: {
		loadCarousel: () => {
			const context = getContext(STORE);

			if (context?.type !== 'carousel') {
				return;
			}

			const { ref } = getElement();
			const viewportNode = ref.querySelector('.matter-gallery__viewport');
			const containerNode = ref.querySelector('.matter-gallery__track');

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
					slides: '.matter-gallery__slide',
				},
				buildCarouselPlugins(pluginState)
			);

			context.carouselApi = carouselApi;

			const prevButtonNode = ref.querySelector(
				'.matter-gallery__nav--prev'
			);
			const nextButtonNode = ref.querySelector(
				'.matter-gallery__nav--next'
			);
			const thumbsViewportNode = ref.querySelector(
				'.matter-gallery__thumbs-viewport'
			);
			const thumbsContainerNode = ref.querySelector(
				'.matter-gallery__thumbs-track'
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
