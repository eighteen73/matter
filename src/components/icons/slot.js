import { SVG, Path } from '@wordpress/components';

/**
 * The slot block's icon: a dashed frame, an area waiting for content. (Core's
 * `layout` icon is the post template's and template part's.)
 */
export const Slot = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path d="M4 5h3v1.5H5.5V8H4V5zm16 0h-3v1.5h1.5V8H20V5zM4 19h3v-1.5H5.5V16H4v3zm16 0h-3v-1.5h1.5V16H20v3zM10 5h4v1.5h-4V5zm0 12.5h4V19h-4v-1.5zM4 10.25h1.5v3.5H4v-3.5zm14.5 0H20v3.5h-1.5v-3.5z" />
	</SVG>
);
