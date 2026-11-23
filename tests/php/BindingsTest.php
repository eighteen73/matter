<?php
/**
 * Block bindings sources: `matter/setting` and `matter/archive`.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Tests;

use Eighteen73\Matter\Archives\Archives;
use Eighteen73\Matter\Settings\Settings;
use ReflectionProperty;

/**
 * Bindings sources.
 */
class BindingsTest extends TestCase {

	/**
	 * Declare the site settings the bindings read.
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
						'logo'    => [ 'type' => 'media' ],
						'social'  => [
							'type'   => 'repeater',
							'fields' => [ 'url' => [ 'type' => 'url' ] ],
						],
					],
				],
			]
		);

		( new ReflectionProperty( Settings::class, 'sections' ) )->setValue( Settings::instance(), null );
		Settings::instance()->flush();
		( new ReflectionProperty( Archives::class, 'resolved' ) )->setValue( Archives::instance(), [] );
	}

	/**
	 * Leave the request as it was found: tests that run after this one render
	 * links from the current address.
	 *
	 * @return void
	 */
	public function tear_down(): void {
		$this->go_to( '/' );

		parent::tear_down();
	}

	/**
	 * A paragraph whose text is bound.
	 *
	 * @param string               $source Bindings source.
	 * @param array<string, mixed> $args   Source arguments.
	 * @return string Rendered paragraph.
	 */
	private function bound( string $source, array $args ): string {
		return $this->render(
			'<!-- wp:paragraph {"metadata":{"bindings":{"content":{"source":"' . $source . '","args":' . wp_json_encode( $args ) . '}}}} --><p>Fallback</p><!-- /wp:paragraph -->'
		);
	}

	/**
	 * Both sources are registered.
	 *
	 * @return void
	 */
	public function test_both_sources_are_registered(): void {
		$sources = get_all_registered_block_bindings_sources();

		$this->assertArrayHasKey( 'matter/setting', $sources );
		$this->assertArrayHasKey( 'matter/archive', $sources );
	}

	/**
	 * A setting is escaped for the block it fills; a textarea keeps its line
	 * breaks.
	 *
	 * @return void
	 */
	public function test_setting_values_are_escaped(): void {
		Settings::instance()->save(
			[
				'contact' => [
					'name'    => '<script>alert(1)</script> & Sons',
					'address' => "1 High St\n<b>Leeds</b>",
				],
			]
		);

		$name = $this->bound( 'matter/setting', [ 'key' => 'contact.name' ] );

		$this->assertStringNotContainsString( '<script', $name );
		$this->assertStringContainsString( '&amp; Sons', $name );

		$address = $this->bound( 'matter/setting', [ 'key' => 'contact.address' ] );

		$this->assertStringNotContainsString( '<b>', $address );
		$this->assertStringContainsString( '1 High St<br />', $address );
	}

	/**
	 * A key that isn't a field, a section, an array or a path at all gives
	 * nothing, so the block keeps its own content.
	 *
	 * @return void
	 */
	public function test_unknown_setting_keys_give_nothing(): void {
		Settings::instance()->save( [ 'contact' => [ 'name' => 'Acme' ] ] );

		foreach ( [ 'contact.missing', 'missing.name', 'contact', 'contact.social', '', '.', 'contact.name.extra' ] as $key ) {
			$this->assertNull(
				Settings::instance()->get_binding_value( [ 'key' => $key ], new \WP_Block( [ 'blockName' => 'core/paragraph' ] ), 'content' ),
				"key {$key}"
			);
		}

		$this->assertNull( Settings::instance()->get_binding_value( [], new \WP_Block( [ 'blockName' => 'core/paragraph' ] ), 'content' ), 'no key' );
		$this->assertStringContainsString( 'Fallback', $this->bound( 'matter/setting', [ 'key' => 'contact.missing' ] ) );
	}

	/**
	 * A media setting points at an attachment: a post that isn't one (a draft
	 * the field was never meant to hold) gives no address.
	 *
	 * @return void
	 */
	public function test_a_setting_never_exposes_a_draft(): void {
		$draft = self::factory()->post->create(
			[
				'post_status' => 'draft',
				'post_title'  => 'Secret draft',
			]
		);

		update_option( Settings::OPTION, [ 'contact' => [ 'logo' => $draft ] ] );
		Settings::instance()->flush();

		$block = new \WP_Block( [ 'blockName' => 'core/image' ] );

		foreach ( [ 'url', 'src', 'alt' ] as $attribute ) {
			$value = Settings::instance()->get_binding_value( [ 'key' => 'contact.logo' ], $block, $attribute );

			$this->assertSame( '', $value, $attribute );
		}

		$this->assertStringNotContainsString( 'Secret draft', $this->bound( 'matter/setting', [ 'key' => 'contact.logo' ] ) );
		$this->assertStringNotContainsString( get_permalink( $draft ), $this->bound( 'matter/setting', [ 'key' => 'contact.logo' ] ) );
	}

