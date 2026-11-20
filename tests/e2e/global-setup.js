/**
 * Before the browser tests: wp-scripts' set-up (log in as admin), then the
 * fixture theme, which the PHPUnit install resets (both use the tests site's
 * database), an Editor-role user, and the Arabic language pack.
 */
const { execFile } = require('child_process');
const { promisify } = require('util');
const { request } = require('@playwright/test');
const { RequestUtils } = require('@wordpress/e2e-test-utils-playwright');
const baseSetup = require('@wordpress/scripts/config/playwright/global-setup.js');
const { ensureEditorUser, resetSiteLanguage } = require('./fixtures');

const run = promisify(execFile);

/**
 * Install the Arabic language pack (it downloads from wordpress.org). Sets
 * MATTER_E2E_ARABIC=1 for the workers when it worked; without network the run
 * carries on and tests that need Arabic skip themselves.
 *
 * @return {Promise<void>}
 */
async function installArabic() {
	process.env.MATTER_E2E_ARABIC = '0';

	try {
		await run(
			'npx',
			[
				'wp-env',
				'--config=.wp-env.tests.json',
				'run',
				'cli',
				'wp',
				'language',
				'core',
				'install',
				'ar',
			],
			{ timeout: 120_000 }
		);
		process.env.MATTER_E2E_ARABIC = '1';
	} catch (error) {
		// eslint-disable-next-line no-console
		console.warn(
			`Arabic language pack not installed (no network?); Arabic tests will skip. ${error.message}`
		);
	}
}

module.exports = async (config) => {
	await baseSetup(config);

	const { storageState, baseURL } = config.projects[0].use;
	const context = await request.newContext({ baseURL });
	const requestUtils = new RequestUtils(context, {
		storageStatePath:
			typeof storageState === 'string' ? storageState : undefined,
	});

	await requestUtils.setupRest();
	await requestUtils.activateTheme('matter-test-theme');
	await ensureEditorUser(requestUtils);
	// A run that stopped midway can leave the site in another language.
	await resetSiteLanguage(requestUtils);
	await context.dispose();

	await installArabic();
};
