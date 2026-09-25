/**
 * WordPress dependencies
 */
import { isValidFragment } from '@wordpress/url';

/**
 * Whether a value is a hash/anchor link (e.g. #section).
 *
 * Mirrors core `isHashLink` from the block editor LinkControl helpers.
 *
 * @see https://github.com/WordPress/gutenberg/blob/trunk/packages/block-editor/src/components/link-control/is-url-like.js
 *
 * @param {string} value Value to check.
 * @return {boolean} True if the value is a valid hash link.
 */
export function isHashLink(value) {
	return value?.startsWith('#') && isValidFragment(value);
}

/**
 * Whether a value is a relative path (e.g. /page, ./page, ../page).
 *
 * @param {string} value Value to check.
 * @return {boolean} True if the value is a relative path.
 */
export function isRelativePath(value) {
	return (
		value?.startsWith('/') ||
		value?.startsWith('./') ||
		value?.startsWith('../')
	);
}

/**
 * Suggestion query for LinkControl, matching core navigation-link.
 *
 * @param {string} type Entity type.
 * @param {string} kind Entity kind.
 * @return {Object} Suggestions query.
 */
export function getSuggestionsQuery(type, kind) {
	const perPage = 20;

	switch (type) {
		case 'post':
		case 'page':
			return { type: 'post', subtype: type, perPage };
		case 'category':
			return { type: 'term', subtype: 'category', perPage };
		case 'tag':
			return { type: 'term', subtype: 'post_tag', perPage };
		case 'post_format':
			return { type: 'post-format', perPage };
		default:
			if (kind === 'taxonomy') {
				return { type: 'term', subtype: type, perPage };
			}
			if (kind === 'post-type') {
				return { type: 'post', subtype: type, perPage };
			}
			return {
				initialSuggestionsSearchOptions: {
					type: 'post',
					subtype: 'page',
					perPage,
				},
			};
	}
}
