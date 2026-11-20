<?php
/**
 * Site settings: values are sanitised against their field definitions.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Settings\Settings;
use ReflectionProperty;

/**
 * Site settings.
 */
class SettingsTest extends TestCase {

	/**
	 * Declare one field of each type.
	 *
	 * @return void
	 */
	public function set_up(): void {
		parent::set_up();

		add_filter(
			'matter_settings_fields',
			fn() => [
				'contact' => [
					'title'  => 'Contact',
					'fields' => [
						'name'    => [ 'type' => 'text' ],
						'address' => [ 'type' => 'textarea' ],
						'email'   => [ 'type' => 'email' ],
						'site'    => [ 'type' => 'url' ],
						'phone'   => [ 'type' => 'tel' ],
						'count'   => [ 'type' => 'number' ],
						'open'    => [ 'type' => 'toggle' ],
						'kind'    => [
							'type'    => 'select',
							'options' => [
								'shop'   => 'Shop',
								'office' => 'Office',
							],
						],
						'logo'    => [ 'type' => 'media' ],
						'social'  => [
							'type'   => 'repeater',
							'fields' => [
								'url' => [ 'type' => 'url' ],
							],
						],
					],
				],
			]
		);

		self::reset();
	}

	/**
	 * Settings caches its sections per request.
	 *
	 * @return void
	 */
	private static function reset(): void {
		( new ReflectionProperty( Settings::class, 'sections' ) )->setValue( Settings::instance(), null );
		Settings::instance()->flush();
	}

	/**
	 * Each type is sanitised; unknown sections and fields are dropped.
	 *
	 * @return void
	 */
	public function test_save_sanitises(): void {
		$saved = Settings::instance()->save(
			[
				'contact' => [
					'name'    => '<b>Shop</b> name',
					'address' => "Line one\n<script>x</script>Line two",
					'email'   => 'not an email',
					'site'    => 'javascript:alert(1)',
					'phone'   => '+44 113 000',
					'count'   => '12.5',
					'open'    => '1',
					'kind'    => 'warehouse',
					'logo'    => 999999,
					'social'  => [ [ 'url' => 'https://example.com' ], [ 'url' => 'instagram.com/shop' ], [ 'url' => 'mailto:shop@example.com' ] ],
					'unknown' => 'dropped',
				],
				'other'   => [ 'dropped' => true ],
			]
		);

		$this->assertSame(
			[
				'contact' => [
					'name'    => 'Shop name',
					'address' => "Line one\nLine two",
					'email'   => '',
					'site'    => '',
					'phone'   => '+44 113 000',
					'count'   => 12.5,
					'open'    => true,
					'kind'    => '',
					'logo'    => 0,
					'social'  => [ [ 'url' => 'https://example.com' ], [ 'url' => 'https://instagram.com/shop' ], [ 'url' => 'mailto:shop@example.com' ] ],
				],
			],
			$saved
		);
	}

	/**
	 * Settings are autoloaded, as every page reads them, and a change made
	 * outside Matter (e.g. WP-CLI) is seen at once.
	 *
	 * @return void
	 */
	public function test_autoload_and_cache(): void {
		Settings::instance()->save( [ 'contact' => [ 'phone' => '0113' ] ] );

		$this->assertArrayHasKey( Settings::OPTION, wp_load_alloptions() );
		$this->assertSame( '0113', \Eighteen73\Matter\setting( 'contact.phone' ) );

		update_option( Settings::OPTION, [ 'contact' => [ 'phone' => '0114' ] ] );

		$this->assertSame( '0114', \Eighteen73\Matter\setting( 'contact.phone' ) );
	}

	/**
	 * `setting()` reads by dot path; empty values give the default.
	 *
	 * @return void
	 */
	public function test_get_by_path(): void {
		Settings::instance()->save( [ 'contact' => [ 'phone' => '0113' ] ] );

		$this->assertSame( '0113', \Eighteen73\Matter\setting( 'contact.phone' ) );
		$this->assertSame( 'fallback', \Eighteen73\Matter\setting( 'contact.name', 'fallback' ) );
		$this->assertNull( \Eighteen73\Matter\setting( 'missing.field' ) );
	}

