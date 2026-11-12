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
					'social'  => [ [ 'url' => 'https://example.com' ], [ 'url' => 'nope' ] ],
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
					'social'  => [ [ 'url' => 'https://example.com' ], [ 'url' => 'http://nope' ] ],
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
}
