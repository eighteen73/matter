<?php
/**
 * Accordion block server-side helpers.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

use Eighteen73\Matter\Singleton;
use WP_Block;
use WP_Post;
use WP_Query;

defined( 'ABSPATH' ) || exit;

/**
 * Provides accordion context through Query Loop nesting and item ID helpers.
 */
class Accordion {
	use Singleton;

	/**
	 * Per-accordion item counters for static render order.
	 *
	 * @var array<string, int>
	 */
	private static $item_counters = [];

	/**
	 * Context captured from the accordion currently being rendered.
	 *
	 * @var array<string, mixed>|null
	 */
	private $current_context = null;

	/**
	 * Setup accordion block hooks.
	 *
	 * @return void
	 */
	public function setup(): void {
		add_filter( 'render_block_data', [ $this, 'capture_accordion' ], 10, 1 );
		add_filter( 'render_block_context', [ $this, 'provide_context' ], 10, 2 );
		add_filter( 'render_block_matter/accordion', [ $this, 'clear_accordion' ], 10, 2 );
		add_filter( 'render_block_matter/accordion', [ $this, 'accordion_schema' ], 10, 2 );
	}

	/**
	 * Resolve a font-size support value to a CSS length/var.
	 *
	 * Mirrors Gallery::resolve_block_gap_value() for typography.fontSize.
	 *
	 * @param mixed $preset_slug  Preset slug from the fontSize attribute.
	 * @param mixed $custom_size  Custom size from style.typography.fontSize.
	 * @return string Empty when unset.
	 */
	public static function resolve_font_size_value( $preset_slug = null, $custom_size = null ): string {
		if ( is_string( $preset_slug ) && '' !== $preset_slug ) {
			return 'var(--wp--preset--font-size--' . _wp_to_kebab_case( $preset_slug ) . ')';
		}

		if ( ! is_string( $custom_size ) || '' === $custom_size ) {
			return '';
		}

		if ( str_contains( $custom_size, 'var:preset|font-size|' ) ) {
			$slug = _wp_to_kebab_case( substr( $custom_size, strrpos( $custom_size, '|' ) + 1 ) );
			return "var(--wp--preset--font-size--{$slug})";
		}

		$resolved = wp_get_typography_font_size_value(
			[
				'size' => $custom_size,
			]
		);

		return is_string( $resolved ) && '' !== $resolved ? $resolved : '';
	}

	/**
	 * Resolve a stable item ID for a query loop accordion item.
	 *
	 * @param string $accordion_id   Accordion instance ID.
	 * @param int    $post_id        Post ID from query loop context.
	 * @param int    $fallback_index Fallback index when post ID is unavailable.
	 * @return string
	 */
	public static function get_query_item_id( string $accordion_id, int $post_id, int $fallback_index = 0 ): string {
		if ( $post_id > 0 ) {
			return ! empty( $accordion_id )
				? $accordion_id . '-item-' . $post_id
				: 'matter-accordion-item-' . $post_id;
		}

		return self::get_static_item_id( $accordion_id, $fallback_index );
	}

	/**
	 * Resolve a stable item ID for a static accordion item.
	 *
	 * @param string $accordion_id Accordion instance ID.
	 * @param int    $index        Zero-based item index.
	 * @return string
	 */
	public static function get_static_item_id( string $accordion_id, int $index ): string {
		return ! empty( $accordion_id )
			? $accordion_id . '-item-' . $index
			: 'matter-accordion-item-' . $index;
	}

	/**
	 * Get and increment the next item index for an accordion instance.
	 *
	 * @param string $accordion_id Accordion instance ID.
	 * @return int
	 */
	public static function get_item_index( string $accordion_id ): int {
		$key = $accordion_id !== '' ? $accordion_id : '__default';

		if ( ! isset( self::$item_counters[ $key ] ) ) {
			self::$item_counters[ $key ] = 0;
		}

		$index = self::$item_counters[ $key ];
		++self::$item_counters[ $key ];

		return $index;
	}

