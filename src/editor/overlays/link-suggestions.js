/**
 * Offer the page's overlays in link search, so a button can open a modal
 * by picking it by name rather than typing its #ID.
 *
 * The editor's link search comes from the block editor setting
 * `__experimentalFetchLinkSuggestions`. The editor can replace the settings
 * at any time, so the search is wrapped again whenever it changes.
 */

/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { dispatch, select, subscribe } from '@wordpress/data';

/**
 * Internal dependencies
 */
import { getOverlay, getOverlayIds } from './utils';

/**
 * Overlays matching a search, as link suggestions.
 *
 * @param {string} search Search text ('' for the initial suggestions).
 * @return {Array} Suggestions.
 */
const overlaySuggestions = (search) => {
	const term = search.trim().toLowerCase();

	return getOverlayIds(select)
		.map((clientId) => getOverlay(select, clientId))
		.filter(
			(overlay) =>
				overlay?.id &&
				(!term ||
					[overlay.title, overlay.type, overlay.id].some((text) =>
						text.toLowerCase().includes(term)
					))
		)
		.map((overlay) => ({
			id: `#${overlay.id}`,
			title: overlay.title,
			url: `#${overlay.id}`,
			type: overlay.type,
			kind: 'matter-overlay',
		}));
};

const wrap = (fetchSuggestions) => {
	const wrapped = async (search, options = {}) => {
		const results = await fetchSuggestions(search, options);

		return [...overlaySuggestions(search ?? ''), ...(results ?? [])];
	};

	wrapped.matterOverlays = true;

	return wrapped;
};

subscribe(() => {
	const settings = select(blockEditorStore).getSettings();
	const fetchSuggestions = settings?.__experimentalFetchLinkSuggestions;

	if (
		typeof fetchSuggestions === 'function' &&
		!fetchSuggestions.matterOverlays
	) {
		dispatch(blockEditorStore).updateSettings({
			__experimentalFetchLinkSuggestions: wrap(fetchSuggestions),
		});
	}
}, blockEditorStore);
