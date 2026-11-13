/**
 * Carousel behaviour (store: matter/carousel), powered by Embla.
 *
 * Slides are the track's children, or the items of a Query Loop, Product
 * Collection or Terms Query inside it. Slide widths and gaps are set in theme CSS; options
 * (loop, align, slidesToScroll, autoplay, autoScroll) and the controls come
 * from the block's variant.
 *
 * State for theme CSS, on the carousel: `--carousel-progress` (0–1, as it
 * scrolls), `--carousel-autoplay` (each slide's duration), and the classes
 * `is-playing`, `is-start`, `is-end`, `is-scrollable` and `is-timing` (while
 * an autoplay countdown runs). Slides get `is-selected` and `is-in-view`;
 * dots and thumbnails get `aria-current`, and dots `data-distance` (from the
 * current dot).
 *
 * API: `matter.carousel( target )` → instance (see README); events
 * `matter-carousel-ready`, `-select`, `-settle`, `-play` and `-pause`.
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
import AutoScroll from 'embla-carousel-auto-scroll';
import Autoplay from 'embla-carousel-autoplay';

/**
 * Internal dependencies
 */
import {
	emit,
	fromDirective,
	registerInstance,
	registerType,
	resolve,
} from '../../interactivity/api';

const SELECTOR = '.wp-block-matter-carousel';
const QUERY_LISTS =
	'.wp-block-post-template, .wc-block-product-template, .wp-block-woocommerce-product-template, .wp-block-term-template';

registerType('carousel', SELECTOR);

// Carousel element => instance.
const instances = new WeakMap();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/**
 * Whether a scroll should jump rather than animate: when asked, or when the
 * visitor prefers reduced motion.
 *
 * @param {boolean} instant Asked for.
 * @return {boolean} Jump.
 */
const jump = (instant = false) => instant || reducedMotion.matches;

/**
 * Mark an element current or not. `aria-current="true"`: an empty value
 * means false, so screen readers wouldn't announce it.
 *
 * @param {Element} element   Element.
 * @param {boolean} isCurrent Current.
 */
const setCurrent = (element, isCurrent) => {
	if (isCurrent) {
		element.setAttribute('aria-current', 'true');
	} else {
		element.removeAttribute('aria-current');
	}
};

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

const clamp = (value) => Math.min(1, Math.max(0, value));

/**
 * This carousel's elements matching a selector (not a nested carousel's).
 *
 * @param {Element} root     Carousel.
 * @param {string}  selector Selector.
 * @return {Element[]} Elements.
 */
const own = (root, selector) =>
	[...root.querySelectorAll(selector)].filter(
		(element) => element.closest(SELECTOR) === root
	);

/**
 * The scroll position (snap) that shows a slide.
 *
 * @param {Object} embla Embla instance.
 * @param {number} slide Slide index.
 * @return {number} Snap index.
 */
const snapForSlide = (embla, slide) => {
	const registry = embla.internalEngine().slideRegistry;
	const snap = registry.findIndex((group) => group.includes(slide));

	return snap >= 0 ? snap : slide;
};

const selectedSlides = (embla) =>
	embla.internalEngine().slideRegistry[embla.selectedScrollSnap()] ?? [];

/**
 * Label slides, mark the current slide, dot and thumbnail, and rebuild the
 * dots and counter for the current scroll positions.
 *
 * @param {Object}  embla   Embla instance.
 * @param {Element} root    Carousel element.
 * @param {Object}  context Carousel context.
 */
