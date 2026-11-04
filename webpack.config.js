/**
 * Extend @wordpress/scripts with Matter's non-block entries.
 *
 * - Script entries: admin apps (e.g. the site settings page).
 * - Module entries: shared Interactivity API stores. Block viewScriptModule
 *   fields reference these registered module IDs rather than file paths.
 */
const path = require('path');

const [
	scriptConfig,
	moduleConfig,
] = require('@wordpress/scripts/config/webpack.config');

const src = (file) => path.resolve(__dirname, 'src', file);

const scriptEntries = {
	'settings/index': src('settings/index.js'),
};

const moduleEntries = {
	'interactivity/overlay-store': src('interactivity/overlay-store.js'),
	'interactivity/lightbox-store': src('interactivity/lightbox-store.js'),
};

const withEntries = (config, entries) => ({
	...config,
	entry: () => ({
		...(typeof config.entry === 'function' ? config.entry() : config.entry),
		...entries,
	}),
});

module.exports = [
	withEntries(scriptConfig, scriptEntries),
	withEntries(moduleConfig, moduleEntries),
];
