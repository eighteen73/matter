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
 *                 "media":   { "allowedBlocks": [ "core/image" ], "templateLock": "all" }
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
 * instance. Slots are matched by name, in the editor and here, so slots can be
 * added, reordered or removed in block.json; render.php must tolerate an empty
 * slot. A renamed slot lists its old names (`"previously": [ "media" ]`), so
 * existing content follows it. Content in a slot that's no longer declared
 * isn't output, and the editor shows it for the client to move or remove.
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
	 * The picture in inserter previews: a grey landscape, so a preview needs
	 * no request and shows no one's photo.
	 */
	private const EXAMPLE_IMAGE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400'><rect width='600' height='400' fill='%23dcdcde'/><circle cx='440' cy='120' r='40' fill='%23c3c4c7'/><path d='M0 400 210 170l120 140 80-80 190 170z' fill='%23a7aaad'/></svg>";

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_filter( 'register_block_type_args', [ $this, 'default_render' ], 10, 2 );
		add_filter( 'block_categories_all', [ $this, 'register_category' ] );
		add_action( 'init', [ $this, 'register_block_support' ], 5 );
		// Once every block is registered, so a section in a slot's template
		// (a card in Cards) is previewed from its own slots.
		add_action( 'init', [ $this, 'add_examples' ], 999 );
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
	 * - `alignfull` when `supports.matter.align` is "full" (full-width bands);
	 * - the default variant's class (`is-style-default`) when no variant is
	 *   chosen, so the default can be styled like any other variant. Core
	 *   saves no class for it.
	 *
	 * @return void
	 */
	public function register_block_support(): void {
		\WP_Block_Supports::get_instance()->register(
			'matter-section',
			[
				'apply' => function ( WP_Block_Type $block_type, array $attributes = [] ): array {
					if ( ! self::is_section( $block_type ) ) {
						return [];
					}

					$classes = [ 'is-section' ];

					if ( 'full' === ( $block_type->supports['matter']['align'] ?? '' ) ) {
						$classes[] = 'alignfull';
					}

					$default = self::default_variant( $block_type );

					if ( null !== $default && ! preg_match( '/(?:^|\s)is-style-/', (string) ( $attributes['className'] ?? '' ) ) ) {
						$classes[] = 'is-style-' . $default;
					}

					return [ 'class' => implode( ' ', $classes ) ];
				},
			]
		);
	}

	/**
	 * A block's default variant: the block style marked as the default, in
	 * `block.json` (`isDefault`) or registered (`is_default`).
	 *
	 * @param WP_Block_Type $block_type Block type.
	 * @return string|null Style name, or null when it has none.
	 */
	public static function default_variant( WP_Block_Type $block_type ): ?string {
		$styles = array_merge(
			(array) $block_type->styles,
			array_values( \WP_Block_Styles_Registry::get_instance()->get_registered_styles_for_block( $block_type->name ) )
		);

		foreach ( $styles as $style ) {
			if ( ! empty( $style['isDefault'] ) || ! empty( $style['is_default'] ) ) {
				$name = sanitize_html_class( (string) ( $style['name'] ?? '' ) );

				return '' !== $name ? $name : null;
			}
		}

		return null;
	}

	/**
	 * Whether a block type is a section.
	 *
	 * @param WP_Block_Type|array $block_type Block type or its args/metadata.
	 * @return bool
	 */
	public static function is_section( WP_Block_Type|array $block_type ): bool {
		$supports = $block_type instanceof WP_Block_Type ? $block_type->supports : ( $block_type['supports'] ?? [] );

		// Blocks can use slots without being sections (e.g. overlays): `"section": false`.
		return ! empty( $supports['matter']['slots'] ) && is_array( $supports['matter']['slots'] ) && false !== ( $supports['matter']['section'] ?? true );
	}

	/**
	 * Slot names declared by a section, in order.
	 *
	 * @param WP_Block_Type $block_type Section block type.
	 * @return string[]
	 */
	public static function get_slot_names( WP_Block_Type $block_type ): array {
		$slots = $block_type->supports['matter']['slots'] ?? [];

		return is_array( $slots ) ? array_map( 'strval', array_keys( $slots ) ) : [];
	}

	/**
	 * Old names of renamed slots (a slot's `previously`), mapped to its name.
	 * An old name that is itself declared again is ignored.
	 *
	 * @param WP_Block_Type $block_type Section block type.
	 * @return array<string, string> Old name => current name.
	 */
	public static function get_slot_aliases( WP_Block_Type $block_type ): array {
		$slots   = $block_type->supports['matter']['slots'] ?? [];
		$aliases = [];

		if ( ! is_array( $slots ) ) {
			return [];
		}

		foreach ( $slots as $name => $slot ) {
			foreach ( (array) ( $slot['previously'] ?? [] ) as $old ) {
				if ( ! array_key_exists( (string) $old, $slots ) ) {
					$aliases[ (string) $old ] = (string) $name;
				}
			}
		}

		return $aliases;
	}

	/**
	 * Give sections without a render.php the default renderer.
	 *
	 * @param array  $args       Block type args.
	 * @param string $block_name Block name.
	 * @return array
	 */
	public function default_render( array $args, string $block_name ): array { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed -- Filter signature.
		if ( self::is_section( $args ) && empty( $args['render_callback'] ) ) {
			$args['render_callback'] = [ self::class, 'render_default' ];
		}

		return $args;
	}

	/**
	 * Inserter previews for sections, and other blocks with slots (modals,
	 * drawers, collapsibles), without their own `example`.
	 *
	 * @return void
	 */
	public function add_examples(): void {
		foreach ( WP_Block_Type_Registry::get_instance()->get_all_registered() as $block_type ) {
			$slots = $block_type->supports['matter']['slots'] ?? null;

			if ( is_array( $slots ) && $slots && empty( $block_type->example ) ) {
				$block_type->example = self::example( (array) $block_type->supports['matter']['slots'] );

				// A modal or drawer isn't page-wide: shown larger.
				if ( ! self::is_section( $block_type ) ) {
					$block_type->example['viewportWidth'] = 640;
				}
			}
		}
	}

	/**
	 * A section's inserter preview, from its slots' templates: placeholders
	 * become the text ("Page heading"), images a neutral picture, and a
	 * section in a template (a card) is filled from its own slots.
	 *
	 * Previewed at a laptop's width (core's default is 500px), as sections
	 * are page-wide bands that change layout on smaller screens.
	 *
	 * @param array $slots The section's slots.
	 * @param int   $depth Sections nested so far (a guard against a section
	 *                     that contains itself).
	 * @return array{viewportWidth: int, innerBlocks: array} Block example.
	 */
	public static function example( array $slots, int $depth = 0 ): array {
		$inner = [];

		foreach ( $slots as $name => $slot ) {
			$inner[] = [
				'name'        => 'matter/slot',
				'attributes'  => [ 'name' => (string) $name ],
				'innerBlocks' => array_map( fn( $entry ) => self::example_block( (array) $entry, $depth ), (array) ( $slot['template'] ?? [] ) ),
			];
		}

		return [
			'viewportWidth' => 1200,
			'innerBlocks'   => $inner,
		];
	}

	/**
	 * One template entry (`[ name, attributes, inner ]`) as an example block.
	 *
	 * @param array $entry Template entry.
	 * @param int   $depth Sections nested so far.
	 * @return array{name: string, attributes: array, innerBlocks: array}
	 */
	private static function example_block( array $entry, int $depth ): array {
		$name       = (string) ( $entry[0] ?? '' );
		$attributes = (array) ( $entry[1] ?? [] );
		$text       = (string) ( $attributes['placeholder'] ?? '' );

		switch ( $name ) {
			case 'core/heading':
				$attributes['content'] = $text ?: __( 'Heading', 'matter' );
				break;
			case 'core/paragraph':
				$attributes['content'] = $text ?: __( 'A sentence or two about this.', 'matter' );
				break;
			case 'core/button':
				$attributes['text'] = $text ?: __( 'Button', 'matter' );
				break;
			case 'core/image':
				$attributes['url'] = self::EXAMPLE_IMAGE;
				$attributes['alt'] = '';
				break;
		}

		$inner = array_map( fn( $child ) => self::example_block( (array) $child, $depth ), (array) ( $entry[2] ?? [] ) );
		$type  = WP_Block_Type_Registry::get_instance()->get_registered( $name );

		if ( ! $inner && $type && self::is_section( $type ) && $depth < 3 ) {
			$inner = self::example( (array) $type->supports['matter']['slots'], $depth + 1 )['innerBlocks'];
		}

		return [
			'name'        => $name,
			'attributes'  => $attributes,
			'innerBlocks' => $inner,
		];
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
		$slots      = self::slots( $content, self::get_slot_names( $block_type ), self::get_slot_aliases( $block_type ) );
		$html       = '';

		foreach ( $slots as $name => $slot_html ) {
			// An empty slot is still output, marked, so layouts can rely on it.
			$classes = 'wp-block-matter-slot ' . $base_class . '__' . $name . ( '' === trim( $slot_html ) ? ' is-empty' : '' );
			$html   .= sprintf( '<div class="%1$s">%2$s</div>', esc_attr( $classes ), $slot_html );
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
	 * With declared names, only those slots are returned: content saved under
	 * an old name (an alias) fills its slot when that slot is missing or
	 * empty, and slots that are no longer declared are left out. The first
	 * slot with a name wins. Without names, every slot found is returned.
	 *
	 * @param string                $content Section inner content.
	 * @param string[]              $names   Declared slot names; missing slots return ''.
	 * @param array<string, string> $aliases Old slot name => current name.
	 * @return array<string, string> Slot name => HTML.
	 */
	public static function slots( string $content, array $names = [], array $aliases = [] ): array {
		$slots = array_fill_keys( $names, '' );
		$found = [];

		preg_match_all( '/<!--matter-slot:([\w-]+)-->(.*?)<!--\/matter-slot:\1-->/s', $content, $matches, PREG_SET_ORDER );

		foreach ( $matches as $match ) {
			$found[ $match[1] ] ??= $match[2];
		}

		if ( ! $names ) {
			return $found;
		}

		foreach ( $names as $name ) {
			$slots[ $name ] = $found[ $name ] ?? '';
		}

		foreach ( $aliases as $old => $name ) {
			if ( isset( $found[ $old ], $slots[ $name ] ) && '' === trim( $slots[ $name ] ) ) {
				$slots[ $name ] = $found[ $old ];
			}
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
	 * Names of all registered section blocks.
	 *
	 * @return string[]
	 */
	public static function names(): array {
		return array_values(
			array_map(
				fn( WP_Block_Type $block_type ) => $block_type->name,
				array_filter( WP_Block_Type_Registry::get_instance()->get_all_registered(), [ self::class, 'is_section' ] )
			)
		);
	}
}
