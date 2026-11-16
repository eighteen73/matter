/**
 * Installs Matter's git hooks (lefthook.yml) after `npm install`, but only in
 * Matter's own repository. Matter is often built inside a project (cloned or
 * copied into its mu-plugins), and hooks installed there would replace the
 * project's own. So lefthook isn't an npm dependency (its install script would
 * write the hooks into whichever repository holds the folder) and runs from
 * npx only here. Skipped in CI.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = fs.realpathSync(path.join(__dirname, '..'));
let top = '';

try {
	top = fs.realpathSync(
		execSync('git rev-parse --show-toplevel', {
			cwd: root,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim()
	);
} catch {
	// Not in a git repository.
}

if (process.env.CI || top !== root) {
	process.exit(0);
}

try {
	execSync('npx --yes lefthook@2.1.9 install', {
		cwd: root,
		stdio: 'inherit',
	});
} catch {
	// eslint-disable-next-line no-console
	console.warn(
		"Matter's git hooks weren't installed: run `npm run prepare`."
	);
}
