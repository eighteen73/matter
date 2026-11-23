<?php
/**
 * WooCommerce integration.
 *
 * Boots when WooCommerce is active. Through Matter's hooks it adds:
 *
 * - The Product Collection as a query block that can be shown as a carousel
 *   (the "Products carousel"), and its product template as a loop template,
 *   so products get the theme's loop item (`loop-item-product`).
 * - Products out of the posts carousels, accordions and tabs: the Products
 *   carousel shows them.
 * - The shop page's title for the products archive, and product categories'
 *   thumbnails for archive images.
 * - Its editor script: the "Products carousel" collection and the carousel
 *   slide picker's "Products" option (src/integrations/woocommerce).
 * - Filters for products: the Product Collection as a filterable listing,
 *   and filter sources for product categories, tags, brands and attributes,
 *   price, stock and rating, with WooCommerce's own parameters and counts
 *   (Filters\). WooCommerce's own filter blocks are hidden: Matter's
 *   replace them.
 * - Product loop items (LoopItems\Prerendered) without the shopper's cart
 *   (LoopItems).
 * - Price filters and sorting by the shopper's own prices, when a pricing
 *   plugin says they have them (OwnPrices).
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Integrations\WooCommerce;

use Automattic\WooCommerce\Internal\ProductAttributes\VisualAttributeTermMeta;
use Automattic\WooCommerce\Internal\ProductFilters\Params;
use Eighteen73\Matter\Filters\Sources;
use Eighteen73\Matter\Integrations\Integration;
use Eighteen73\Matter\Integrations\WooCommerce\Filters\Counts as FilterCounts;
use Eighteen73\Matter\Integrations\WooCommerce\Filters\PriceSource;
use Eighteen73\Matter\Integrations\WooCommerce\Filters\ProductTaxonomySource;
use Eighteen73\Matter\Integrations\WooCommerce\Filters\RatingSource;
use Eighteen73\Matter\Integrations\WooCommerce\Filters\StockSource;
use WP_Term;

defined( 'ABSPATH' ) || exit;

/**
 * WooCommerce integration.
 */
final class WooCommerce implements Integration {

	/**
	 * The oldest WooCommerce the integration works with.
	 */
	public const MINIMUM_VERSION = '11.0';

	/**
	 * WooCommerce's query block, shown as a Matter carousel.
	 */
	public const PRODUCT_COLLECTION = 'woocommerce/product-collection';

	/**
	 * The Product Collection's loop template.
	 */
	public const PRODUCT_TEMPLATE = 'woocommerce/product-template';

	/**
	 * WooCommerce's Product Filters blocks, which Matter's filters replace.
	 */
	private const FILTER_BLOCKS = [
		'woocommerce/product-filters',
		'woocommerce/product-filter-active',
		'woocommerce/product-filter-attribute',
		'woocommerce/product-filter-checkbox-list',
		'woocommerce/product-filter-chips',
		'woocommerce/product-filter-clear-button',
		'woocommerce/product-filter-price',
		'woocommerce/product-filter-price-slider',
		'woocommerce/product-filter-rating',
		'woocommerce/product-filter-removable-chips',
		'woocommerce/product-filter-status',
		'woocommerce/product-filter-taxonomy',
	];

	/**
	 * Whether WooCommerce is active.
	 *
	 * @return bool
	 */
	public function can_boot(): bool {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return false;
		}

