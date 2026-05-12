import { store, getElement, getContext } from '@wordpress/interactivity';

import EmblaCarousel from 'embla-carousel';
import ClassNames from 'embla-carousel-class-names';
import Autoplay from 'embla-carousel-autoplay';

import { buildMergedEmblaOptions } from '../../utils/embla-carousel-options';
import {
	addPrevNextBtnsClickHandlers,
	addDotBtnsAndClickHandlers,
	setupProgressBar,
} from '../../utils/embla';

const STORE_NAMESPACE = 'eighteen73-blocks/carousel';

store(STORE_NAMESPACE, {
	callbacks: {
		loadEmblaCarousel: () => {
			const { ref } = getElement();
			const context = getContext(STORE_NAMESPACE);

			const viewportNode = ref.querySelector('.embla__viewport');
			const containerNode = ref.querySelector('.embla__container');

			if (!viewportNode || !containerNode) {
				return;
			}

			const plugins = [ClassNames()];

			plugins.push(
				Autoplay({
					active: context.autoplay ?? false,
					speed: 1,
				})
			);

			const merged = buildMergedEmblaOptions({
				baseOptions: context.options ?? {},
				advancedOptions: context.advancedCarouselConfig ?? {},
				mergeWithBase: context.advancedCarouselConfigMerge === true,
			});

			const emblaApi = EmblaCarousel(
				viewportNode,
				{
					...merged,
					container: containerNode,
				},
				plugins
			);

			context.emblaApi = emblaApi;

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
