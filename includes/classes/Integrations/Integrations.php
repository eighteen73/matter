<?php
/**
 * Boots Matter's integrations with other plugins.
 *
 * Matter is a must-use plugin, so it loads before regular plugins: whether
 * WooCommerce or Gravity Forms is active can only be known once they've
 * loaded. Each integration is checked on `plugins_loaded` and boots only if
 * its plugin is active, before `init`, when blocks register.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Integrations;

use Eighteen73\Matter\Integrations\GravityForms\GravityForms;
use Eighteen73\Matter\Integrations\WooCommerce\WooCommerce;
use Eighteen73\Matter\Singleton;

defined( 'ABSPATH' ) || exit;

/**
 * Integrations.
 */
final class Integrations {

	use Singleton;

	/**
	 * Integrations that booted, by class name.
	 *
	 * @var array<class-string<Integration>, Integration>
	 */
	private array $booted = [];

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_action( 'plugins_loaded', [ $this, 'boot' ], 20 );
	}

	/**
	 * The integrations Matter knows about.
	 *
	 * @return array<int, class-string<Integration>>
	 */
	public static function all(): array {
		/**
		 * Filters Matter's integrations: classes implementing
		 * `Eighteen73\Matter\Integrations\Integration`. Each boots on
		 * `plugins_loaded` when its `can_boot()` is true.
		 *
		 * @param array<int, class-string> $integrations Class names.
		 */
		return (array) apply_filters(
			'matter_integrations',
			[
				WooCommerce::class,
				GravityForms::class,
			]
		);
	}

	/**
	 * Boot each integration whose plugin is active.
	 *
	 * @return void
	 */
	public function boot(): void {
		foreach ( self::all() as $class ) {
			if ( ! is_string( $class ) || isset( $this->booted[ $class ] ) || ! is_subclass_of( $class, Integration::class ) ) {
				continue;
			}

			$integration = new $class();

			if ( $integration->can_boot() ) {
				$integration->boot();
				$this->booted[ $class ] = $integration;
			}
		}
	}

	/**
	 * A booted integration, e.g. to remove one of its hooks.
	 *
	 * @param string $class_name Class name (an Integration class).
	 * @return Integration|null Null when it didn't boot.
	 */
	public function get( string $class_name ): ?Integration {
		return $this->booted[ $class_name ] ?? null;
	}

	/**
	 * Whether an integration booted (its plugin is active).
	 *
	 * @param string $class_name Class name (an Integration class).
	 * @return bool
	 */
	public static function active( string $class_name ): bool {
		return null !== self::instance()->get( $class_name );
	}
}
