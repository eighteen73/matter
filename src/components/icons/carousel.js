import { SVG, Path } from '@wordpress/components';

/**
 * The carousel's icon: a slide between the edges of the ones before and
 * after it. (Core's icons have no carousel.)
 */
export const Carousel = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path d="M17 5H7v14h10V5zm-1.5 12.5h-7v-11h7v11zM3 7h1.5v10H3V7zm16.5 0H21v10h-1.5V7z" />
	</SVG>
);
