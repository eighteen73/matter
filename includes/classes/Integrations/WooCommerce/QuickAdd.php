<?php
/**
 * Quick add: a product's options and add to basket in a modal, loaded when
 * its button is clicked.
 *
 * The block (`matter/quick-add`) is a link to the product, so without
 * JavaScript, or for a product quick add can't show, it goes to the product
 * page. It's the same for every visitor, so it can be part of a prerendered
 * loop item.
 *
 * What the modal shows is the theme's: a pattern, `{namespace}/quick-add-{post_type}`
 * then `{namespace}/quick-add` (`matter_quick_add_pattern`), rendered for the
 * product inside WooCommerce's Single Product block, which gives the blocks
 * in it their product. Without one, the product's title, price and add to
 * basket form. Nothing of it is in the listing: the page has one empty modal
 * (the Modal block, printed once in the footer), and on click the product's
 * content is fetched from its own URL with `?matter-quick-add=1`
 * (respond()): a bare document holding the pattern, rendered as the visitor
 * (their prices), with the styles and script modules its blocks need. The
 * script (src/quick-add/view.js) adds the styles and modules the page
 * doesn't have, and renders the content into the modal's router region, where
 * the Interactivity API runs its blocks.
 *
 * WooCommerce's block-based add to cart form (`woocommerce/add-to-cart-with-options`)
 * adds to the basket in place, unless something hooked into the classic
 * form's hooks prints a form element; then it posts the form, a page load.
 * So while a product's content renders, WooCommerce's compatibility layer
 * (which fires those hooks) is off (`matter_quick_add_classic_hooks`).
 * Something a site hooked in there (a favourites button) goes in the pattern
 * as a block instead.
 *
 * Products quick add shows: purchasable simple and variable products
 * (`matter_quick_add_product`). Others get a link to their page.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Integrations\WooCommerce;

use WC_Product;
use WP_Block_Patterns_Registry;
use WP_Block_Type_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Quick add.
 */
final class QuickAdd {

	/**
	 * The block.
	 */
	public const BLOCK = 'matter/quick-add';

	/**
	 * The query parameter asking a product's URL for its quick add content.
	 */
	public const PARAM = 'matter-quick-add';

	/**
	 * The modal's ID, and its router region's.
	 */
	public const MODAL = 'matter-quick-add';

	/**
	 * The router region the content renders into.
	 */
	public const REGION = 'matter/quick-add';

	/**
	 * Product types quick add shows, unless filtered.
	 */
	private const TYPES = [ 'simple', 'variable' ];

