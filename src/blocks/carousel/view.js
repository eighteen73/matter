import { store, getElement, getContext } from '@wordpress/interactivity';

import EmblaCarousel from 'embla-carousel';

import {
	buildEmblaPlugins,
	prepareEmblaBlockState,
} from './utils/embla-block-config';
import {
	addPrevNextBtnsClickHandlers,
	addDotBtnsAndClickHandlers,
	addThumbsClickHandlers,
	setupProgressBar,
} from './utils/embla';

const PRIVATE_STORE = 'matter/carousel/private';
const PUBLIC_STORE = 'matter/carousel';

const createReadOnlyProxy = (object) =>
	new Proxy(object, {
		get(target, prop) {
			const value = target[prop];

			if (typeof value === 'object' && value !== null) {
				return createReadOnlyProxy(value);
			}

			return value;
		},
		set() {
			return false;
		},
		deleteProperty() {
			return false;
		},
	});

const getContextId = () => getContext(PUBLIC_STORE)?.id;

const resolveId = (passthroughId = false) =>
	typeof passthroughId === 'string' ? passthroughId : privateState.id;

const resolvePublicId = (passthroughId = false) =>
	typeof passthroughId === 'string' ? passthroughId : getContextId();

const getItem = (id) => privateState.items[id];

const getInstanceForId = (id) => getItem(id)?.instance || null;

/**
 * Initialise Embla and register the instance on the private store.
 *
 * @return {void}
 */
const loadCarousel = () => {
	const { ref } = getElement();
	const context = getContext(PUBLIC_STORE);
	const id = context?.id;

	if (!id || !ref) {
		return;
	}

	const viewportNode = ref.querySelector('.embla__viewport');
	const containerNode = ref.querySelector('.embla__container');

	if (!viewportNode || !containerNode) {
		return;
	}

	const queryLoop =
		containerNode.querySelector('.wp-block-post-template') ||
		containerNode.querySelector('.wp-block-woocommerce-product-template');

	const { emblaOptions, pluginState } = prepareEmblaBlockState({
		emblaConfig: context.emblaConfig,
		advancedEmblaConfig: context.advancedEmblaConfig,
		advancedEmblaConfigMerge: context.advancedEmblaConfigMerge,
	});

	const instance = EmblaCarousel(
		viewportNode,
		{
			...emblaOptions,
			container: queryLoop ? queryLoop : containerNode,
		},
		buildEmblaPlugins(pluginState)
	);

	if (!privateState.items[id]) {
		privateState.items[id] = {};
	}

	privateState.items[id].instance = instance;

	const prevButtonNode = ref.querySelector('.embla__button--previous');
	const nextButtonNode = ref.querySelector('.embla__button--next');
	const dotsNode = ref.querySelector('.embla__dots');
	const thumbsViewportNode = ref.querySelector('.embla__thumbs__viewport');
	const thumbsContainerNode = ref.querySelector('.embla__thumbs__container');
	const progressNode = ref.querySelector('.embla__progress__bar');

	if (prevButtonNode && nextButtonNode) {
		const removePrevNextBtnsClickHandlers = addPrevNextBtnsClickHandlers(
			instance,
			prevButtonNode,
			nextButtonNode
		);

		instance.on('destroy', removePrevNextBtnsClickHandlers);
	}

	if (dotsNode) {
		const removeDotBtnsAndClickHandlers = addDotBtnsAndClickHandlers(
			instance,
			dotsNode
		);

		instance.on('destroy', removeDotBtnsAndClickHandlers);
	}

	if (thumbsViewportNode && thumbsContainerNode) {
		const thumbsInstance = EmblaCarousel(thumbsViewportNode, {
			containScroll: 'keepSnaps',
			container: thumbsContainerNode,
			dragFree: true,
		});
		const removeThumbsClickHandlers = addThumbsClickHandlers(
			instance,
			thumbsInstance,
			thumbsContainerNode
		);

		instance.on('destroy', removeThumbsClickHandlers);
		instance.on('destroy', () => thumbsInstance.destroy());
	}

	if (progressNode) {
		const { applyProgress, removeProgress } = setupProgressBar(
			instance,
			progressNode
		);

		instance
			.on('init', applyProgress)
			.on('reInit', applyProgress)
			.on('scroll', applyProgress)
			.on('slideFocus', applyProgress)
			.on('destroy', removeProgress);
	}
};

const { actions: privateActions, state: privateState } = store(
	PRIVATE_STORE,
	{
		state: {
			items: {},
			get id() {
				return getContextId();
			},
			get item() {
				return getItem(privateState.id);
			},
			get instance() {
				return getInstanceForId(privateState.id);
			},
		},
		actions: {
			getInstance: (passthroughId = false) =>
				getInstanceForId(resolveId(passthroughId)),
			scrollNext: (passthroughId = false, instant = false) => {
				privateActions.getInstance(passthroughId)?.scrollNext(instant);
			},
			scrollPrev: (passthroughId = false, instant = false) => {
				privateActions.getInstance(passthroughId)?.scrollPrev(instant);
			},
			scrollTo: (passthroughId = false, index = 0, instant = false) => {
				const instance = privateActions.getInstance(passthroughId);

				if (!instance || typeof index !== 'number') {
					return;
				}

				instance.scrollTo(index, instant);
			},
			reInit: (passthroughId = false) => {
				privateActions.getInstance(passthroughId)?.reInit();
			},
		},
		callbacks: {
			loadCarousel,
		},
	},
	{
		lock: true,
	}
);

store(PUBLIC_STORE, {
	state: {
		get items() {
			return createReadOnlyProxy(privateState.items);
		},
		get item() {
			const { item } = privateState;

			return item ? createReadOnlyProxy(item) : undefined;
		},
		get instance() {
			return privateState.instance;
		},
	},
	actions: {
		getInstance(id = false) {
			return privateActions.getInstance(resolvePublicId(id));
		},
		scrollNext(id = false, instant = false) {
			privateActions.scrollNext(resolvePublicId(id), instant);
		},
		scrollPrev(id = false, instant = false) {
			privateActions.scrollPrev(resolvePublicId(id), instant);
		},
		scrollTo(id = false, index = 0, instant = false) {
			privateActions.scrollTo(resolvePublicId(id), index, instant);
		},
		reInit(id = false) {
			privateActions.reInit(resolvePublicId(id));
		},
	},
	callbacks: {
		loadCarousel,
	},
});
