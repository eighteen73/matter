/**
 * WordPress dependencies
 */
import { createContext } from '@wordpress/element';

/**
 * Editor-only: which tab is showing, so tab blocks can hide the others.
 *
 * Shared through a global because tabs and tab are separate bundles; each
 * importing this module would otherwise get its own context object.
 */
window.matterActiveTabContext ??= createContext({
	activeId: null,
	setActiveId: () => {},
});

export const ActiveTabContext = window.matterActiveTabContext;
