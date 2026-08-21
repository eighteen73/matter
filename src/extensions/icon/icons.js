import { SVG, Path } from '@wordpress/primitives';

export const IconLeft = ({ height = 24, width = 24 }) => (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		height={height}
		width={width}
		viewBox="0 0 48 48"
	>
		<Path d="M6 16h16v16H6z" />
		<Path d="M28 22h14v3H28z" />
	</SVG>
);

export const IconRight = ({ height = 24, width = 24 }) => (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		height={height}
		width={width}
		viewBox="0 0 48 48"
	>
		<Path d="M26 16h16v16H26z" />
		<Path d="M6 23h14v3H6z" />
	</SVG>
);
