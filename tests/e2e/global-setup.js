/**
 * Before the browser tests: wp-scripts' set-up (log in as admin), then the
 * fixture theme, which the PHPUnit install resets (both use the tests site's
 * database).
 */
const { request } = require('@playwright/test');
const { RequestUtils } = require('@wordpress/e2e-test-utils-playwright');
const baseSetup = require('@wordpress/scripts/config/playwright/global-setup.js');

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
	await context.dispose();
};