	/**
	 * Whether parsed inner blocks contain a query loop.
	 *
	 * @param array<int, array<string, mixed>> $inner_blocks Parsed inner blocks.
	 * @return bool
	 */
	public static function has_query_block( array $inner_blocks ): bool {
		foreach ( $inner_blocks as $inner_block ) {
			if ( 'core/query' === ( $inner_block['blockName'] ?? '' ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Capture accordion context before inner blocks render.
	 *
	 * @param array<string, mixed> $parsed_block Parsed block data.
	 * @return array<string, mixed>
	 */
	public function capture_accordion( array $parsed_block ): array {
		if ( 'matter/accordion' !== ( $parsed_block['blockName'] ?? '' ) ) {
			return $parsed_block;
		}

		$attrs         = isset( $parsed_block['attrs'] ) && is_array( $parsed_block['attrs'] ) ? $parsed_block['attrs'] : [];
		$accordion_id  = BlockId::resolve_base_id( $attrs, 'matter-accordion-' );
		$is_query_mode = ! empty( $attrs['isQueryMode'] )
			|| self::has_query_block( $parsed_block['innerBlocks'] ?? [] );

		$this->current_context = [
			'matter/accordion-id'            => $accordion_id,
			'matter/accordion-isQueryMode'   => $is_query_mode,
			'matter/accordion-heading-level' => (int) ( $attrs['headingLevel'] ?? 3 ),
			'matter/accordion-icon-position' => (string) ( $attrs['iconPosition'] ?? 'right' ),
			'matter/accordion-show-icon'     => array_key_exists( 'showIcon', $attrs )
				? (bool) $attrs['showIcon']
				: true,
		];

		self::$item_counters[ $accordion_id !== '' ? $accordion_id : '__default' ] = 0;

		return $parsed_block;
	}

	/**
	 * Clear captured accordion context after the accordion finishes rendering.
	 *
	 * @param string               $block_content Rendered block HTML.
	 * @param array<string, mixed> $block         Parsed block.
	 * @return string
	 */
	public function clear_accordion( string $block_content, array $block ): string { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed
		$this->current_context = null;

		return $block_content;
	}

	/**
	 * Provide accordion context during server-side rendering.
	 *
	 * @param array<string, mixed> $context      Default block context.
	 * @param array<string, mixed> $parsed_block The block being rendered.
	 * @return array<string, mixed>
	 */
	public function provide_context( array $context, array $parsed_block ): array {
		$block_name = $parsed_block['blockName'] ?? '';

		if ( 'matter/accordion' === $block_name && null !== $this->current_context ) {
			return array_merge( $context, $this->current_context );
		}

		$passthrough_blocks = [
			'core/query',
			'core/post-template',
			'matter/accordion-item',
			'matter/accordion-heading',
			'matter/accordion-panel',
		];

		if ( null !== $this->current_context && in_array( $block_name, $passthrough_blocks, true ) ) {
			foreach ( $this->current_context as $key => $value ) {
				if ( ! array_key_exists( $key, $context ) ) {
					$context[ $key ] = $value;
				}
			}
		}

		if ( 'matter/accordion-item' !== $block_name ) {
			return $context;
		}

		$attrs        = isset( $parsed_block['attrs'] ) && is_array( $parsed_block['attrs'] ) ? $parsed_block['attrs'] : [];
		$accordion_id = (string) ( $context['matter/accordion-id'] ?? '' );
		$in_query     = ! empty( $attrs['inQueryLoop'] );
		$post_id      = (int) ( $context['postId'] ?? 0 );
		$index        = self::get_item_index( $accordion_id );

		if ( $in_query && $post_id > 0 ) {
			$item_id = self::get_query_item_id( $accordion_id, $post_id, $index );
		} else {
			$item_id = self::get_static_item_id( $accordion_id, $index );
		}

		$context['matter/accordion-item-id'] = $item_id;

		return $context;
	}

	/**
	 * Append FAQPage JSON-LD schema when hasSchema is enabled.
	 *
	 * @param string               $block_content Rendered block HTML.
	 * @param array<string, mixed> $block         Parsed block.
	 * @return string
	 */
	public function accordion_schema( string $block_content, array $block ): string {
		$attrs      = isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : [];
		$has_schema = ! empty( $attrs['hasSchema'] );

		if ( ! $has_schema ) {
			return $block_content;
		}

		$inner_blocks = isset( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] )
			? $block['innerBlocks']
			: [];

		$schema = $this->build_faq_schema( $inner_blocks );

		if ( empty( $schema['mainEntity'] ) ) {
			return $block_content;
		}

		$json_ld_schema = wp_json_encode( $schema );

		if ( empty( $json_ld_schema ) ) {
			return $block_content;
		}

		add_action(
			'wp_head',
			function () use ( $json_ld_schema ) {
				echo '<script class="matter-accordion-faqs-schema-graph" type="application/ld+json">' . wp_kses_data( $json_ld_schema ) . '</script>';
			}
		);

		return $block_content;
	}

	/**
	 * Build a FAQPage schema graph from static items or a query loop.
	 *
	 * @param array<int, array<string, mixed>> $inner_blocks Accordion inner blocks.
	 * @return array<string, mixed>
	 */
	private function build_faq_schema( array $inner_blocks ): array {
		$schema = [
			'@context'   => 'https://schema.org',
			'@type'      => 'FAQPage',
			'mainEntity' => [],
		];

		foreach ( $inner_blocks as $inner_block ) {
			$block_name = $inner_block['blockName'] ?? '';

			if ( 'core/query' === $block_name ) {
				$this->append_query_faq_entities( $schema, $inner_block );
				continue;
			}

			if ( 'matter/accordion-item' !== $block_name ) {
				continue;
			}

			$question = $this->extract_item_question( $inner_block );
			$answer   = $this->extract_item_answer( $inner_block );

			if ( '' === $question || '' === $answer ) {
				continue;
			}

			$schema['mainEntity'][] = $this->make_faq_entity( $question, $answer );
		}

		return $schema;
	}

	/**
	 * Append FAQ entities for each post in a nested query loop.
	 *
	 * @param array<string, mixed> $schema      FAQPage schema (by reference).
	 * @param array<string, mixed> $query_block Parsed core/query block.
	 * @return void
	 */
	private function append_query_faq_entities( array &$schema, array $query_block ): void {
		$item_block = $this->find_query_accordion_item( $query_block );
		if ( null === $item_block ) {
			return;
		}

		$panel_block = null;
		foreach ( $item_block['innerBlocks'] ?? [] as $child ) {
			if ( 'matter/accordion-panel' === ( $child['blockName'] ?? '' ) ) {
				$panel_block = $child;
				break;
			}
		}

		if ( null === $panel_block ) {
			return;
		}

		$query = $this->get_query_posts_from_block( $query_block );
		if ( null === $query || empty( $query->posts ) ) {
			return;
		}

		foreach ( $query->posts as $post ) {
			if ( ! $post instanceof WP_Post ) {
				continue;
			}

			$question = self::normalize_schema_text( get_the_title( $post ) );
			$answer   = $this->extract_panel_answer_for_post( $panel_block, $post );

			if ( '' === $question || '' === $answer ) {
				continue;
			}

			$schema['mainEntity'][] = $this->make_faq_entity( $question, $answer );
		}
	}

	/**
	 * Find the accordion item template inside a query block's post-template.
	 *
	 * @param array<string, mixed> $query_block Parsed core/query block.
	 * @return array<string, mixed>|null
	 */
	private function find_query_accordion_item( array $query_block ): ?array {
		foreach ( $query_block['innerBlocks'] ?? [] as $child ) {
			if ( 'core/post-template' !== ( $child['blockName'] ?? '' ) ) {
				continue;
			}

			foreach ( $child['innerBlocks'] ?? [] as $item ) {
				if ( 'matter/accordion-item' === ( $item['blockName'] ?? '' ) ) {
					return $item;
				}
			}
		}

		return null;
	}

	/**
	 * Run the same query the nested post-template block would use.
	 *
	 * build_query_vars_from_query_block() reads query settings from block context,
	 * not attributes, so we simulate the post-template context here.
	 *
	 * @param array<string, mixed> $query_block Parsed query block.
	 * @return WP_Query|null
	 */
	private function get_query_posts_from_block( array $query_block ): ?WP_Query {
		$query_attrs = $query_block['attrs'] ?? [];
		$query       = $query_attrs['query'] ?? [];

		if ( ! empty( $query['inherit'] ) ) {
			global $wp_query;

			if ( in_the_loop() ) {
				$inherited_query = clone $wp_query;
				$inherited_query->rewind_posts();

				return $inherited_query;
			}

			return $wp_query;
		}

		if ( ! function_exists( 'build_query_vars_from_query_block' ) ) {
			return null;
		}

		$available_context = [
			'query' => $query,
		];

		if ( isset( $query_attrs['queryId'] ) ) {
			$available_context['queryId'] = $query_attrs['queryId'];
		}

		$block_for_query = new WP_Block(
			[
				'blockName'   => 'core/post-template',
				'attrs'       => [],
				'innerBlocks' => [],
			],
			$available_context
		);

		$query_vars = build_query_vars_from_query_block( $block_for_query, 1 );

		return new WP_Query( $query_vars );
	}

	/**
	 * Render accordion panel inner blocks for a post and return plain-text answer.
	 *
	 * @param array<string, mixed> $panel_block Accordion panel parsed block.
	 * @param WP_Post              $post        Post from the query loop.
	 * @return string
	 */
	private function extract_panel_answer_for_post( array $panel_block, WP_Post $post ): string {
		setup_postdata( $post );

		$parts = [];

		foreach ( $panel_block['innerBlocks'] ?? [] as $answer_block ) {
			$rendered = ( new WP_Block(
				$answer_block,
				[
					'postId'   => $post->ID,
					'postType' => $post->post_type,
				]
			) )->render();

			$parts[] = is_string( $rendered ) ? $rendered : '';
		}

		wp_reset_postdata();

		return self::normalize_schema_text( implode( '', $parts ) );
	}

	/**
	 * Build a single FAQ Question entity.
	 *
	 * @param string $question Question text.
	 * @param string $answer   Answer text.
	 * @return array<string, mixed>
	 */
	private function make_faq_entity( string $question, string $answer ): array {
		return [
			'@type'          => 'Question',
			'name'           => $question,
			'acceptedAnswer' => [
				'@type' => 'Answer',
				'text'  => $answer,
			],
		];
	}

	/**
	 * Strip tags and collapse whitespace for schema text fields.
	 *
	 * @param string $html Raw HTML or text.
	 * @return string
	 */
	private static function normalize_schema_text( string $html ): string {
		$text = wp_strip_all_tags( $html );
		$text = preg_replace( '/\s+/u', ' ', $text );

		return trim( is_string( $text ) ? $text : '' );
	}

	/**
	 * Extract the question text from an accordion item's heading block.
	 *
	 * @param array<string, mixed> $item_block Accordion item parsed block.
	 * @return string
	 */
	private function extract_item_question( array $item_block ): string {
		foreach ( $item_block['innerBlocks'] ?? [] as $child ) {
			if ( 'matter/accordion-heading' !== ( $child['blockName'] ?? '' ) ) {
				continue;
			}

			$title = isset( $child['attrs']['title'] ) ? (string) $child['attrs']['title'] : '';

			return self::normalize_schema_text( $title );
		}

		return '';
	}

	/**
	 * Extract the answer text from an accordion item's panel block.
	 *
	 * @param array<string, mixed> $item_block Accordion item parsed block.
	 * @return string
	 */
	private function extract_item_answer( array $item_block ): string {
		foreach ( $item_block['innerBlocks'] ?? [] as $child ) {
			if ( 'matter/accordion-panel' !== ( $child['blockName'] ?? '' ) ) {
				continue;
			}

			$parts = [];

			foreach ( $child['innerBlocks'] ?? [] as $answer_block ) {
				$parts[] = $answer_block['innerHTML'] ?? '';
			}

			return self::normalize_schema_text( implode( '', $parts ) );
		}

		return '';
	}
}