const updateUi = (embla, root, context) => {
	const slides = embla.slideNodes();
	const snaps = embla.scrollSnapList();
	const current = embla.selectedScrollSnap();
	const selected = selectedSlides(embla);

	// Slides that are a list's items (a query's, a product collection's): the
	// list is presentational, as items that are groups don't make a list.
	const list = slides[0]?.parentElement;

	if (list && ['UL', 'OL'].includes(list.tagName)) {
		list.setAttribute('role', 'none');
	}

	slides.forEach((slide, index) => {
		slide.setAttribute('role', 'group');
		slide.setAttribute('aria-roledescription', 'slide');
		slide.setAttribute(
			'aria-label',
			format(context.labels.slide, index + 1, slides.length)
		);
		slide.classList.toggle('is-selected', selected.includes(index));
	});

	own(root, '.wp-block-matter-carousel__dots').forEach((dots) => {
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
					dot.addEventListener('click', () =>
						embla.scrollTo(index, jump())
					);

					return dot;
				})
			);
		}

		[...dots.children].forEach((dot, index) => {
			const distance = Math.abs(index - current);

			setCurrent(dot, index === current);
			dot.dataset.distance = String(
				context.options.loop
					? Math.min(distance, snaps.length - distance)
					: distance
			);
		});
	});

	own(root, '.wp-block-matter-carousel__thumbnails').forEach((strip) => {
		const thumbnails = [...strip.children];

		thumbnails.forEach((thumbnail) =>
			setCurrent(
				thumbnail,
				selected.includes(Number(thumbnail.dataset.index))
			)
		);

		// Keep the current thumbnail in view in a scrolling strip.
		const active = thumbnails.find((thumbnail) =>
			thumbnail.hasAttribute('aria-current')
		);

		if (active && strip.scrollWidth > strip.clientWidth) {
			// Centre it, measured within the strip (offsetLeft is relative to
			// the nearest positioned ancestor, not the strip).
			const offset =
				active.getBoundingClientRect().left -
				strip.getBoundingClientRect().left +
				strip.scrollLeft;

			strip.scrollTo({
				left: offset - (strip.clientWidth - active.offsetWidth) / 2,
				behavior: reducedMotion.matches ? 'auto' : 'smooth',
			});
		}
	});

	own(root, '.wp-block-matter-carousel__counter').forEach((counter) => {
		counter.querySelector(
			'.wp-block-matter-carousel__counter-current'
		).textContent = String(current + 1);
		counter.querySelector(
			'.wp-block-matter-carousel__counter-total'
		).textContent = String(snaps.length);
	});
};

/**
 * The carousel an action targets: from a directive, the carousel around the
 * clicked control; from the API, the given carousel.
 *
 * @param {*} target Directive event, element ID or element.
 * @return {Object|undefined} Instance.
 */
const instanceFor = (target) =>
	instances.get(
		fromDirective(target)
			? getElement().ref.closest(SELECTOR)
			: resolve(target, SELECTOR)
	);

