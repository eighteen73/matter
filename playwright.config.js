/**
 * Browser tests (npm run test:e2e), against wp-env's test site
 * (.wp-env.tests.json, port 8889), with the fixture theme active. wp-scripts'
 * config logs in as admin.
 */
const { defineConfig, devices } = require('@playwright/test');
const base = require('@wordpress/scripts/config/playwright.config.js');

module.exports = defineConfig({
	...base,
	testDir: './tests/e2e',
	// Chromium runs everything. Firefox and WebKit run only specs tagged
	// `@cross-browser` (dialogs, focus return, panels and menus): WebKit
	// covers Safari not focusing a button on click. Run one with
	// `npx playwright test --project=webkit`.
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{
			name: 'firefox',
			grep: /@cross-browser/,
			use: { ...devices['Desktop Firefox'] },
		},
		{
			name: 'webkit',
			grep: /@cross-browser/,
			use: { ...devices['Desktop Safari'] },
		},
	],
	globalSetup: require.resolve('./tests/e2e/global-setup.js'),
	webServer: {
		...base.webServer,
		command: 'npm run env:start:tests',
	},
});
