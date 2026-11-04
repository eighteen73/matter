<?php
/**
 * Sections: developer-owned layout blocks with named content slots.
 *
 * A section is a dynamic block declared in block.json:
 *
 *     "supports": {
 *         "matter": {
 *             "scheme": true,
 *             "tagName": "section",
 *             "slots": {
 *                 "content": { "allowedBlocks": [ "core/heading", "core/paragraph" ], "template": [ … ] },
 *                 "media":   { "allowedBlocks": [ "core/image" ], "templateLock": "contentOnly" }
 *             }
 *         }
 *     }
 *
 * Matter registers it in the editor (no edit.js needed): each slot is a locked
 * `matter/slot` block holding core content blocks. On the front end the section's
 * own render.php places the slots in its markup:
 *
 *     $slots = Eighteen73\Matter\slots( $content, $block );
 *     <section <?php echo get_block_wrapper_attributes(); ?>>
 *         <div class="wp-block-pulsar-hero__inner">
 *             <div class="wp-block-matter-slot wp-block-pulsar-hero__content"><?php echo $slots['content']; ?></div>
 *         </div>
 *     </section>
 *
 * Markup (editor and default renderer alike):
 *
 *     <{tagName} wrapper><div class="{block class}__inner">
 *         <div class="wp-block-matter-slot {block class}__{slot}">…</div> (per slot, in order)
 *     </div></{tagName}>
 *
 * A custom render.php should keep the same structure and classes so one
 * stylesheet serves the editor and the front end.
 *
 * `"align": "full"` under `supports.matter` makes the section a full-width band.
 *
 * Layout lives in render.php and CSS, so changing a section updates every
 * instance. Slot structure is locked (templateLock: all), so adding a slot to
 * block.json (append it, as matching is positional) is applied to existing
 * instances the next time they're edited; render.php must tolerate a missing slot.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Sections;

use Eighteen73\Matter\Singleton;
use WP_Block;
use WP_Block_Type;
use WP_Block_Type_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Sections.
 */
class Sections {

