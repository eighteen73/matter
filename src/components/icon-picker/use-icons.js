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
 * One icon by name.
 *
 * @param {string} name Icon name, e.g. pulsar/arrow-right.
 * @return {Object|undefined} Icon.
 */
export function useIcon(name) {
	return useSelect(
		(select) =>
			name
				? select(coreStore).getEntityRecord('root', 'icon', name)
				: undefined,
		[name]
	);
}
