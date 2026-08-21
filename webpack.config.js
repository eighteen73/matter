/**
 * Extend @wordpress/scripts to build shared interactivity modules alongside
 * blocks, and to compile core-block extensions from src/extensions.
 *
 * Block viewScriptModule fields reference registered module IDs (not file: paths).
 * Shared modules are added here as explicit module entries.
 */
const path = require('path');
const fg = require('fast-glob');

const defaultConfigs = require('@wordpress/scripts/config/webpack.config');

const overlayStoreEntry = path.resolve(
	__dirname,
	'src/interactivity/overlay-store.js'
);
const lightboxStoreEntry = path.resolve(
	__dirname,
	'src/interactivity/lightbox-store.js'
);

/**
 * Webpack entries for src/extensions/{name}/index.js.
 *
 * @return {Object<string, string>} Named webpack entries.
 */
const getExtensionEntries = () => {
	const files = fg.sync(['src/extensions/*/index.js'], {
		onlyFiles: true,
	});

	return files.reduce((entries, file) => {
		const name = file.replace(/^src\//, '').replace(/\/index\.js$/, '');
		entries[name] = path.resolve(__dirname, file);
		return entries;
	}, {});
};

/**
 * Merge extra entries into a wp-scripts entry (object or function).
 *
 * @param {Function|Object} originalEntry Original webpack entry.
 * @param {Object}          extra         Extra named entries.
 * @return {Function|Object} Merged webpack entry.
 */
const mergeEntry = (originalEntry, extra) => {
	if (typeof originalEntry === 'function') {
		return async () => {
			const original = await originalEntry();
			return {
				...original,
				...extra,
			};
		};
	}

	return {
		...originalEntry,
		...extra,
	};
};

if (!Array.isArray(defaultConfigs)) {
	module.exports = defaultConfigs;
} else {
	const extensionEntries = getExtensionEntries();

	module.exports = defaultConfigs.map((config, index) => {
		if (index === 0) {
			return {
				...config,
				entry: mergeEntry(config.entry, extensionEntries),
			};
		}

		if (index === 1 && typeof config.entry === 'function') {
			const originalEntry = config.entry;

			return {
				...config,
				entry: () => ({
					...originalEntry(),
					'interactivity/overlay-store': overlayStoreEntry,
					'interactivity/lightbox-store': lightboxStoreEntry,
				}),
			};
		}

		return config;
	});
}
