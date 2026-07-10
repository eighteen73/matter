export const addTogglePrevNextBtnsActive = (carouselApi, prevBtn, nextBtn) => {
	const togglePrevNextBtnsState = () => {
		if (carouselApi.canScrollPrev()) {
			prevBtn.removeAttribute('disabled');
		} else {
			prevBtn.setAttribute('disabled', 'disabled');
		}

		if (carouselApi.canScrollNext()) {
			nextBtn.removeAttribute('disabled');
		} else {
			nextBtn.setAttribute('disabled', 'disabled');
		}
	};

	carouselApi
		.on('select', togglePrevNextBtnsState)
		.on('init', togglePrevNextBtnsState)
		.on('reInit', togglePrevNextBtnsState);

	togglePrevNextBtnsState();

	return () => {
		carouselApi
			.off('select', togglePrevNextBtnsState)
			.off('init', togglePrevNextBtnsState)
			.off('reInit', togglePrevNextBtnsState);
		prevBtn.removeAttribute('disabled');
		nextBtn.removeAttribute('disabled');
	};
};

export const addPrevNextBtnsClickHandlers = (carouselApi, prevBtn, nextBtn) => {
	const scrollPrev = () => {
		carouselApi.scrollPrev();
	};
	const scrollNext = () => {
		carouselApi.scrollNext();
	};
	prevBtn.addEventListener('click', scrollPrev, false);
	nextBtn.addEventListener('click', scrollNext, false);

	const removeTogglePrevNextBtnsActive = addTogglePrevNextBtnsActive(
		carouselApi,
		prevBtn,
		nextBtn
	);

	return () => {
		removeTogglePrevNextBtnsActive();
		prevBtn.removeEventListener('click', scrollPrev, false);
		nextBtn.removeEventListener('click', scrollNext, false);
	};
};

export const addDotBtnsAndClickHandlers = (carouselApi, dotsNode) => {
	let dotNodes = [];

	const addDotBtnsWithClickHandlers = () => {
		dotsNode.innerHTML = carouselApi
			.scrollSnapList()
			.map(() => '<button class="embla__dot" type="button"></button>')
			.join('');

		const scrollTo = (index) => {
			carouselApi.scrollTo(index);
		};

		dotNodes = Array.from(dotsNode.querySelectorAll('.embla__dot'));
		dotNodes.forEach((dotNode, index) => {
			dotNode.addEventListener('click', () => scrollTo(index), false);
		});
	};

	const toggleDotBtnsActive = () => {
		if (!dotNodes.length) {
			return;
		}

		const previous = carouselApi.previousScrollSnap();
		const selected = carouselApi.selectedScrollSnap();
		const previousDot = dotNodes[previous];
		const selectedDot = dotNodes[selected];

		if (previousDot) {
			previousDot.classList.remove('embla__dot--selected');
		}
		if (selectedDot) {
			selectedDot.classList.add('embla__dot--selected');
		}
	};

	carouselApi
		.on('init', addDotBtnsWithClickHandlers)
		.on('reInit', addDotBtnsWithClickHandlers)
		.on('init', toggleDotBtnsActive)
		.on('reInit', toggleDotBtnsActive)
		.on('select', toggleDotBtnsActive);

	if (carouselApi.scrollSnapList().length > 0) {
		addDotBtnsWithClickHandlers();
		toggleDotBtnsActive();
	}

	return () => {
		dotsNode.innerHTML = '';
	};
};

