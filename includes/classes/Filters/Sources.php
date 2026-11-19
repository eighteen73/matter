<?php
/**
 * The filter sources a `matter/filter` block can use.
 *
 * Core registers a TaxonomySource for every public taxonomy (`taxonomy:{name}`).
 * Integrations add theirs on the `matter_filter_sources` action, and can
 * replace one by registering the same key (the WooCommerce integration's
 * product categories and attributes use WooCommerce's own parameters):
 *
 *     add_action( 'matter_filter_sources', function ( Sources $sources ) {
 *         $sources->register( new MySource() );
 *     } );
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Filters;

use Eighteen73\Matter\Archives\Archives;

defined( 'ABSPATH' ) || exit;

/**
 * Filter sources.
 */
final class Sources {

	/**
	 * Sources by key, once collected (after `init`, when taxonomies exist).
	 *
	 * @var array<string, Source>|null
	 */
	private static ?array $all = null;

	/**
	 * Sources being collected.
	 *
	 * @var array<string, Source>
	 */
	private array $sources = [];

	/**
	 * Add (or replace, by key) a source.
	 *
	 * @param Source $source Source.
	 * @return void
	 */
	public function register( Source $source ): void {
		$this->sources[ $source->key() ] = $source;
	}

	/**
	 * Remove a source.
	 *
	 * @param string $key Source key.
	 * @return void
	 */
	public function unregister( string $key ): void {
		unset( $this->sources[ $key ] );
	}

	/**
	 * Every source, by key.
	 *
	 * @return array<string, Source>
	 */
	public static function all(): array {
		if ( null !== self::$all ) {
			return self::$all;
		}

		$registry = new self();

		foreach ( get_taxonomies( [ 'public' => true ], 'objects' ) as $taxonomy ) {
			if ( in_array( $taxonomy->name, [ 'post_format' ], true ) || [] === array_diff( (array) $taxonomy->object_type, [ Archives::POST_TYPE ] ) ) {
				continue;
			}

			$registry->register( new TaxonomySource( $taxonomy->name ) );
		}

		/**
		 * Register filter sources, or replace core's (by key).
		 *
		 * @param Sources $registry The registry.
		 */
		do_action( 'matter_filter_sources', $registry );

		// Taxonomies are registered on `init`: before then, don't keep the list.
		if ( did_action( 'init' ) ) {
			self::$all = $registry->sources;
		}

		return $registry->sources;
	}

	/**
	 * A source by key.
	 *
	 * @param string $key Source key.
	 * @return Source|null
	 */
	public static function get( string $key ): ?Source {
		return self::all()[ $key ] ?? null;
	}

	/**
	 * Forget the collected sources (e.g. after registering a taxonomy).
	 *
	 * @return void
	 */
	public static function flush(): void {
		self::$all = null;
	}

	/**
	 * Every query block parameter a source adds to the request
	 * (QueryParams): WooCommerce's.
	 *
	 * @return string[]
	 */
	public static function query_param_names(): array {
		$params = [];

		foreach ( self::all() as $source ) {
			if ( $source instanceof QueryParams ) {
				$params = array_merge( $params, array_keys( $source->query_params( [] ) ) );
			}
		}

		return array_values( array_unique( $params ) );
	}

	/**
	 * A URL parameter name for a taxonomy: short and readable, as a filter's
	 * name in `filter_{name}` (`category` and `tag` for posts' and products'
	 * categories and tags, `brand`, an attribute's own name, else the
	 * taxonomy's).
	 *
	 * @param string $taxonomy Taxonomy.
	 * @return string
	 */
	public static function param_name( string $taxonomy ): string {
		$names = [
			'category'      => 'category',
			'post_tag'      => 'tag',
			'product_cat'   => 'category',
			'product_tag'   => 'tag',
			'product_brand' => 'brand',
		];
		$name  = $names[ $taxonomy ] ?? ( str_starts_with( $taxonomy, 'pa_' ) ? substr( $taxonomy, 3 ) : $taxonomy );

		/**
		 * Filters the name a taxonomy's filter has in its URL parameters
		 * (`filter_{name}`).
		 *
		 * @param string $name     Name.
		 * @param string $taxonomy Taxonomy.
		 */
		return sanitize_key( (string) apply_filters( 'matter_filter_param_name', $name, $taxonomy ) );
	}

	/**
	 * Every URL parameter a source reads.
	 *
	 * @return string[]
	 */
	public static function params(): array {
		$params = [];

		foreach ( self::all() as $source ) {
			$params = array_merge( $params, array_values( $source->params() ) );
		}

		return array_values( array_unique( $params ) );
	}
}