	use Singleton;

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_filter( 'register_block_type_args', [ $this, 'default_render' ], 10, 2 );
		add_filter( 'block_categories_all', [ $this, 'register_category' ] );
		add_action( 'init', [ $this, 'register_block_support' ], 5 );
		add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_editor_assets' ] );
	}

	/**
	 * Add a "Sections" block category.
	 *
	 * @param array $categories Block categories.
	 * @return array
	 */
	public function register_category( array $categories ): array {
		if ( in_array( 'sections', array_column( $categories, 'slug' ), true ) ) {
			return $categories;
		}

		return array_merge(
			[
				[
					'slug'  => 'sections',
					'title' => __( 'Sections', 'matter' ),
					'icon'  => null,
				],
			],
			$categories
		);
	}

	/**
	 * Section wrapper classes via block supports, so a section's render.php
	 * gets them from get_block_wrapper_attributes():
	 *
	 * - `is-section` on every section, for theme targeting;
	 * - `alignfull` when `supports.matter.align` is "full" (full-width bands).
	 *
	 * @return void
	 */
	public function register_block_support(): void {
		\WP_Block_Supports::get_instance()->register(
			'matter-section',
			[
				'apply' => function ( WP_Block_Type $block_type ): array {
					if ( ! self::is_section( $block_type ) ) {
						return [];
					}

					$classes = [ 'is-section' ];

					if ( 'full' === ( $block_type->supports['matter']['align'] ?? '' ) ) {
						$classes[] = 'alignfull';
					}

					return [ 'class' => implode( ' ', $classes ) ];
				},
			]
		);
	}

	/**
	 * Whether a block type is a section.
	 *
	 * @param WP_Block_Type|array $block_type Block type or its args/metadata.
	 * @return bool
	 */
	public static function is_section( WP_Block_Type|array $block_type ): bool {
		$supports = $block_type instanceof WP_Block_Type ? $block_type->supports : ( $block_type['supports'] ?? [] );

		return ! empty( $supports['matter']['slots'] ) && is_array( $supports['matter']['slots'] );
	}

	/**
	 * Slot names declared by a section, in order.
	 *
	 * @param WP_Block_Type $block_type Section block type.
	 * @return string[]
	 */
	public static function get_slot_names( WP_Block_Type $block_type ): array {
		return self::is_section( $block_type ) ? array_map( 'strval', array_keys( $block_type->supports['matter']['slots'] ) ) : [];
	}

	/**
	 * Give sections without a render.php the default renderer.
	 *
	 * @param array  $args       Block type args.
	 * @param string $block_name Block name.
	 * @return array
	 */
	public function default_render( array $args, string $block_name ): array {
		if ( self::is_section( $args ) && empty( $args['render_callback'] ) ) {
			$args['render_callback'] = [ self::class, 'render_default' ];
		}

		return $args;
	}

	/**
	 * Default section markup: slots in order inside the block wrapper.
	 *
	 * @param array    $attributes Block attributes.
	 * @param string   $content    Rendered inner blocks (the slots).
	 * @param WP_Block $block      Block instance.
	 * @return string
	 */
	public static function render_default( array $attributes, string $content, WP_Block $block ): string {
		$block_type = $block->block_type;
		$tag_name   = tag_escape( $block_type->supports['matter']['tagName'] ?? 'section' );
		$base_class = wp_get_block_default_classname( $block->name );
		$slots      = self::slots( $content, self::get_slot_names( $block_type ) );
		$html       = '';

		foreach ( $slots as $name => $slot_html ) {
			$html .= sprintf( '<div class="wp-block-matter-slot %1$s">%2$s</div>', esc_attr( $base_class . '__' . $name ), $slot_html );
		}

		return sprintf(
			'<%1$s %2$s><div class="%3$s">%4$s</div></%1$s>',
			$tag_name,
			get_block_wrapper_attributes(),
			esc_attr( $base_class . '__inner' ),
			$html
		);
	}

	/**
	 * Split a section's rendered inner content into its slots.
	 *
	 * Slot blocks wrap their output in marker comments, so slots can be placed
	 * anywhere in a section's markup without rendering anything twice.
	 *
	 * @param string   $content Section inner content.
	 * @param string[] $names   Declared slot names; missing slots return ''.
	 * @return array<string, string> Slot name => HTML.
	 */
	public static function slots( string $content, array $names = [] ): array {
		$slots = array_fill_keys( $names, '' );

		preg_match_all( '/<!--matter-slot:([\w-]+)-->(.*?)<!--\/matter-slot:\1-->/s', $content, $matches, PREG_SET_ORDER );

		foreach ( $matches as $match ) {
			$slots[ $match[1] ] = $match[2];
		}

		return $slots;
	}

	/**
	 * Wrap a slot's output in markers for slots().
	 *
	 * @param string $name    Slot name.
	 * @param string $content Slot HTML.
	 * @return string
	 */
	public static function mark_slot( string $name, string $content ): string {
		$name = preg_replace( '/[^\w-]/', '', $name );

		return "<!--matter-slot:{$name}-->{$content}<!--/matter-slot:{$name}-->";
	}

	/**
	 * Enqueue the editor script that registers sections and block supports.
	 *
	 * @return void
	 */
	public function enqueue_editor_assets(): void {
		$asset_file = MATTER_PATH . 'build/editor/index.asset.php';

		if ( ! file_exists( $asset_file ) ) {
			return;
		}

		$asset = require $asset_file;

		wp_enqueue_script( 'matter-editor', MATTER_URL . 'build/editor/index.js', $asset['dependencies'], $asset['version'], true );

		if ( file_exists( MATTER_PATH . 'build/editor/index.css' ) ) {
			wp_enqueue_style( 'matter-editor', MATTER_URL . 'build/editor/index.css', [], $asset['version'] );
		}

		$sections = array_values(
			array_map(
				fn( WP_Block_Type $block_type ) => $block_type->name,
				array_filter( WP_Block_Type_Registry::get_instance()->get_all_registered(), [ self::class, 'is_section' ] )
			)
		);

		wp_add_inline_script(
			'matter-editor',
			'window.matterEditor = ' . wp_json_encode(
				[
					'sections' => $sections,
					'schemes'  => \Eighteen73\Matter\Supports\Scheme::instance()->get_editor_data(),
				]
			) . ';',
			'before'
		);

		wp_set_script_translations( 'matter-editor', 'matter' );
	}
}
