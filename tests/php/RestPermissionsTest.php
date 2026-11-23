<?php
/**
 * Every REST route Matter registers says who may use it.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use WP_REST_Request;

/**
 * REST permission callbacks.
 */
class RestPermissionsTest extends TestCase {

	/**
	 * Who may use each route, by the roles (and the logged-out visitor) that
	 * can. A route that isn't listed here fails the test: a new route has to
	 * say who may use it.
	 *
	 * @return array<string, string[]>
	 */
	private static function allowed(): array {
		$editing = [ 'contributor', 'editor', 'administrator' ];

		return [
			'/matter/v1/live'           => [ 'anonymous', 'subscriber', 'contributor', 'editor', 'administrator' ],
			'/matter/v1/template-part'  => $editing,
			'/matter/v1/query-display'  => $editing,
			'/matter/v1/loop-items'     => $editing,
			'/matter/v1/loop-items/terms' => $editing,
			// Archive entries are pages' worth of content: editors, not
			// contributors.
			'/matter/v1/archive-targets' => [ 'editor', 'administrator' ],
			// `edit_theme_options`, which an Editor doesn't have.
			'/matter/v1/settings'       => [ 'administrator' ],
		];
	}

	/**
	 * Log in as a role.
	 *
	 * @param string $role Role, or `anonymous`.
	 * @return void
	 */
	private function as_role( string $role ): void {
		wp_set_current_user( 'anonymous' === $role ? 0 : self::factory()->user->create( [ 'role' => $role ] ) );
	}

	/**
	 * Every route of the namespace, as `route => handlers`.
	 *
	 * @return array<string, array>
	 */
	private function routes(): array {
		do_action( 'rest_api_init' );

		$routes = rest_get_server()->get_routes( 'matter/v1' );

		// The namespace's index is core's.
		unset( $routes['/matter/v1'] );

		return $routes;
	}

	/**
	 * Every route has a permission callback, and it is listed above.
	 *
	 * @return void
	 */
	public function test_every_route_is_accounted_for(): void {
		$routes = $this->routes();

		$this->assertNotEmpty( $routes );

		foreach ( $routes as $route => $handlers ) {
			$this->assertArrayHasKey( $route, self::allowed(), "{$route} has no listed audience" );

			foreach ( $handlers as $handler ) {
				$this->assertArrayHasKey( 'permission_callback', $handler, $route );
				$this->assertIsCallable( $handler['permission_callback'], $route );
			}
		}

		foreach ( array_keys( self::allowed() ) as $route ) {
			$this->assertArrayHasKey( $route, $routes, "{$route} is listed but not registered" );
		}
	}

	/**
	 * Each route's permission callback lets in exactly who it should: the
	 * logged-out visitor, a subscriber, a contributor, an editor and an
	 * administrator.
	 *
	 * @return void
	 */
	public function test_permission_callbacks(): void {
		$routes = $this->routes();

		foreach ( [ 'anonymous', 'subscriber', 'contributor', 'editor', 'administrator' ] as $role ) {
			$this->as_role( $role );

			foreach ( $routes as $route => $handlers ) {
				foreach ( $handlers as $handler ) {
					$methods = implode( '|', array_keys( $handler['methods'] ) );
					$result  = call_user_func( $handler['permission_callback'], new WP_REST_Request( $methods, $route ) );

					$this->assertSame(
						in_array( $role, self::allowed()[ $route ] ?? [], true ),
						true === $result,
						"{$role} {$methods} {$route}"
					);
				}
			}
		}

		wp_set_current_user( 0 );
	}
}
