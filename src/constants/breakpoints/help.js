import { __ } from '@wordpress/i18n';

/**
 * Translated help text for each breakpoint token. Kept separate from
 * `./index.js` so the pure data module remains free of `@wordpress/i18n`
 * (which is not currently supported in script-module bundles).
 */
const breakpointHelp = {
	xs: __('Small mobile screens.', 'pulsar-extensions'),
	sm: __('Mobile screens.', 'pulsar-extensions'),
	md: __('Landscape mobiles and below.', 'pulsar-extensions'),
	lg: __('Tablets in portrait mode and below.', 'pulsar-extensions'),
	xl: __(
		'Smaller laptops or tablets in landscape mode and below.',
		'pulsar-extensions'
	),
};

export default breakpointHelp;
