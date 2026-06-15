import { store, getElement, getContext } from '@wordpress/interactivity';

import EmblaCarousel from 'embla-carousel';

import {
	buildEmblaPlugins,
	prepareEmblaBlockState,
} from './utils/embla-block-config';
import {
	addPrevNextBtnsClickHandlers,
	addDotBtnsAndClickHandlers,
	setupProgressBar,
} from './utils/embla';

const STORE_NAMESPACE = 'matter/carousel';

store(STORE_NAMESPACE, {
	callbacks: {
		loadEmblaCarousel: () => {
			const { ref } = getElement();

			const viewportNode = ref.querySelector('.embla__viewport');
			const containerNode = ref.querySelector('.embla__container');

			if (!viewportNode || !containerNode) {
				return;
			}

			window.eighteen73Blocks = window.eighteen73Blocks || {};
			window.eighteen73Blocks.carousels =
				window.eighteen73Blocks.carousels || new Map();

			const context = getContext(STORE_NAMESPACE);

			const queryLoop =
				containerNode.querySelector('.wp-block-post-template') ||
				containerNode.querySelector(
					'.wp-block-woocommerce-product-template'
				);

			const { emblaOptions, pluginState } = prepareEmblaBlockState({
				emblaConfig: context.emblaConfig,
				advancedEmblaConfig: context.advancedEmblaConfig,
				advancedEmblaConfigMerge: context.advancedEmblaConfigMerge,
			});

			const emblaApi = EmblaCarousel(
				viewportNode,
				{
					...emblaOptions,
					container: queryLoop ? queryLoop : containerNode,
				},
				buildEmblaPlugins(pluginState)
			);

			context.emblaApi = emblaApi;
			window.eighteen73Blocks.carousels.set(context.carouselId, emblaApi);

			const prevButtonNode = ref.querySelector(
				'.embla__button--previous'
			);
			const nextButtonNode = ref.querySelector('.embla__button--next');
			const dotsNode = ref.querySelector('.embla__dots');
			const progressNode = ref.querySelector('.embla__progress__bar');

			if (prevButtonNode && nextButtonNode) {
				const removePrevNextBtnsClickHandlers =
					addPrevNextBtnsClickHandlers(
						emblaApi,
						prevButtonNode,
						nextButtonNode
					);

				emblaApi.on('destroy', removePrevNextBtnsClickHandlers);
			}

			if (dotsNode) {
				const removeDotBtnsAndClickHandlers =
					addDotBtnsAndClickHandlers(emblaApi, dotsNode);

				emblaApi.on('destroy', removeDotBtnsAndClickHandlers);
			}

			if (progressNode) {
				const { applyProgress, removeProgress } = setupProgressBar(
					emblaApi,
					progressNode
				);

				emblaApi
					.on('init', applyProgress)
					.on('reInit', applyProgress)
					.on('scroll', applyProgress)
					.on('slideFocus', applyProgress)
					.on('destroy', removeProgress);
			}
		},
	},
});
