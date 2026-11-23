import { SVG, Path } from '@wordpress/components';

/**
 * The active filters' icon: a chip, a pill with a name and the cross that
 * removes it. (Core's icons have no chip.)
 */
export const Chip = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path
			fillRule="evenodd"
			clipRule="evenodd"
			d="M8 7h8a5 5 0 0 1 0 10H8A5 5 0 0 1 8 7zm0 1.5a3.5 3.5 0 0 0 0 7h8a3.5 3.5 0 0 0 0-7H8z"
		/>
		<Path d="M6.5 11.25h5v1.5h-5v-1.5zm7.97-.72 1.06-1.06.97.97.97-.97 1.06 1.06-.97.97.97.97-1.06 1.06-.97-.97-.97.97-1.06-1.06.97-.97-.97-.97z" />
	</SVG>
);
