/**
 * A live Embla carousel for the editor, shared by the carousel and gallery
 * blocks so the canvas matches the front end: real slide widths (theme CSS),
 * the variant's alignment and paging, working arrows and dots.
 *
 * Differences from the front end: no dragging (so slides stay editable), no
 * loop and no autoplay. Selecting a block inside a slide scrolls to it.
 */

/**
 * External dependencies
 */
import EmblaCarousel from 'embla-carousel';

/**
 * WordPress dependencies
 */
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

const QUERY_LISTS =
	'.wp-block-post-template, .wc-block-product-template, .wp-block-woocommerce-product-template';

/**
 * A block's variant options, as resolved on the server by Variants::get().
 *
 * @param {string} blockName Block name.
 * @param {string} className Block className (carries is-style-*).
 * @param {Object} base      Options to start from (e.g. carousel defaults).
 * @return {Object} Options.
 */
export function variantOptions(blockName, className = '', base = {}) {
	const variants = window.matterEditor?.variants?.[blockName] ?? {};
	const slug = className.match(/(?:^|\s)is-style-([\w-]+)/)?.[1] ?? 'default';

	return { ...base, ...(variants.default ?? {}), ...(variants[slug] ?? {}) };
}

/**
 * Run Embla on a viewport whose first child is the slide track (or holds a
 * Query Loop whose items are the slides).
 *
 * @param {Object} options Variant options (align, slidesToScroll).
 * @return {Object} `ref` for the viewport, state and controls.
 */
export function useLiveCarousel(options) {
	const [viewport, setViewport] = useState(null);
	const [status, setStatus] = useState({
		canPrev: false,
		canNext: false,
		snaps: 0,
		selected: 0,
		isQuery: false,
	});
	const emblaRef = useRef(null);

	const align = ['start', 'center', 'end'].includes(options.align)
		? options.align
		: 'start';
	const slidesToScroll =
		options.slidesToScroll === 'auto'
			? 'auto'
			: Math.max(1, parseInt(options.slidesToScroll, 10) || 1);

	useEffect(() => {
		const track = viewport?.firstElementChild;

		if (!track) {
			return;
		}

		let embla = null;
		let container = null;

		const update = () =>
			setStatus({
				canPrev: embla.canScrollPrev(),
				canNext: embla.canScrollNext(),
				snaps: embla.scrollSnapList().length,
				selected: embla.selectedScrollSnap(),
				isQuery: container !== track,
			});

		const create = () => {
			embla?.destroy();
			container = track.querySelector(QUERY_LISTS) || track;
			embla = EmblaCarousel(viewport, {
				align,
				slidesToScroll,
				container,
				// Block wrappers only (not appenders or other editor UI); in a
				// query, not the hidden preview of the post being edited.
				slides:
					container === track
						? ':scope > [data-block]'
						: ':scope > :not([style*="display: none"])',
				watchDrag: false,
				// The editor changes the track's children (e.g. on selection):
				// re-measure without jumping back to the first slide.
				watchSlides: (instance) => {
					instance.reInit({
						startIndex: instance.selectedScrollSnap(),
					});

					return false;
				},
				loop: false,
				duration: 20,
			});
			embla.on('init', update).on('select', update).on('reInit', update);
			emblaRef.current = embla;
			update();
		};

		create();

		// Focusing a slide (e.g. selecting a block) scrolls the viewport
		// natively; Embla does the positioning instead.
		const resetScroll = () => {
			viewport.scrollLeft = 0;
		};

		viewport.addEventListener('scroll', resetScroll);

		// A Query Loop's list appears (or is replaced) after its posts load,
		// and the editor hides the preview of whichever post is being edited.
		const observer =
			new viewport.ownerDocument.defaultView.MutationObserver(
				(mutations) => {
					if (
						(track.querySelector(QUERY_LISTS) || track) !==
						container
					) {
						create();
					} else if (
						container !== track &&
						mutations.some(
							(mutation) =>
								mutation.type === 'attributes' &&
								mutation.target.parentElement === container
						)
					) {
						embla.reInit({
							startIndex: embla.selectedScrollSnap(),
						});
					}
				}
			);

		observer.observe(track, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['style'],
		});

		return () => {
			viewport.removeEventListener('scroll', resetScroll);
			observer.disconnect();
			embla?.destroy();
			emblaRef.current = null;
		};
	}, [viewport, align, slidesToScroll]);

	const scrollToSlide = useCallback((index) => {
		const embla = emblaRef.current;

		if (!embla || index < 0) {
			return;
		}

		const registry = embla.internalEngine?.().slideRegistry ?? [];
		const snap = registry.findIndex((group) => group.includes(index));

		embla.scrollTo(snap >= 0 ? snap : index);
	}, []);

	return {
		ref: setViewport,
		...status,
		prev: () => emblaRef.current?.scrollPrev(),
		next: () => emblaRef.current?.scrollNext(),
		scrollTo: (snap) => emblaRef.current?.scrollTo(snap),
		scrollToSlide,
	};
}

/**
 * Arrows, dots and the play button, with the front end's markup.
 *
 * @param {Object} props
 * @param {Object} props.carousel From useLiveCarousel().
 * @param {Object} props.options  Variant options (arrows, dots, autoplay).
 * @return {Element|null} Controls.
 */
export function CarouselControls({ carousel, options }) {
	const hasAutoplay = Number(options.autoplay) > 0;

	if (!options.arrows && !options.dots && !hasAutoplay) {
		return null;
	}

	return (
		<div className="wp-block-matter-carousel__controls">
			{hasAutoplay && (
				<button
					type="button"
					className="wp-block-matter-carousel__play"
					aria-label={__('Autoplay (front end only)', 'matter')}
					aria-pressed="false"
					disabled
				/>
			)}
			{options.arrows && (
				<button
					type="button"
					className="wp-block-matter-carousel__prev"
					aria-label={__('Previous slide', 'matter')}
					disabled={!carousel.canPrev}
					onClick={carousel.prev}
				/>
			)}
			{options.dots && (
				<div className="wp-block-matter-carousel__dots">
					{Array.from({ length: carousel.snaps }, (_, index) => (
						<button
							key={index}
							type="button"
							className="wp-block-matter-carousel__dot"
							aria-label={sprintf(
								/* translators: %d: slide number */
								__('Go to slide %d', 'matter'),
								index + 1
							)}
							aria-current={
								index === carousel.selected ? 'true' : undefined
							}
							onClick={() => carousel.scrollTo(index)}
						/>
					))}
				</div>
			)}
			{options.arrows && (
				<button
					type="button"
					className="wp-block-matter-carousel__next"
					aria-label={__('Next slide', 'matter')}
					disabled={!carousel.canNext}
					onClick={carousel.next}
				/>
			)}
		</div>
	);
}

/**
 * Index of the direct child (slide) of a block that contains the selection.
 *
 * @param {Function} select   Data registry select.
 * @param {string}   clientId Carousel client ID.
 * @param {string}   store    Block editor store.
 * @return {number} Slide index, or -1.
 */
export function selectedSlideIndex(select, clientId, store) {
	const { getSelectedBlockClientId, getBlockParents, getBlockOrder } =
		select(store);
	const selected = getSelectedBlockClientId();

	if (!selected) {
		return -1;
	}

	const order = getBlockOrder(clientId);
	const chain = [selected, ...getBlockParents(selected, true)];

	return order.findIndex((id) => chain.includes(id));
}
