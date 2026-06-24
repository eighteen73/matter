/**
 * Returns the DOM node to portal editor overlays into.
 *
 * Prefers the block editor canvas iframe body so `position: fixed` is relative
 * to the canvas viewport, not a transformed block wrapper ancestor.
 *
 * @return {HTMLElement} Portal mount target.
 */
export function getEditorPortalRoot() {
	const iframe = document.querySelector('iframe[name="editor-canvas"]');

	if (iframe?.contentDocument?.body) {
		return iframe.contentDocument.body;
	}

	return document.body;
}