	/**
	 * A binding to a link's `url` is safe whatever is stored (e.g. by a
	 * change made outside Matter): no `javascript:`, tel and mailto built.
	 *
	 * @return void
	 */
	public function test_a_url_binding_is_safe(): void {
		update_option(
			Settings::OPTION,
			[
				'contact' => [
					'site'  => 'javascript:alert(1)',
					'email' => 'shop@example.com',
					'phone' => '+44 (0)113 000',
				],
			]
		);
		Settings::instance()->flush();

		$block = new \WP_Block( [ 'blockName' => 'core/button' ] );
		$value = fn( string $key, string $attribute = 'url' ) => Settings::instance()->get_binding_value( [ 'key' => "contact.{$key}" ], $block, $attribute );

		$this->assertSame( '', $value( 'site' ) );
		$this->assertSame( '', $value( 'site', 'href' ) );
		$this->assertSame( 'mailto:shop@example.com', $value( 'email' ) );
		$this->assertSame( 'tel:+440113000', $value( 'phone' ) );

		// A real address is kept as it is (the block escapes it once, as it
		// sets the attribute), query string included.
		update_option( Settings::OPTION, [ 'contact' => [ 'site' => 'https://example.com/a?b=1&c=2' ] ] );
		Settings::instance()->flush();

		$this->assertSame( 'https://example.com/a?b=1&c=2', $value( 'site' ) );

		$html = do_blocks( '<!-- wp:button {"metadata":{"bindings":{"url":{"source":"matter/setting","args":{"key":"contact.site"}}}}} --><div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Visit</a></div><!-- /wp:button -->' );

		$this->assertStringContainsString( 'href="https://example.com/a?b=1&#038;c=2"', $html );
	}

	/**
	 * A media field with no image (0) is empty, so a default applies.
	 *
	 * @return void
	 */
	public function test_an_empty_media_field_is_empty(): void {
		$settings = Settings::instance();

		$settings->save( [ 'contact' => [ 'logo' => 0 ] ] );

		$this->assertSame( 'none', $settings->get( 'contact.logo', 'none' ) );
		$this->assertNull( $settings->get( 'contact.logo' ) );

		// Other zeros are values.
		$settings->save( [ 'contact' => [ 'count' => 0 ] ] );

		$this->assertSame( 0, $settings->get( 'contact.count', 5 ) );
	}

	/**
	 * A number that isn't finite is refused, not stored (it would break the
	 * page's JSON).
	 *
	 * @return void
	 */
	public function test_a_number_must_be_finite(): void {
		$settings = Settings::instance();

		foreach ( [ '1e999', INF, NAN, '-1e999' ] as $bad ) {
			$saved = $settings->save( [ 'contact' => [ 'count' => $bad ] ] );

			$this->assertNull( $saved['contact']['count'], 'saved ' . var_export( $bad, true ) );
			$this->assertInstanceOf( \WP_Error::class, $settings->validate( [ 'contact' => [ 'count' => $bad ] ] ) );
		}

		$this->assertNull( $settings->validate( [ 'contact' => [ 'count' => '12.5' ] ] ) );
		$this->assertNull( $settings->validate( [ 'contact' => [ 'count' => null ] ] ) );
		$this->assertSame( 12.5, $settings->save( [ 'contact' => [ 'count' => '12.5' ] ] )['contact']['count'] );
		$this->assertNotFalse( wp_json_encode( $settings->get_values() ) );
	}

