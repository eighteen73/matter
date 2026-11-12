import eighteen73 from '@eighteen73/eslint-config-wordpress';
import globals from 'globals';

export default [
	{ ignores: ['**/build/**', '**/node_modules/**', '**/vendor/**'] },
	...eighteen73,
	{
		// Unit tests (npm run test:unit).
		files: ['**/test/*.js'],
		languageOptions: { globals: globals.jest },
	},
];
