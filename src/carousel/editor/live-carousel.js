/**
 * A live Embla carousel for the editor, shared by the carousel and gallery
 * blocks so the canvas matches the front end: real slide widths (theme CSS),
 * the variant's alignment and paging, working arrows and dots.
 *
 * Differences from the front end: no dragging (so slides stay editable), no
 * loop and no autoplay or auto-scroll (their controls show, disabled).
 * Selecting a block inside a slide scrolls to it.
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
		selectedSlides: [],
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
				selectedSlides:
					embla.internalEngine().slideRegistry[
						embla.selectedScrollSnap()
					] ?? [],
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

const PARTS = [
	'prev',
	'next',
	'dots',
	'progress',
	'timer',
	'counter',
	'play',
	'thumbnails',
	'expand',
];
const POSITIONS = ['before', 'stage', 'after'];

/**
 * The variant's control groups, as Carousel::controls() cleans them: known
 * positions and parts; a play button for moving carousels.
 *
 * @param {Object}  options       Variant options.
 * @param {boolean} hasThumbnails Thumbnails are available.
 * @param {boolean} canExpand     The expand part is available.
 * @return {Object} Parts by position.
 */
export function controlGroups(options, hasThumbnails, canExpand) {
	const groups = {};

	POSITIONS.forEach((position) => {
		const parts = [
			...new Set([].concat(options.controls?.[position] ?? [])),
		].filter(
			(part) =>
				PARTS.includes(part) &&
				(part !== 'thumbnails' || hasThumbnails) &&
				(part !== 'expand' || canExpand)
		);

		if (parts.length) {
			groups[position] = parts;
		}
	});

	const moves =
		Number(options.autoplay) > 0 || Number(options.autoScroll) > 0;

	if (moves && !Object.values(groups).flat().includes('play')) {
		groups.after = [...(groups.after ?? []), 'play'];
	}

	return groups;
}

/**
 * State classes for the carousel element, as view.js sets them.
 *
 * @param {Object} carousel From useLiveCarousel().
 * @return {string} Classes.
 */
export const carouselClasses = (carousel) =>
	[
		'is-initialised',
		carousel.snaps > 1 && 'is-scrollable',
		!carousel.canPrev && 'is-start',
		!carousel.canNext && 'is-end',
	]
		.filter(Boolean)
		.join(' ');

function Part({ part, carousel, thumbnails }) {
	const progress =
		carousel.snaps > 1 ? carousel.selected / (carousel.snaps - 1) : 0;

	switch (part) {
		case 'prev':
		case 'next':
			return (
				<button
					type="button"
					className={`wp-block-matter-carousel__${part}`}
					aria-label={
						part === 'prev'
							? __('Previous slide', 'matter')
							: __('Next slide', 'matter')
					}
					disabled={
						part === 'prev' ? !carousel.canPrev : !carousel.canNext
					}
					onClick={part === 'prev' ? carousel.prev : carousel.next}
				/>
			);
		case 'play':
		case 'expand':
			return (
				<button
					type="button"
					className={`wp-block-matter-carousel__${part}`}
					aria-label={__('Front end only', 'matter')}
					disabled
				/>
			);
		case 'dots':
			return (
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
							data-distance={Math.abs(index - carousel.selected)}
							onClick={() => carousel.scrollTo(index)}
						/>
					))}
				</div>
			);
		case 'progress':
		case 'timer':
			return (
				<div
					className={`wp-block-matter-carousel__${part}`}
					style={
						part === 'progress'
							? { '--carousel-progress': progress }
							: undefined
					}
				>
					<span className={`wp-block-matter-carousel__${part}-bar`} />
				</div>
			);
		case 'counter':
			return (
				<div className="wp-block-matter-carousel__counter">
					<span className="wp-block-matter-carousel__counter-current">
						{carousel.selected + 1}
					</span>
					<span className="wp-block-matter-carousel__counter-separator">
						{' / '}
					</span>
					<span className="wp-block-matter-carousel__counter-total">
						{carousel.snaps}
					</span>
				</div>
			);
		case 'thumbnails':
			return (
				<div className="wp-block-matter-carousel__thumbnails">
					{thumbnails.map((url, index) => (
						<button
							key={index}
							type="button"
							className="wp-block-matter-carousel__thumbnail"
							aria-current={
								carousel.selectedSlides.includes(index)
									? 'true'
									: undefined
							}
							onClick={() => carousel.scrollToSlide(index)}
						>
							{url && <img src={url} alt="" />}
						</button>
					))}
				</div>
			);
	}

	return null;
}

/**
 * The carousel's layout around its viewport, with the front end's markup:
 * control groups before and after, and the stage (the viewport plus controls
 * laid over it).
 *
 * @param {Object}  props
 * @param {Object}  props.carousel   From useLiveCarousel().
 * @param {Object}  props.options    Variant options.
 * @param {Array}   props.thumbnails Image URLs, one per slide (image slides only).
 * @param {boolean} props.canExpand  Offer the expand part (gallery lightbox).
 * @param {Element} props.children   The viewport.
 * @return {Element} Layout.
 */
export function CarouselFrame({
	carousel,
	options,
	thumbnails = [],
	canExpand = false,
	children,
}) {
	const groups = controlGroups(options, thumbnails.length > 0, canExpand);
	const group = (position) =>
		groups[position] && (
			<div
				className={`wp-block-matter-carousel__controls is-${position}`}
			>
				{groups[position].map((part) => (
					<Part
						key={part}
						part={part}
						carousel={carousel}
						thumbnails={thumbnails}
					/>
				))}
			</div>
		);

	return (
		<>
			{group('before')}
			<div className="wp-block-matter-carousel__stage">
				{children}
				{group('stage')}
			</div>
			{group('after')}
		</>
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