	/**
	 * Something that isn't a number says so; a number that is too large says
	 * that instead.
	 *
	 * @return void
	 */
	public function test_the_number_error_says_what_is_wrong(): void {
		$settings = Settings::instance();
		$words    = $settings->validate( [ 'contact' => [ 'count' => 'abc' ] ] );
		$large    = $settings->validate( [ 'contact' => [ 'count' => '1e999' ] ] );

		$this->assertInstanceOf( \WP_Error::class, $words );
		$this->assertStringContainsString( 'needs a number', $words->get_error_message() );
		$this->assertStringNotContainsString( 'too large', $words->get_error_message() );
		$this->assertStringContainsString( 'too large', $large->get_error_message() );
	}

	/**
	 * A relative address stays relative, one that a browser would read as
	 * another site (after the tabs and backslashes it ignores) isn't kept as
	 * it is, and a typed address is saved the way it is bound.
	 *
	 * @return void
	 */
	public function test_urls_stay_relative_or_become_safe_absolute_addresses(): void {
		$kept = [ 'contact-us', 'about/team', '/contact', '/a?b=1&c=2', '#a', '?q', '/%2F%2Fevil.com' ];

		foreach ( $kept as $url ) {
			$this->assertSame( $url, Settings::safe_url( $url ), $url );
			$this->assertSame( $url, Settings::instance()->save( [ 'contact' => [ 'site' => $url ] ] )['contact']['site'], 'saved ' . $url );
		}

		// Not relative after cleaning, or not relative at all.
		foreach ( [ "/\\evil.com", "/\t/evil.com", '//evil.com', '\\\\evil.com', 'javascript:alert(1)' ] as $url ) {
			$safe = Settings::safe_url( $url );

			$this->assertDoesNotMatchRegularExpression( '#^(//|/\\\\|\\\\)#', $safe, $url );
			$this->assertStringNotContainsString( 'javascript', $safe, $url );
			$this->assertTrue( '' === $safe || '/' === $safe[0] && '/' !== ( $safe[1] ?? '' ) || str_starts_with( $safe, 'https://' ), "{$url} gave {$safe}" );
		}

		$this->assertSame( 'https://evil.com', Settings::safe_url( "/\t/evil.com" ) );
		$this->assertSame( 'https://evil.com', Settings::safe_url( '//evil.com' ) );
		$this->assertSame( '', Settings::safe_url( 'javascript:alert(1)' ) );
		$this->assertSame( 'https://instagram.com/shop', Settings::safe_url( 'instagram.com/shop' ) );
	}

	/**
	 * A save that leaves a field out keeps what is stored; null clears it.
	 *
	 * @return void
	 */
	public function test_a_save_merges_over_stored_values(): void {
		$settings = Settings::instance();

		$settings->save(
			[
				'contact' => [
					'name'  => 'Acme',
					'phone' => '0113',
				],
			]
		);

		$saved = $settings->save( [ 'contact' => [ 'phone' => '0114' ] ] );

		$this->assertSame( 'Acme', $saved['contact']['name'] );
		$this->assertSame( '0114', $saved['contact']['phone'] );

		$saved = $settings->save( [ 'contact' => [ 'name' => null ] ] );

		$this->assertSame( '', $saved['contact']['name'] );
		$this->assertSame( '0114', $saved['contact']['phone'] );
	}

	/**
	 * Relative addresses (a path, an anchor, a query) are kept by the binding,
	 * as the settings page keeps them; absolute ones are made safe.
	 *
	 * @return void
	 */
	public function test_a_url_binding_keeps_relative_addresses(): void {
		$block = new \WP_Block( [ 'blockName' => 'core/button' ] );

		foreach (
			[
				'/contact-us/'   => '/contact-us/',
				'#form'          => '#form',
				'?tab=2'         => '?tab=2',
				'//evil.example' => 'https://evil.example',
				'example.com/a'  => 'https://example.com/a',
			] as $stored => $expected
		) {
			update_option( Settings::OPTION, [ 'contact' => [ 'site' => $stored ] ] );
			Settings::instance()->flush();

			$this->assertSame( $expected, Settings::instance()->get_binding_value( [ 'key' => 'contact.site' ], $block, 'url' ), $stored );
		}
	}
}