	/**
	 * An archive's title and description are escaped; a description keeps
	 * only the markup posts may contain.
	 *
	 * @return void
	 */
	public function test_archive_values_are_escaped(): void {
		$term = self::factory()->category->create(
			[
				'name'        => 'Fish & Chips',
				'description' => '<p>Tasty <strong>food</strong><script>alert(1)</script></p>',
			]
		);

		// Terms are filtered when saved, but the database can hold anything
		// (an import, another plugin): the binding escapes what it reads.
		global $wpdb;

		$wpdb->update( $wpdb->terms, [ 'name' => 'Fish & <i>Chips</i>' ], [ 'term_id' => $term ] );
		$wpdb->update( $wpdb->term_taxonomy, [ 'description' => '<p>Tasty <strong>food</strong><script>alert(1)</script></p>' ], [ 'term_id' => $term ] );
		clean_term_cache( $term );

		$this->go_to( get_category_link( $term ) );

		$title = $this->bound( 'matter/archive', [ 'key' => 'title' ] );

		$this->assertStringContainsString( 'Fish &amp; &lt;i&gt;Chips&lt;/i&gt;', $title );
		$this->assertStringNotContainsString( '<i>', $title );

		$description = $this->bound( 'matter/archive', [ 'key' => 'description' ] );

		$this->assertStringContainsString( 'Tasty <strong>food</strong>', $description );
		$this->assertStringNotContainsString( '<script', $description );
	}

	/**
	 * An unknown key, no archive, or a page that isn't an archive gives
	 * nothing.
	 *
	 * @return void
	 */
	public function test_unknown_archive_keys_give_nothing(): void {
		$term   = self::factory()->category->create();
		$target = new \Eighteen73\Matter\Archives\Target( 'term', 'category', $term );

		foreach ( [ 'nope', '', 'TITLE', 'title ' ] as $key ) {
			$this->assertNull( Archives::value( $target, $key ), "key '{$key}'" );
		}

		$this->assertNull( Archives::value( null, 'title' ), 'no archive' );

		$this->go_to( get_permalink( self::factory()->post->create() ) );

		$this->assertStringContainsString( 'Fallback', $this->bound( 'matter/archive', [ 'key' => 'title' ] ), 'a single post' );
		$this->assertStringContainsString( 'Fallback', $this->bound( 'matter/archive', [ 'key' => 'nope' ] ) );
	}

	/**
	 * Drafts don't count, and an unpublished entry for the archive doesn't
	 * lend it a title: the title is the archive's own.
	 *
	 * @return void
	 */
	public function test_archive_values_never_expose_a_draft(): void {
		$term = self::factory()->category->create( [ 'name' => 'Recipes' ] );

		self::factory()->post->create(
			[
				'post_category' => [ $term ],
				'post_title'    => 'Published recipe',
			]
		);
		self::factory()->post->create(
			[
				'post_category' => [ $term ],
				'post_status'   => 'draft',
				'post_title'    => 'Draft recipe',
			]
		);
		self::factory()->post->create(
			[
				'post_type'   => Archives::POST_TYPE,
				'post_status' => 'draft',
				'post_title'  => 'Secret entry title',
				'meta_input'  => [ Archives::META => "term:category:{$term}" ],
			]
		);

		$this->go_to( get_category_link( $term ) );

		$count = $this->bound( 'matter/archive', [ 'key' => 'count' ] );

		$this->assertStringContainsString( '>1<', $count, 'the count is of published posts' );
		$this->assertStringContainsString( 'Recipes', $this->bound( 'matter/archive', [ 'key' => 'title' ] ) );

		foreach ( [ 'title', 'description', 'count', 'image' ] as $key ) {
			$this->assertStringNotContainsString( 'Secret entry title', $this->bound( 'matter/archive', [ 'key' => $key ] ), $key );
			$this->assertStringNotContainsString( 'Draft recipe', $this->bound( 'matter/archive', [ 'key' => $key ] ), $key );
		}
	}
}
