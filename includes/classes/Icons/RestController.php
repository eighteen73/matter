<?php
/**
 * Icons REST API controller.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Icons;

use WP_Error;
use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * REST controller for Matter icons.
 */
class RestController extends WP_REST_Controller {

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->namespace = 'matter/v1';
		$this->rest_base = 'icons';
	}

	/**
	 * Registers REST routes.
	 *
	 * @return void
	 */
	public function register_routes(): void {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			[
				[
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => [ $this, 'get_items' ],
					'permission_callback' => [ $this, 'get_items_permissions_check' ],
					'args'                => $this->get_collection_params(),
				],
				'schema' => [ $this, 'get_public_item_schema' ],
			]
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/(?P<name>[a-z][a-z0-9-]*/[a-z][a-z0-9-]*)',
			[
				'args'   => [
					'name' => [
						'description' => __( 'Icon name.', 'matter' ),
						'type'        => 'string',
					],
				],
				[
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => [ $this, 'get_item' ],
					'permission_callback' => [ $this, 'get_item_permissions_check' ],
					'args'                => [
						'context' => $this->get_context_param( [ 'default' => 'view' ] ),
					],
				],
				'schema' => [ $this, 'get_public_item_schema' ],
			]
		);
	}

	/**
	 * Checks whether the current user can read icons.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return true|WP_Error
	 */
	public function get_items_permissions_check( $request ) { // phpcs:ignore VariableAnalysis.CodeAnalysis.VariableAnalysis.UnusedVariable
		if ( current_user_can( 'edit_posts' ) ) {
			return true;
		}

		foreach ( get_post_types( [ 'show_in_rest' => true ], 'objects' ) as $post_type ) {
			if ( current_user_can( $post_type->cap->edit_posts ) ) {
				return true;
			}
		}

		return new WP_Error(
			'rest_cannot_view',
			__( 'Sorry, you are not allowed to view the registered icons.', 'matter' ),
			[ 'status' => rest_authorization_required_code() ]
		);
	}

	/**
	 * Checks whether the current user can read a single icon.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return true|WP_Error
	 */
	public function get_item_permissions_check( $request ) {
		$check = $this->get_items_permissions_check( $request );

		if ( is_wp_error( $check ) ) {
			return $check;
		}

		return true;
	}

	/**
	 * Retrieves all icons.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_items( $request ) {
		$response = [];
		$search   = $request->get_param( 'search' );
		$icons    = Resolver::instance()->get_registered_icons( is_string( $search ) ? $search : '' );

		foreach ( $icons as $icon ) {
			$prepared_icon = $this->prepare_item_for_response( $icon, $request );
			$response[]    = $this->prepare_response_for_collection( $prepared_icon );
		}

		return rest_ensure_response( $response );
	}

	/**
	 * Retrieves a single icon.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_item( $request ) {
		$icon = $this->get_icon( $request['name'] );

		if ( is_wp_error( $icon ) ) {
			return $icon;
		}

		$data = $this->prepare_item_for_response( $icon, $request );

		return rest_ensure_response( $data );
	}

	/**
	 * Retrieves a specific icon from the registry.
	 *
	 * @param string $name Icon name.
	 * @return array<string, mixed>|WP_Error
	 */
	public function get_icon( string $name ) {
		$icon = Registry::instance()->get_registered_icon( $name );

		if ( null === $icon ) {
			return new WP_Error(
				'rest_icon_not_found',
				sprintf(
					/* translators: %s: icon name */
					__( 'Icon not found: "%s".', 'matter' ),
					$name
				),
				[ 'status' => 404 ]
			);
		}

		return $icon;
	}

	/**
	 * Prepares a raw icon for REST output.
	 *
	 * @param array<string, mixed> $item    Raw icon data.
	 * @param WP_REST_Request      $request Request object.
	 * @return WP_REST_Response
	 */
	public function prepare_item_for_response( $item, $request ) {
		$fields = $this->get_fields_for_response( $request );
		$keys   = [
			'name'    => 'name',
			'label'   => 'label',
			'content' => 'content',
		];
		$data   = [];

		foreach ( $keys as $item_key => $rest_key ) {
			if ( isset( $item[ $item_key ] ) && rest_is_field_included( $rest_key, $fields ) ) {
				$data[ $rest_key ] = $item[ $item_key ];
			}
		}

		$context = ! empty( $request['context'] ) ? $request['context'] : 'view';
		$data    = $this->add_additional_fields_to_object( $data, $request );
		$data    = $this->filter_response_by_context( $data, $context );

		return rest_ensure_response( $data );
	}

	/**
	 * Retrieves the icon schema.
	 *
	 * @return array<string, mixed>
	 */
	public function get_item_schema() {
		if ( $this->schema ) {
			return $this->add_additional_fields_schema( $this->schema );
		}

		$this->schema = [
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'icon',
			'type'       => 'object',
			'properties' => [
				'name'    => [
					'description' => __( 'The icon name.', 'matter' ),
					'type'        => 'string',
					'readonly'    => true,
					'context'     => [ 'view', 'edit', 'embed' ],
				],
				'label'   => [
					'description' => __( 'The icon label.', 'matter' ),
					'type'        => 'string',
					'readonly'    => true,
					'context'     => [ 'view', 'edit', 'embed' ],
				],
				'content' => [
					'description' => __( 'The icon content (SVG markup).', 'matter' ),
					'type'        => 'string',
					'readonly'    => true,
					'context'     => [ 'view', 'edit', 'embed' ],
				],
			],
		];

		return $this->add_additional_fields_schema( $this->schema );
	}

	/**
	 * Retrieves collection query parameters.
	 *
	 * @return array<string, mixed>
	 */
	public function get_collection_params() {
		$query_params                       = parent::get_collection_params();
		$query_params['context']['default'] = 'view';

		return $query_params;
	}
}
