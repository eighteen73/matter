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
}
