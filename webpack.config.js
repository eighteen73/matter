/**
 * Extend @wordpress/scripts with Matter's non-block entries.
 *
 * - Script entries: admin apps (e.g. the site settings page).
 * - Style entries: stylesheets for PHP-rendered components (menus, panels).
 * - Module entries: Interactivity API stores. Block viewScriptModule fields
 *   reference these registered module IDs rather than file paths.
 */
const path = require('path');

const [
	scriptConfig,
	moduleConfig,
] = require('@wordpress/scripts/config/webpack.config');

const src = (file) => path.resolve(__dirname, 'src', file);

const scriptEntries = {
	'editor/index': src('editor/index.js'),
	'settings/index': src('settings/index.js'),
};

const styleEntries = {
	'menu/base': src('menu/styles/base.scss'),
	'menu/dropdown': src('menu/styles/dropdown.scss'),
	'menu/accordion': src('menu/styles/accordion.scss'),
	'menu/drill-down': src('menu/styles/drill-down.scss'),
	'panel/base': src('panel/styles/base.scss'),
	'panel/collapsed': src('panel/styles/collapsed.scss'),
	'panel/expanded': src('panel/styles/expanded.scss'),
};

const moduleEntries = {
	'overlay/view': src('overlay/view.js'),
	'menu/view': src('menu/view.js'),
	'panel/view': src('panel/view.js'),
};

/**
 * Drops the empty JS (and asset file) webpack emits for stylesheet-only entries.
 */
class RemoveStyleEntryScripts {
	constructor(names) {
		this.names = names;
	}

	apply(compiler) {
		const { Compilation } = compiler.webpack;

		compiler.hooks.thisCompilation.tap(
			'RemoveStyleEntryScripts',
			(compilation) => {
				compilation.hooks.processAssets.tap(
					{
						name: 'RemoveStyleEntryScripts',
						stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
					},
					() => {
						this.names.forEach((name) =>
							[
								`${name}.js`,
								`${name}.js.map`,
								`${name}.asset.php`,
							]
								.filter((file) => compilation.getAsset(file))
								.forEach((file) =>
									compilation.deleteAsset(file)
								)
						);
					}
				);
			}
		);
	}
}

const withEntries = (config, entries, plugins = []) => ({
	...config,
	entry: () => ({
		...(typeof config.entry === 'function' ? config.entry() : config.entry),
		...entries,
	}),
	plugins: [...config.plugins, ...plugins],
});

module.exports = [
	withEntries(scriptConfig, { ...scriptEntries, ...styleEntries }, [
		new RemoveStyleEntryScripts(Object.keys(styleEntries)),
	]),
	withEntries(moduleConfig, moduleEntries),
];
