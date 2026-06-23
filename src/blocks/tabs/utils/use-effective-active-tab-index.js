/**
 * Resolve the active tab index for editor UI, preferring ephemeral editor state.
 *
 * @param {Object} context Block context from the tabs parent.
 * @return {number} Active tab index.
 */
export function useEffectiveActiveTabIndex(context) {
	return (
		context['matter/tabs-editorActiveTabIndex'] ??
		context['matter/tabs-activeTabIndex'] ??
		0
	);
}
