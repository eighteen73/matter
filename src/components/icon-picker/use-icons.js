/**
 * Icons from the WordPress icon registry, via core-data (cached and shared).
 */

/**
 * WordPress dependencies
 */
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { useMemo } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { findIcon } from './find-icon';

/**
 * Collections the theme allows (`matter_icon_collections`); empty = all.
 *
 * @return {string[]} Collection slugs.
 */
export const allowedCollections = () =>
	window.matterEditor?.iconCollections ?? [];

/**
 * Icons in a collection ('' = every allowed collection).
 *
 * @param {string} collection Collection slug.
 * @return {Array|null} Icons ({ name, label, content, collection }), or null while loading.
 */
export function useIcons(collection = '') {
	const { icons, isResolved } = useSelect(
		(select) => {
			const { getEntityRecords, hasFinishedResolution } =
				select(coreStore);
			const query = collection ? { collection } : {};

			return {
				icons: getEntityRecords('root', 'icon', query),
				isResolved: hasFinishedResolution('getEntityRecords', [
					'root',
					'icon',
					query,
				]),
			};
		},
		[collection]
	);

	return useMemo(() => {
		if (!isResolved) {
			return null;
		}

		const allowed = allowedCollections();

		return (icons ?? []).filter(
			(icon) =>
				!allowed.length ||
				allowed.includes(icon.collection ?? icon.name.split('/')[0])
		);
	}, [icons, isResolved]);
}

/**
 * One icon by name, from the registry's list (one shared request) rather than
 * a request of its own: saved content can name an icon the theme no longer
 * has, and asking for that one is a 404 the browser logs as an error.
 *
 * @param {string} name Icon name, e.g. pulsar/arrow-right.
 * @return {{icon: (Object|undefined), isMissing: boolean}} The icon, and
 *         whether it is known to be missing.
 */
export function useIconState(name) {
	const { icons, isResolved } = useSelect(
		(select) => {
			if (!name) {
				return { icons: undefined, isResolved: false };
			}

			const { getEntityRecords, hasFinishedResolution } =
				select(coreStore);

			return {
				icons: getEntityRecords('root', 'icon', {}),
				isResolved: hasFinishedResolution('getEntityRecords', [
					'root',
					'icon',
					{},
				]),
			};
		},
		[name]
	);

	return useMemo(
		() => findIcon(icons, isResolved, name),
		[icons, isResolved, name]
	);
}

/**
 * One icon by name.
 *
 * @param {string} name Icon name, e.g. pulsar/arrow-right.
 * @return {Object|undefined} Icon.
 */
export function useIcon(name) {
	return useIconState(name).icon;
}