store('matter/carousel', {
	actions: {
		prev(target, instant = false) {
			instanceFor(target)?.prev(fromDirective(target) ? false : instant);
		},
		next(target, instant = false) {
			instanceFor(target)?.next(fromDirective(target) ? false : instant);
		},
		goTo(target, index, instant = false) {
			instanceFor(target)?.goTo(index, instant);
		},
		play(target) {
			instanceFor(target)?.play();
		},
		pause(target) {
			instanceFor(target)?.pause();
		},
		togglePlay(target) {
			const instance = instanceFor(target);

			if (instance?.isPlaying) {
				instance.pause();
			} else {
				instance?.play();
			}
		},
		reInit(target, options) {
			instanceFor(target)?.reInit(options);
		},
	},
	callbacks: {
		init() {
			const context = getContext();
			const { ref } = getElement();
			const viewport = own(ref, '.wp-block-matter-carousel__viewport')[0];
			const track = viewport.querySelector(
				'.wp-block-matter-carousel__track'
			);
			// The carousel's own query (the track's child), not one inside a
			// slide.
			const queryList = track.querySelector(
				QUERY_LISTS.split(',')
					.map((list) => `:scope > * > ${list.trim()}`)
					.join(', ')
			);
			const canMove = !reducedMotion.matches;

			ref.classList.toggle('is-query', !!queryList);

			const plugins = [];
			const pause = {
				stopOnInteraction: false,
				stopOnMouseEnter: true,
				stopOnFocusIn: true,
			};

			if (context.autoplay && canMove) {
				plugins.push(Autoplay({ delay: context.autoplay, ...pause }));
				ref.style.setProperty(
					'--carousel-autoplay',
					`${context.autoplay}ms`
				);
			} else if (context.autoScroll && canMove) {
				plugins.push(
					AutoScroll({ speed: Number(context.autoScroll), ...pause })
				);
			} else {
				context.isPlaying = false;
			}

			// Nothing moves by itself for visitors who prefer reduced motion,
			// so there's nothing to pause.
			if (!canMove) {
				own(ref, '.wp-block-matter-carousel__play').forEach(
					(button) => {
						button.hidden = true;
					}
				);
			}

			// Slides may have been scrolled natively before Embla started.
			viewport.scrollLeft = 0;

			const embla = EmblaCarousel(
				viewport,
				{ ...context.options, container: queryList || track },
				plugins
			);
			const motion = () =>
				embla.plugins().autoplay ?? embla.plugins().autoScroll;

			const sync = withScope(() => {
				const snaps = embla.scrollSnapList().length;

				context.canPrev = embla.canScrollPrev();
				context.canNext = embla.canScrollNext();
				context.isScrollable = snaps > 1;
				// Set here, not with directives, which would reset the
				// classes view.js adds (is-initialised, is-query, is-timing).
				ref.classList.toggle('is-start', !context.canPrev);
				ref.classList.toggle('is-end', !context.canNext);
				ref.classList.toggle('is-scrollable', context.isScrollable);
				ref.classList.toggle('is-playing', context.isPlaying);
				updateUi(embla, ref, context);
			});

			const setProgress = () =>
				ref.style.setProperty(
					'--carousel-progress',
					String(clamp(embla.scrollProgress()))
				);

			// Paused with the pause button or the API. Embla's plugins start
			// again by themselves (pointer leaving, focus leaving, a swipe
			// ending, reInit), which must not override a pause (WCAG 2.2.2).
			let isPaused = false;

			const setPlaying = withScope((isPlaying) => {
				const plugin = motion();

				if (!plugin || context.isPlaying === isPlaying) {
					return;
				}

				isPaused = !isPlaying;

				if (isPlaying) {
					plugin.play();
				} else {
					plugin.stop();
				}

				context.isPlaying = isPlaying;
				ref.classList.toggle('is-playing', isPlaying);
				emit(ref, 'carousel', isPlaying ? 'play' : 'pause');
			});

			// The plugins announce they're playing before they start their
			// timer, so stop them just after.
			const holdPause = () =>
				window.queueMicrotask(() => isPaused && motion()?.stop());

			// Restart the countdown (timer part) whenever a slide's timer starts.
			const restartTimer = () => {
				ref.classList.remove('is-timing');
				// Reflow, so the animation starts again.
				void ref.offsetWidth;
				ref.classList.add('is-timing');
			};

			embla
				.on('init', sync)
				.on('reInit', sync)
				.on('select', () => {
					sync();
					emit(ref, 'carousel', 'select', {
						index: embla.selectedScrollSnap(),
						count: embla.scrollSnapList().length,
						slides: selectedSlides(embla),
					});
				})
				.on('settle', () =>
					emit(ref, 'carousel', 'settle', {
						index: embla.selectedScrollSnap(),
					})
				)
				.on('scroll', setProgress)
				.on('reInit', setProgress)
				.on('slidesInView', () => {
					const inView = embla.slidesInView();

					embla
						.slideNodes()
						.forEach((slide, index) =>
							slide.classList.toggle(
								'is-in-view',
								inView.includes(index)
							)
						);
				})
				.on('autoplay:play', holdPause)
				.on('autoScroll:play', holdPause)
				.on('autoplay:timerset', restartTimer)
				.on('autoplay:timerstopped', () =>
					ref.classList.remove('is-timing')
				);

			// Thumbnails go to their slide.
			own(ref, '.wp-block-matter-carousel__thumbnails').forEach((strip) =>
				strip.addEventListener('click', (event) => {
					const thumbnail = event.target.closest(
						'.wp-block-matter-carousel__thumbnail'
					);

					if (thumbnail) {
						embla.scrollTo(
							snapForSlide(
								embla,
								Number(thumbnail.dataset.index)
							),
							jump()
						);
					}
				})
			);

			sync();
			setProgress();
			ref.classList.add('is-initialised');

			// The first slide's timer started before the listener above.
			if (embla.plugins().autoplay?.isPlaying()) {
				restartTimer();
			}

			const instance = {
				element: ref,
				get id() {
					return ref.id || null;
				},
				/** Current scroll position (as dots: one per page of slides). */
				get index() {
					return embla.selectedScrollSnap();
				},
				/** Number of scroll positions. */
				get count() {
					return embla.scrollSnapList().length;
				},
				get slides() {
					return [...embla.slideNodes()];
				},
				/** Indexes of the slides at the current position. */
				get selectedSlides() {
					return [...selectedSlides(embla)];
				},
				get progress() {
					return clamp(embla.scrollProgress());
				},
				get isPlaying() {
					return context.isPlaying;
				},
				get canPrev() {
					return embla.canScrollPrev();
				},
				get canNext() {
					return embla.canScrollNext();
				},
				/** The Embla instance, for anything the API doesn't cover. */
				get embla() {
					return embla;
				},
				goTo: (index, instant = false) =>
					embla.scrollTo(index, jump(instant)),
				goToSlide: (slide, instant = false) =>
					embla.scrollTo(snapForSlide(embla, slide), jump(instant)),
				next: (instant = false) => embla.scrollNext(jump(instant)),
				prev: (instant = false) => embla.scrollPrev(jump(instant)),
				play: () => setPlaying(true),
				pause: () => setPlaying(false),
				reInit: (options) => embla.reInit(options),
			};

			instances.set(ref, instance);
			registerInstance('carousel', ref, instance);

			// Removed with the block (e.g. by client-side navigation).
			return () => {
				embla.destroy();
				instances.delete(ref);
			};
		},
	},
});
