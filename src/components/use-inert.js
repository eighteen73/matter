/**
 * WordPress dependencies
 */
import { useRefEffect } from '@wordpress/compose';

/**
 * A ref that makes an element inert: its links, buttons and forms can't be
 * clicked, focused or submitted, so a server-rendered preview in the editor
 * can't navigate the canvas.
 *
 * Set on the element rather than as a prop: on a block's own wrapper the
 * editor passes its own `inert` (undefined unless the block is disabled),
 * which would replace one from useBlockProps, and React's handling of the
 * attribute differs between versions.
 *
 * @return {Function} Ref callback.
 */
export function useInert() {
	return useRefEffect((element) => {
		element.inert = true;

		return () => {
			element.inert = false;
		};
	}, []);
}