export const addThumbsClickHandlers = (
	carouselApi,
	thumbsCarouselApi,
	thumbsContainerNode
) => {
	let thumbNodes = [];
	let removeThumbClickHandlers = () => {};

	const getThumbNodes = () =>
		Array.from(thumbsContainerNode.children).filter(
			(thumbNode) => !thumbNode.classList.contains('block-list-appender')
		);

	const toggleThumbBtnsActive = () => {
		if (!thumbNodes.length) {
			return;
		}

		const selected = carouselApi.selectedScrollSnap();
		thumbsCarouselApi.scrollTo(selected);

		thumbNodes.forEach((thumbNode, index) => {
			const isSelected = index === selected;

			thumbNode.classList.toggle('embla__thumb--selected', isSelected);

			if (isSelected) {
				thumbNode.setAttribute('aria-current', 'true');
			} else {
				thumbNode.removeAttribute('aria-current');
			}
		});
	};

	const addThumbBtnsWithClickHandlers = () => {
		removeThumbClickHandlers();

		const activateThumb = (index, event) => {
			if (
				typeof thumbsCarouselApi.clickAllowed === 'function' &&
				!thumbsCarouselApi.clickAllowed()
			) {
				return;
			}

			event.preventDefault();
			carouselApi.scrollTo(index);
		};

		thumbNodes = getThumbNodes().slice(
			0,
			carouselApi.scrollSnapList().length
		);
		const removers = thumbNodes.map((thumbNode, index) => {
			const onClick = (event) => activateThumb(index, event);
			const onKeyDown = (event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					activateThumb(index, event);
				}
			};

			thumbNode.classList.add('embla__thumb');
			thumbNode.setAttribute('tabindex', '0');
			thumbNode.setAttribute('role', 'button');
			thumbNode.addEventListener('click', onClick, false);
			thumbNode.addEventListener('keydown', onKeyDown, false);

			return () => {
				thumbNode.classList.remove(
					'embla__thumb',
					'embla__thumb--selected'
				);
				thumbNode.removeAttribute('tabindex');
				thumbNode.removeAttribute('role');
				thumbNode.removeAttribute('aria-current');
				thumbNode.removeEventListener('click', onClick, false);
				thumbNode.removeEventListener('keydown', onKeyDown, false);
			};
		});

		removeThumbClickHandlers = () => {
			removers.forEach((remove) => remove());
		};

		toggleThumbBtnsActive();
	};

	carouselApi
		.on('init', addThumbBtnsWithClickHandlers)
		.on('reInit', addThumbBtnsWithClickHandlers)
		.on('init', toggleThumbBtnsActive)
		.on('reInit', toggleThumbBtnsActive)
		.on('select', toggleThumbBtnsActive);
	thumbsCarouselApi.on('reInit', addThumbBtnsWithClickHandlers);

	if (carouselApi.scrollSnapList().length > 0) {
		addThumbBtnsWithClickHandlers();
	}

	return () => {
		carouselApi
			.off('init', addThumbBtnsWithClickHandlers)
			.off('reInit', addThumbBtnsWithClickHandlers)
			.off('init', toggleThumbBtnsActive)
			.off('reInit', toggleThumbBtnsActive)
			.off('select', toggleThumbBtnsActive);
		thumbsCarouselApi.off('reInit', addThumbBtnsWithClickHandlers);

		removeThumbClickHandlers();
	};
};

export const setupProgressBar = (carouselApi, progressNode) => {
	const applyProgress = () => {
		const indicateCurrentPosition =
			progressNode.parentElement.dataset.indicateCurrentPosition ===
			'true';
		let finalProgress;

		if (indicateCurrentPosition) {
			const totalScrollSnaps = carouselApi.scrollSnapList().length;
			const currentSnapIndex = carouselApi.selectedScrollSnap();

			if (totalScrollSnaps > 0) {
				finalProgress = (currentSnapIndex + 1) / totalScrollSnaps;
			} else {
				finalProgress = 0;
			}
		} else {
			finalProgress = carouselApi.scrollProgress();
			progressNode.style.transition = 'none';
		}

		finalProgress = Math.max(0, Math.min(1, finalProgress));
		progressNode.style.transform = `translate3d(${finalProgress * 100}%,0px,0px)`;
	};

	const removeProgress = () => {
		progressNode.removeAttribute('style');
	};

	return {
		applyProgress,
		removeProgress,
	};
};
