/**
 * Extend @wordpress/scripts to build shared interactivity modules alongside blocks.
 *
 * Block viewScriptModule fields reference registered module IDs (not file: paths).
 * Shared modules are added here as explicit module entries.
 */
const path = require('path');

const defaultConfigs = require('@wordpress/scripts/config/webpack.config');

const overlayStoreEntry = path.resolve(
	__dirname,
	'src/interactivity/overlay-store.js'
);

if (!Array.isArray(defaultConfigs)) {
	module.exports = defaultConfigs;
} else {
	module.exports = defaultConfigs.map((config, index) => {
		if (index !== 1 || typeof config.entry !== 'function') {
			return config;
		}

		const originalEntry = config.entry;

		return {
			...config,
			entry: () => ({
				...originalEntry(),
				'interactivity/overlay-store': overlayStoreEntry,
			}),
		};
	});
}
