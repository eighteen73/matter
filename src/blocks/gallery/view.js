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
			const viewportNode = ref.querySelector('.embla__viewport');
			const containerNode = ref.querySelector('.embla__container');

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
				},
				buildCarouselPlugins(pluginState)
			);

			context.carouselApi = carouselApi;

			const prevButtonNode = ref.querySelector(
				'.embla__button--previous'
			);
			const nextButtonNode = ref.querySelector('.embla__button--next');
			const thumbsViewportNode = ref.querySelector(
				'.embla__thumbs__viewport'
			);
			const thumbsContainerNode = ref.querySelector(
				'.embla__thumbs__container'
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
