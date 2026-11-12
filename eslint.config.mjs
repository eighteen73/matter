import eighteen73 from '@eighteen73/eslint-config-wordpress';
import globals from 'globals';

export default [
	{ ignores: ['**/build/**', '**/node_modules/**', '**/vendor/**'] },
	...eighteen73,
	{
		// Matter's shared script modules: external, loaded by ID (see
		// webpack.config.js), so not on disk to resolve.
		settings: { 'import/core-modules': ['@matter/focus-trap'] },
	},
	{
		// Unit tests (npm run test:unit).
		files: ['**/test/*.js'],
		languageOptions: { globals: globals.jest },
	},
];
