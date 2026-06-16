export const addTogglePrevNextBtnsActive = (emblaApi, prevBtn, nextBtn) => {
	const togglePrevNextBtnsState = () => {
		if (emblaApi.canScrollPrev()) {
			prevBtn.removeAttribute('disabled');
		} else {
			prevBtn.setAttribute('disabled', 'disabled');
		}

		if (emblaApi.canScrollNext()) {
			nextBtn.removeAttribute('disabled');
		} else {
			nextBtn.setAttribute('disabled', 'disabled');
		}
	};

	emblaApi
		.on('select', togglePrevNextBtnsState)
		.on('init', togglePrevNextBtnsState)
		.on('reInit', togglePrevNextBtnsState);

	togglePrevNextBtnsState();

	return () => {
		emblaApi
			.off('select', togglePrevNextBtnsState)
			.off('init', togglePrevNextBtnsState)
			.off('reInit', togglePrevNextBtnsState);
		prevBtn.removeAttribute('disabled');
		nextBtn.removeAttribute('disabled');
	};
};

export const addPrevNextBtnsClickHandlers = (emblaApi, prevBtn, nextBtn) => {
	const scrollPrev = () => {
		emblaApi.scrollPrev();
	};
	const scrollNext = () => {
		emblaApi.scrollNext();
	};
	prevBtn.addEventListener('click', scrollPrev, false);
	nextBtn.addEventListener('click', scrollNext, false);

	const removeTogglePrevNextBtnsActive = addTogglePrevNextBtnsActive(
		emblaApi,
		prevBtn,
		nextBtn
	);

	return () => {
		removeTogglePrevNextBtnsActive();
		prevBtn.removeEventListener('click', scrollPrev, false);
		nextBtn.removeEventListener('click', scrollNext, false);
	};
};

export const addDotBtnsAndClickHandlers = (emblaApi, dotsNode) => {
	let dotNodes = [];

	const addDotBtnsWithClickHandlers = () => {
		dotsNode.innerHTML = emblaApi
			.scrollSnapList()
			.map(() => '<button class="embla__dot" type="button"></button>')
			.join('');

		const scrollTo = (index) => {
			emblaApi.scrollTo(index);
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

		const previous = emblaApi.previousScrollSnap();
		const selected = emblaApi.selectedScrollSnap();
		const previousDot = dotNodes[previous];
		const selectedDot = dotNodes[selected];

		if (previousDot) {
			previousDot.classList.remove('embla__dot--selected');
		}
		if (selectedDot) {
			selectedDot.classList.add('embla__dot--selected');
		}
	};

	emblaApi
		.on('init', addDotBtnsWithClickHandlers)
		.on('reInit', addDotBtnsWithClickHandlers)
		.on('init', toggleDotBtnsActive)
		.on('reInit', toggleDotBtnsActive)
		.on('select', toggleDotBtnsActive);

	if (emblaApi.scrollSnapList().length > 0) {
		addDotBtnsWithClickHandlers();
		toggleDotBtnsActive();
	}

	return () => {
		dotsNode.innerHTML = '';
	};
};

export const addThumbsClickHandlers = (
	emblaApi,
	thumbsEmblaApi,
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

		const selected = emblaApi.selectedScrollSnap();
		thumbsEmblaApi.scrollTo(selected);

		thumbNodes.forEach((thumbNode, index) => {
			thumbNode.classList.toggle(
				'embla__thumb--selected',
				index === selected
			);
		});
	};

	const addThumbBtnsWithClickHandlers = () => {
		removeThumbClickHandlers();

		const scrollTo = (index, event) => {
			if (
				typeof thumbsEmblaApi.clickAllowed === 'function' &&
				!thumbsEmblaApi.clickAllowed()
			) {
				return;
			}

			event.preventDefault();
			emblaApi.scrollTo(index);
		};

		thumbNodes = getThumbNodes().slice(0, emblaApi.scrollSnapList().length);
		const removers = thumbNodes.map((thumbNode, index) => {
			const onClick = (event) => scrollTo(index, event);

			thumbNode.classList.add('embla__thumb');
			thumbNode.addEventListener('click', onClick, false);

			return () => {
				thumbNode.classList.remove(
					'embla__thumb',
					'embla__thumb--selected'
				);
				thumbNode.removeEventListener('click', onClick, false);
			};
		});

		removeThumbClickHandlers = () => {
			removers.forEach((remove) => remove());
		};

		toggleThumbBtnsActive();
	};

	emblaApi
		.on('init', addThumbBtnsWithClickHandlers)
		.on('reInit', addThumbBtnsWithClickHandlers)
		.on('init', toggleThumbBtnsActive)
		.on('reInit', toggleThumbBtnsActive)
		.on('select', toggleThumbBtnsActive);
	thumbsEmblaApi.on('reInit', addThumbBtnsWithClickHandlers);

	if (emblaApi.scrollSnapList().length > 0) {
		addThumbBtnsWithClickHandlers();
	}

	return () => {
		emblaApi
			.off('init', addThumbBtnsWithClickHandlers)
			.off('reInit', addThumbBtnsWithClickHandlers)
			.off('init', toggleThumbBtnsActive)
			.off('reInit', toggleThumbBtnsActive)
			.off('select', toggleThumbBtnsActive);
		thumbsEmblaApi.off('reInit', addThumbBtnsWithClickHandlers);

		removeThumbClickHandlers();
	};
};

export const setupProgressBar = (emblaApi, progressNode) => {
	const applyProgress = () => {
		const indicateCurrentPosition =
			progressNode.parentElement.dataset.indicateCurrentPosition ===
			'true';
		let finalProgress;

		if (indicateCurrentPosition) {
			const totalScrollSnaps = emblaApi.scrollSnapList().length;
			const currentSnapIndex = emblaApi.selectedScrollSnap();

			if (totalScrollSnaps > 0) {
				finalProgress = (currentSnapIndex + 1) / totalScrollSnaps;
			} else {
				finalProgress = 0;
			}
		} else {
			finalProgress = emblaApi.scrollProgress();
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
