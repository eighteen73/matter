/**
 * WordPress dependencies
 */
import { select } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';

/**
 * Resolve a display title for a wp_navigation entity record.
 *
 * @param {Object} menu Navigation menu entity record.
 * @return {string} Menu title for UI labels.
 */
export function getMenuTitle(menu) {
	const renderedTitle = menu?.title?.rendered;

	if (typeof renderedTitle === 'string' && renderedTitle.length) {
		return renderedTitle;
	}

	return sprintf(
		/* translators: %d: menu ID. */
		__('Menu #%d', 'matter'),
		menu?.id || 0
	);
}

/**
 * Resolve a navigation menu title from a block ref attribute.
 *
 * @param {number} ref wp_navigation post ID.
 * @return {string} Menu title, or empty string when unavailable.
 */
export function getNavigationMenuTitleByRef(ref) {
	if (!ref) {
		return '';
	}

	const menu = select('core').getEntityRecord(
		'postType',
		'wp_navigation',
		ref
	);

	if (!menu) {
		return sprintf(
			/* translators: %d: menu ID. */
			__('Menu #%d', 'matter'),
			ref
		);
	}

	return getMenuTitle(menu);
}

/**
 * Create an __experimentalLabel callback for the navigation block.
 *
 * @return {(attributes: Object) => string|undefined} List View label callback.
 */
export function createNavigationBlockLabel() {
	return (attributes) => {
		const label = getNavigationMenuTitleByRef(attributes?.ref);

		return label || undefined;
	};
}
