<?php
/**
 * Accordion block server-side helpers.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Blocks;

use Eighteen73\Matter\Singleton;

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

		if ( ! empty( $attrs['isQueryMode'] ) || self::has_query_block( $inner_blocks ) ) {
			return $block_content;
		}

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
	 * Build a FAQPage schema graph from static accordion items.
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
			if ( 'matter/accordion-item' !== ( $inner_block['blockName'] ?? '' ) ) {
				continue;
			}

			$question = $this->extract_item_question( $inner_block );
			$answer   = $this->extract_item_answer( $inner_block );

			if ( '' === $question || '' === $answer ) {
				continue;
			}

			$schema['mainEntity'][] = [
				'@type'          => 'Question',
				'name'           => $question,
				'acceptedAnswer' => [
					'@type' => 'Answer',
					'text'  => $answer,
				],
			];
		}

		return $schema;
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

			return trim( wp_strip_all_tags( $title ) );
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

			$text = wp_strip_all_tags( implode( '', $parts ) );
			$text = preg_replace( '/\s+/u', ' ', $text );

			return trim( is_string( $text ) ? $text : '' );
		}

		return '';
	}
}
