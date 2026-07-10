import { SVG, Path, G, Rect } from '@wordpress/components';

export const Gallery = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		width="24"
		height="24"
	>
		<G>
			<Rect x="3" y="3" width="8" height="8" />
			<Rect x="13" y="3" width="8" height="8" />
			<Rect x="3" y="13" width="8" height="8" />
			<Path d="M13 13h8v8h-8z" />
		</G>
	</SVG>
);

export default { Gallery };
