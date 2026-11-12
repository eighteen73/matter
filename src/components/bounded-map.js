/**
 * A Map that keeps only its most recently set entries, for caches that live
 * for an editor session (server-rendered previews), so a long session doesn't
 * hold every preview it has ever shown.
 *
 * @param {number} max Most entries kept.
 * @return {Map} Map.
 */
export default function boundedMap(max) {
	const map = new Map();
	const set = map.set.bind(map);

	map.set = (key, value) => {
		// Re-setting a key makes it the newest.
		map.delete(key);
		set(key, value);

		if (map.size > max) {
			map.delete(map.keys().next().value);
		}

		return map;
	};

	return map;
}
