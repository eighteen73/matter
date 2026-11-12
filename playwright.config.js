/**
 * Browser tests (npm run test:e2e), against wp-env's tests site (port 8889),
 * with the fixture theme active. wp-scripts' config logs in as admin.
 */
const { defineConfig } = require('@playwright/test');
const base = require('@wordpress/scripts/config/playwright.config.js');

module.exports = defineConfig({
	...base,
	testDir: './tests/e2e',
	globalSetup: require.resolve('./tests/e2e/global-setup.js'),
	webServer: {
		...base.webServer,
		command: 'npm run env:start',
	},
});