	/**
	 * Whether the modal is printed on this page.
	 *
	 * @var bool
	 */
	private static bool $modal = false;

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_filter( 'matter_register_block', [ $this, 'register_block' ], 10, 2 );
		add_action( 'template_redirect', [ $this, 'respond' ], 0 );
	}

	/**
	 * Turn on the Quick add block, which is off without WooCommerce.
	 *
	 * @param mixed  $register Whether the block registers (an earlier filter may return anything).
	 * @param string $name     Block name.
	 * @return bool
	 */
	public function register_block( $register, string $name ): bool {
		return self::BLOCK === $name ? true : (bool) $register;
	}

	/**
	 * A product's button: a link to it, which opens quick add when the
	 * product can be shown and the modal is on the page.
	 *
	 * @param int   $product_id Product ID.
	 * @param array $attributes Block attributes.
	 * @return string
	 */
	public static function button( int $product_id, array $attributes = [] ): string {
		$product = $product_id ? wc_get_product( $product_id ) : null;

		if ( ! $product instanceof WC_Product ) {
			return '';
		}

		$label = trim( wp_strip_all_tags( (string) ( $attributes['label'] ?? '' ) ) );
		$label = '' !== $label ? $label : __( 'Quick add', 'matter' );
		$quick = self::shows( $product ) && self::modal();

		$link = sprintf(
			'<a class="wp-block-matter-quick-add__button wp-element-button" href="%1$s" aria-label="%2$s"%3$s>%4$s</a>',
			esc_url( $product->get_permalink() ),
			esc_attr(
				sprintf(
					/* translators: 1: The button's text, e.g. "Quick add". 2: Product name. */
					_x( '%1$s: %2$s', 'quick add button', 'matter' ),
					$label,
					$product->get_name()
				)
			),
			$quick
				? sprintf(
					' aria-haspopup="dialog" aria-controls="%s" data-wp-interactive="matter/quick-add" data-wp-on--click="actions.open" data-wp-on--pointerenter="actions.intend" data-wp-on--pointerleave="actions.forget" data-wp-on--focus="actions.prefetch"',
					esc_attr( self::MODAL )
				)
				: '',
			esc_html( $label )
		);

		return sprintf( '<div %1$s>%2$s</div>', get_block_wrapper_attributes(), $link );
	}

	/**
	 * Whether quick add shows a product: purchasable simple and variable
	 * products, unless filtered.
	 *
	 * @param WC_Product $product Product.
	 * @return bool
	 */
	public static function shows( WC_Product $product ): bool {
		$shows = in_array( $product->get_type(), self::TYPES, true ) && $product->is_purchasable();

		/**
		 * Filters whether quick add shows a product. One it doesn't gets a
		 * link to its page. A quick add button is part of a product's loop
		 * item, which is rendered once for every visitor, so this shouldn't
		 * depend on who is looking.
		 *
		 * @param bool       $shows   Whether quick add shows it.
		 * @param WC_Product $product Product.
		 */
		return (bool) apply_filters( 'matter_quick_add_product', $shows, $product );
	}

	/**
	 * Print the modal on this page, once, in the footer. False when the
	 * Modal block isn't registered (a theme that turned it off), when buttons
	 * stay links.
	 *
	 * @return bool
	 */
	public static function modal(): bool {
		if ( self::$modal ) {
			return true;
		}

		$registry = WP_Block_Type_Registry::get_instance();

		if ( ! $registry->is_registered( 'matter/modal' ) || ! $registry->is_registered( 'matter/slot' ) ) {
			static $warned = false;

			if ( ! $warned ) {
				$warned = true;

				_doing_it_wrong( __METHOD__, esc_html__( 'Quick add needs the Modal and Slot blocks (matter/modal, matter/slot). Its buttons are links until they are registered.', 'matter' ), '1.3.0' );
			}

			return false;
		}

		self::$modal = true;

		// Rendered in the footer, outside the loop the button is in (a modal in
		// a Query Loop is the post's own, one of a group). Its styles and
		// script modules are printed with the footer's.
		add_action(
			'wp_footer',
			static function () {
				echo self::modal_html(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Rendered blocks.
			},
			1
		);

		return true;
	}

	/**
	 * The modal: Matter's Modal block, with a status line and the empty
	 * router region the content renders into.
	 *
	 * @return string
	 */
	public static function modal_html(): string {
		$content = sprintf(
			'<p class="wp-block-matter-quick-add__status" role="status" data-wp-interactive="matter/quick-add" data-wp-bind--hidden="!state.isLoading" hidden>%1$s</p><div class="wp-block-matter-quick-add__content" data-wp-interactive="matter/quick-add" data-wp-router-region="%2$s"></div>',
			esc_html__( 'Loading…', 'matter' ),
			esc_attr( self::REGION )
		);

		$markup = sprintf(
			'<!-- wp:matter/modal %1$s --><!-- wp:matter/slot {"name":"content"} -->%2$s<!-- /wp:matter/slot --><!-- /wp:matter/modal -->',
			wp_json_encode(
				[
					'overlayId' => self::MODAL,
					'label'     => __( 'Quick add', 'matter' ),
					'className' => 'wp-block-matter-quick-add__modal',
				]
			),
			$content
		);

		wp_interactivity_config(
			'matter/quick-add',
			[
				'modal' => self::MODAL,
				'param' => self::PARAM,
			]
		);

		return do_blocks( $markup );
	}

	/**
	 * The pattern quick add shows a post type's products with, in the
	 * theme's namespace: `quick-add-{post_type}`, then `quick-add`.
	 *
	 * @param string $post_type Post type.
	 * @return string|null Pattern slug, or null for none.
	 */
	public static function pattern( string $post_type = 'product' ): ?string {
		$registry = WP_Block_Patterns_Registry::get_instance();
		$slug     = null;

		foreach ( [ "quick-add-{$post_type}", 'quick-add' ] as $name ) {
			foreach ( \Eighteen73\Matter\theme_namespaces() as $theme ) {
				if ( null === $slug && $registry->is_registered( "{$theme}/{$name}" ) ) {
					$slug = "{$theme}/{$name}";
				}
			}
		}

		/**
		 * Filters the pattern quick add shows a post type's products with.
		 *
		 * @param string|null $slug      Pattern slug, or null for Matter's default.
		 * @param string      $post_type Post type.
		 */
		$slug = apply_filters( 'matter_quick_add_pattern', $slug, $post_type );

		return is_string( $slug ) && $registry->is_registered( $slug ) ? $slug : null;
	}

	/**
	 * The blocks quick add shows a product with: the theme's pattern, or the
	 * product's title, price and add to basket form, inside WooCommerce's
	 * Single Product block.
	 *
	 * @param WC_Product $product Product.
	 * @return string Block markup.
	 */
	public static function blocks( WC_Product $product ): string {
		$slug  = self::pattern( 'product' );
		$inner = $slug
			? (string) ( WP_Block_Patterns_Registry::get_instance()->get_registered( $slug )['content'] ?? '' )
			: '<!-- wp:post-title {"level":2,"isLink":true} /--><!-- wp:woocommerce/product-price {"isDescendentOfSingleProductTemplate":true} /--><!-- wp:woocommerce/add-to-cart-with-options /-->';

		return sprintf(
			'<!-- wp:woocommerce/single-product {"productId":%1$d} --><div class="wp-block-woocommerce-single-product">%2$s</div><!-- /wp:woocommerce/single-product -->',
			$product->get_id(),
			$inner
		);
	}

	/**
	 * A product's quick add content, at its URL with `?matter-quick-add=1`:
	 * a document with the pattern rendered as the visitor, in the router
	 * region, and the styles, script modules and Interactivity API data its
	 * blocks need. Never cached: it holds the visitor's prices.
	 *
	 * @return void
	 */
	public function respond(): void {
		if ( empty( $_GET[ self::PARAM ] ) || ! is_singular( 'product' ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read only.
			return;
		}

		$product = wc_get_product( get_queried_object_id() );

		if ( ! $product instanceof WC_Product || ! self::shows( $product ) ) {
			return;
		}

		/**
		 * Filters whether WooCommerce's classic add to cart hooks fire in quick
		 * add (its compatibility layer). Off by default: anything they print
		 * that's a form element makes the add to cart form post the page rather
		 * than add in place.
		 *
		 * @param bool       $classic Whether the hooks fire.
		 * @param WC_Product $product Product.
		 */
		if ( ! apply_filters( 'matter_quick_add_classic_hooks', false, $product ) ) {
			add_filter( 'woocommerce_disable_compatibility_layer', '__return_true' );
		}

		/**
		 * Fires before a product's quick add content renders, so a site can
		 * change what its blocks print there (unhook something meant for the
		 * product page).
		 *
		 * @param WC_Product $product Product.
		 */
		do_action( 'matter_quick_add_render', $product );

		add_filter( 'show_admin_bar', '__return_false' );
		nocache_headers();
		header( 'X-Robots-Tag: noindex, nofollow' );

		// Rendered before the head, so the styles and modules its blocks
		// enqueue are printed with the page's.
		$content = do_blocks( self::blocks( $product ) );

		?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="robots" content="noindex, nofollow">
		<?php wp_head(); ?>
</head>
<body <?php body_class( 'matter-quick-add-content' ); ?>>
<div class="wp-block-matter-quick-add__content" data-wp-interactive="matter/quick-add" data-wp-router-region="<?php echo esc_attr( self::REGION ); ?>"><?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Rendered blocks. ?></div>
		<?php wp_footer(); ?>
</body>
</html>
		<?php
		exit;
	}
}