		return $this->supported_or_notice(
			defined( 'WC_VERSION' ) ? (string) WC_VERSION : '0',
			class_exists( Params::class )
		);
	}

	/**
	 * Whether the integration can run on this WooCommerce, and if not, a notice
	 * for those who can do something about it: the people who manage plugins.
	 *
	 * @param string $version    WooCommerce version.
	 * @param bool   $has_params Whether the product filters' Params class exists.
	 * @return bool
	 */
	public function supported_or_notice( string $version, bool $has_params ): bool {
		if ( self::supports( $version, $has_params ) ) {
			return true;
		}

		add_action(
			'admin_notices',
			static function () use ( $version ): void {
				// Not for an editor, who can't update WooCommerce.
				if ( ! current_user_can( 'activate_plugins' ) ) {
					return;
				}

				printf(
					'<div class="notice notice-warning"><p><strong>%1$s</strong>: %2$s</p></div>',
					esc_html__( 'Matter', 'matter' ),
					esc_html(
						sprintf(
							/* translators: 1: version needed, 2: version in use. */
							__( 'Matter’s WooCommerce features need WooCommerce %1$s or later (this site has %2$s), so they are switched off.', 'matter' ),
							self::MINIMUM_VERSION,
							$version
						)
					)
				);
			}
		);

		return false;
	}

	/**
	 * Whether a WooCommerce version has what the integration uses: its version
	 * and the product filters' parameters class (WooCommerce's internals,
	 * which Matter's filters read).
	 *
	 * @param string $version    WooCommerce version (`WC_VERSION`).
	 * @param bool   $has_params Whether the product filters' Params class exists.
	 * @return bool
	 */
	public static function supports( string $version, bool $has_params ): bool {
		// A pre-release of the minimum (11.0.0-beta.1) counts as the minimum.
		$version = (string) preg_replace( '/[-+].*$/', '', $version );

		return $has_params && version_compare( $version, self::MINIMUM_VERSION, '>=' );
	}

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	public function boot(): void {
		add_filter( 'matter_query_blocks', [ $this, 'query_blocks' ] );
		add_filter( 'matter_query_loops', [ $this, 'query_loops' ] );
		add_filter( 'matter_query_display_post_types', [ $this, 'without_products' ] );
		add_filter( 'matter_archive_post_type_title', [ $this, 'shop_title' ], 10, 2 );
		add_filter( 'matter_archive_term_image_id', [ $this, 'term_thumbnail' ], 10, 2 );
		add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_editor' ] );

		// Filters.
		add_filter( 'matter_filters_query_blocks', [ $this, 'filterable_query_blocks' ] );
		add_action( 'matter_filters_sources', [ $this, 'filter_sources' ], 20 );
		add_filter( 'matter_hidden_blocks', [ $this, 'hide_filter_blocks' ] );
		add_filter( 'matter_filters_base_query_vars', [ $this, 'base_query_vars' ], 10, 3 );
		add_filter( 'matter_filters_swatch', [ $this, 'swatch' ], 10, 2 );

		// Product loop items for everyone, without the shopper's cart.
		( new LoopItems() )->setup();

		// Price filters and sorting by the shopper's own prices.
		( new OwnPrices() )->setup();
	}

	/**
	 * A Product Collection with filters inside is a filterable listing: it
	 * navigates without a page load, and applies WooCommerce's filter
	 * parameters even when it doesn't inherit the shop's query.
	 *
	 * @param array<string, array<string, mixed>> $blocks Block name => attributes.
	 * @return array<string, array<string, mixed>>
	 */
	public function filterable_query_blocks( array $blocks ): array {
		$blocks[ self::PRODUCT_COLLECTION ] = [
			'forcePageReload' => false,
			'query'           => [ 'filterable' => true ],
		];

		return $blocks;
	}

	/**
	 * An attribute term's swatch, from WooCommerce's colour and image
	 * swatches (its visual attributes): a colour, or its image as a cover.
	 *
	 * @param mixed $swatch A swatch already given.
	 * @param mixed $term   Term.
	 * @return string
	 */
	public function swatch( $swatch, $term ): string {
		if ( '' !== (string) $swatch || ! $term instanceof WP_Term || ! self::is_visual( $term->taxonomy ) ) {
			return (string) $swatch;
		}

		$visual = VisualAttributeTermMeta::get_term_visual( $term->term_id );
		$value  = (string) ( $visual['value'] ?? '' );

		if ( VisualAttributeTermMeta::TYPE_COLOR === ( $visual['type'] ?? '' ) ) {
			return (string) sanitize_hex_color( $value );
		}

		if ( VisualAttributeTermMeta::TYPE_IMAGE === ( $visual['type'] ?? '' ) && '' !== $value ) {
			return sprintf( 'url("%s") center / cover', esc_url_raw( $value ) );
		}

		return '';
	}

	/**
	 * Whether a taxonomy is an attribute with WooCommerce's colour or image
	 * swatches (WooCommerce 10.9).
	 *
	 * @param string $taxonomy Taxonomy.
	 * @return bool
	 */
	public static function is_visual( string $taxonomy ): bool {
		return str_starts_with( $taxonomy, 'pa_' )
			&& class_exists( VisualAttributeTermMeta::class )
			&& VisualAttributeTermMeta::is_visual_attribute_taxonomy( $taxonomy );
	}

	/**
	 * A listing's query vars without filters. A Product Collection's are as
	 * WooCommerce's filter blocks read them, without any filter's parameters.
	 * Either kind, inheriting a shop's main query, also leaves out the
	 * clauses WooCommerce added to it for the request's own filters.
	 *
	 * @param mixed     $vars    Query vars.
	 * @param mixed     $listing Listing.
	 * @param \WP_Block $block   A block inside its query.
	 * @return array
	 */
	public function base_query_vars( $vars, $listing, $block ): array {
		if ( ! $listing instanceof \Eighteen73\Matter\Filters\Listing || ! $block instanceof \WP_Block ) {
			return (array) $vars;
		}

		if ( self::PRODUCT_COLLECTION === $listing->block_name ) {
			$vars = FilterCounts::query_vars( $block, Sources::query_param_names() );
		}

		return $listing->inherit
			? FilterCounts::without_shop_filters( (array) $vars, \WC_Query::get_layered_nav_chosen_attributes() )
			: (array) $vars;
	}

	/**
	 * Product filter sources, replacing core's for product taxonomies: each
	 * with WooCommerce's parameter, so its shop and Product Collections apply
	 * it, and its counts.
	 *
	 * @param Sources $sources Registry.
	 * @return void
	 */
	public function filter_sources( Sources $sources ): void {
		$params = wc_get_container()->get( Params::class );

		foreach ( $params->get_param( 'taxonomy' ) as $taxonomy => $param ) {
			if ( taxonomy_exists( $taxonomy ) ) {
				$sources->register( new ProductTaxonomySource( (string) $taxonomy, (string) $param ) );
			}
		}

		foreach ( $params->get_param( 'attribute' ) as $name => $param ) {
			if ( taxonomy_exists( 'pa_' . $name ) ) {
				$sources->register( new ProductTaxonomySource( 'pa_' . $name, (string) $param, 'query_type_' . $name ) );
			}
		}

		$sources->register( new PriceSource() );
		$sources->register( new StockSource() );
		$sources->register( new RatingSource() );
	}

	/**
	 * Hide WooCommerce's filter blocks: Matter's replace them.
	 *
	 * @param string[] $blocks Block names.
	 * @return string[]
	 */
	public function hide_filter_blocks( array $blocks ): array {
		return [ ...$blocks, ...self::FILTER_BLOCKS ];
	}

	/**
	 * The Product Collection can be shown as a carousel.
	 *
	 * @param array<string, string[]> $blocks Query block name => display types.
	 * @return array<string, string[]>
	 */
	public function query_blocks( array $blocks ): array {
		$blocks[ self::PRODUCT_COLLECTION ] = [ 'carousel' ];

		return $blocks;
	}

	/**
	 * The Product Collection's product template lists posts (products).
	 *
	 * @param array<string, string> $loops Block name => `post` or `term`.
	 * @return array<string, string>
	 */
	public function query_loops( array $loops ): array {
		$loops[ self::PRODUCT_TEMPLATE ] = 'post';

		return $loops;
	}

	/**
	 * Products aren't offered to the posts displays: the Products carousel
	 * shows them, with WooCommerce's own choices (on sale, hand-picked …).
	 *
	 * @param array<int, array{name: string, label: string}> $types Post types.
	 * @return array<int, array{name: string, label: string}>
	 */
	public function without_products( array $types ): array {
		return array_values( array_filter( $types, fn( $type ) => 'product' !== ( $type['name'] ?? '' ) ) );
	}

	/**
	 * The products archive is named by the shop page.
	 *
	 * @param string|null $title     Title, or null to work it out.
	 * @param string      $post_type Post type.
	 * @return string|null
	 */
	public function shop_title( $title, string $post_type ) {
		if ( 'product' !== $post_type || ! function_exists( 'wc_get_page_id' ) || wc_get_page_id( 'shop' ) <= 0 ) {
			return $title;
		}

		return get_the_title( wc_get_page_id( 'shop' ) );
	}

	/**
	 * A product category's thumbnail (WooCommerce's `thumbnail_id` term meta)
	 * is its archive's image.
	 *
	 * @param int          $image Attachment ID, or 0 for none.
	 * @param WP_Term|null $term  The archive's term.
	 * @return int
	 */
	public function term_thumbnail( int $image, $term ): int {
		if ( $image || ! $term instanceof WP_Term ) {
			return $image;
		}

		return (int) get_term_meta( $term->term_id, 'thumbnail_id', true );
	}

	/**
	 * The editor script: the Products carousel collection and the carousel
	 * slide picker's "Products" option. After Matter's editor script, whose
	 * helpers it uses.
	 *
	 * @return void
	 */
	public function enqueue_editor(): void {
		$asset_file = MATTER_PATH . 'build/integrations/woocommerce/editor.asset.php';

		if ( ! file_exists( $asset_file ) ) {
			return;
		}

		$asset = require $asset_file;

		wp_enqueue_script(
			'matter-woocommerce-editor',
			MATTER_URL . 'build/integrations/woocommerce/editor.js',
			array_merge( $asset['dependencies'], [ 'matter-editor' ] ),
			$asset['version'],
			true
		);

		if ( file_exists( MATTER_PATH . 'build/integrations/woocommerce/editor.css' ) ) {
			wp_enqueue_style( 'matter-woocommerce-editor', MATTER_URL . 'build/integrations/woocommerce/editor.css', [], $asset['version'] );
		}

		wp_set_script_translations( 'matter-woocommerce-editor', 'matter', MATTER_PATH . 'languages' );
	}
}
