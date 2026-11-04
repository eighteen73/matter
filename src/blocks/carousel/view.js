/**
 * Carousel behaviour (store: matter/carousel), powered by Embla.
 *
 * Slides are the track's children, or the items of a Query Loop / Product
 * Collection inside it. Slide widths and gaps are set in theme CSS; options
 * (loop, align, slidesToScroll, autoplay) come from the block's variant.
 */

/**
 * WordPress dependencies
 */
import {
	getContext,
	getElement,
	store,
	withScope,
} from '@wordpress/interactivity';

/**
 * External dependencies
 */
import EmblaCarousel from 'embla-carousel';
import Autoplay from 'embla-carousel-autoplay';

const QUERY_LISTS =
	'.wp-block-post-template, .wc-block-product-template, .wp-block-woocommerce-product-template';

const instances = new WeakMap();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/**
 * Minimal sprintf for translated labels: `%1$d`, `%2$d` and `%d`.
 *
 * @param {string}    template Label template.
 * @param {...number} values   Values.
 * @return {string} Label.
 */
const format = (template, ...values) =>
	template
		.replace(/%(\d)\$d/g, (_, position) => values[position - 1])
		.replace('%d', values[0]);

/**
 * Label slides and rebuild the dots for the current scroll snaps.
 *
 * @param {Object}  embla   Embla instance.
 * @param {Element} root    Carousel element.
 * @param {Object}  context Carousel context.
 */
const updateUi = (embla, root, context) => {
	const slides = embla.slideNodes();

	slides.forEach((slide, index) => {
		slide.setAttribute('role', 'group');
		slide.setAttribute('aria-roledescription', 'slide');
		slide.setAttribute(
			'aria-label',
			format(context.labels.slide, index + 1, slides.length)
		);
	});

	const dots = root.querySelector('.wp-block-matter-carousel__dots');

	if (dots) {
		const snaps = embla.scrollSnapList();

		if (dots.children.length !== snaps.length) {
			dots.replaceChildren(
				...snaps.map((_, index) => {
					const dot = document.createElement('button');

					dot.type = 'button';
					dot.className = 'wp-block-matter-carousel__dot';
					dot.setAttribute(
						'aria-label',
						format(context.labels.goTo, index + 1)
					);
					dot.addEventListener('click', () => embla.scrollTo(index));

					return dot;
				})
			);
		}

		[...dots.children].forEach((dot, index) =>
			dot.toggleAttribute(
				'aria-current',
				index === embla.selectedScrollSnap()
			)
		);
	}
};

store('matter/carousel', {
	actions: {
		prev() {
			instances
				.get(getElement().ref.closest('.wp-block-matter-carousel'))
				?.scrollPrev();
		},
		next() {
			instances
				.get(getElement().ref.closest('.wp-block-matter-carousel'))
				?.scrollNext();
		},
		togglePlay() {
			const autoplay = instances
				.get(getElement().ref.closest('.wp-block-matter-carousel'))
				?.plugins()?.autoplay;

			if (!autoplay) {
				return;
			}

			const context = getContext();

			if (context.isPlaying) {
				autoplay.stop();
			} else {
				autoplay.play();
			}

			context.isPlaying = !context.isPlaying;
		},
	},
	callbacks: {
		init() {
			const context = getContext();
			const { ref } = getElement();
			const viewport = ref.querySelector(
				'.wp-block-matter-carousel__viewport'
			);
			const track = ref.querySelector('.wp-block-matter-carousel__track');
			const queryList = track.querySelector(QUERY_LISTS);

			ref.classList.toggle('is-query', !!queryList);

			const plugins = [];

			if (context.autoplay && !reducedMotion.matches) {
				plugins.push(
					Autoplay({
						delay: context.autoplay,
						stopOnInteraction: false,
						stopOnMouseEnter: true,
						stopOnFocusIn: true,
					})
				);
			} else {
				context.isPlaying = false;
			}

			const embla = EmblaCarousel(
				viewport,
				{ ...context.options, container: queryList || track },
				plugins
			);

			instances.set(ref, embla);

			const sync = withScope(() => {
				context.canPrev = embla.canScrollPrev();
				context.canNext = embla.canScrollNext();
				updateUi(embla, ref, context);
			});

			embla.on('init', sync).on('select', sync).on('reInit', sync);
			sync();
			ref.classList.add('is-initialised');
		},
	},
});
