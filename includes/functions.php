<?php
/**
 * Public template functions.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter;

use Eighteen73\Matter\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Get a site setting by `section.field` path.
 *
 * @param string $path          Dot path, e.g. `contact.phone`.
 * @param mixed  $default_value Returned when the setting is unknown or empty.
 * @return mixed
 */
function setting( string $path, mixed $default_value = null ): mixed {
	return Settings::instance()->get( $path, $default_value );
}
