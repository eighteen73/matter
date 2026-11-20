<?php
/**
 * The REST controller for archive entries.
 *
 * Entries are fragments of archive pages: for editing, not for reading on
 * their own. Core lets anyone read what's published, so this asks for the
 * right to edit them, for the collection and for one entry alike.
 *
 * @package Eighteen73\Matter
 */

namespace Eighteen73\Matter\Archives;

use WP_Error;
use WP_REST_Posts_Controller;
use WP_REST_Request;

defined( 'ABSPATH' ) || exit;

/**
 * Archive entries over REST, for people who can edit them.
 */
class RestController extends WP_REST_Posts_Controller {

	/**
	 * Whether the user may edit entries.
	 *
	 * @return true|WP_Error
	 */
	private function can_edit_entries(): bool|WP_Error {
		if ( current_user_can( $this->post_type_object()->cap->edit_posts ) ) {
			return true;
		}

		return new WP_Error(
			'rest_forbidden',
			__( 'Sorry, you are not allowed to view archive entries.', 'matter' ),
			[ 'status' => rest_authorization_required_code() ]
		);
	}

	/**
	 * The post type's object.
	 *
	 * @return \WP_Post_Type
	 */
	private function post_type_object(): \WP_Post_Type {
		return get_post_type_object( $this->post_type );
	}

	/**
	 * Listing entries.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return true|WP_Error
	 */
	public function get_items_permissions_check( $request ) {
		$allowed = $this->can_edit_entries();

		return true === $allowed ? parent::get_items_permissions_check( $request ) : $allowed;
	}

	/**
	 * Reading one entry.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return true|WP_Error
	 */
	public function get_item_permissions_check( $request ) {
		$allowed = $this->can_edit_entries();

		return true === $allowed ? parent::get_item_permissions_check( $request ) : $allowed;
	}
}
