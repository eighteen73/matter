/**
 * Look an icon up in the registry's list: the icon, and whether it is known
 * to be missing (the list has loaded and has no icon of that name).
 *
 * @param {Array|undefined} icons      Every icon, once loaded.
 * @param {boolean}         isResolved Whether the list has loaded.
 * @param {string}          name       Icon name, e.g. pulsar/arrow-right.
 * @return {{icon: (Object|undefined), isMissing: boolean}} Result.
 */
export function findIcon(icons, isResolved, name) {
	if (!name || !isResolved) {
		return { icon: undefined, isMissing: false };
	}

	const icon = (icons ?? []).find((candidate) => candidate.name === name);

	return { icon, isMissing: !icon };
}
