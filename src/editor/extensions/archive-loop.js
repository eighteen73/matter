/**
 * The Archive list block (`matter/archive-loop`) can be added only in an
 * archive entry. The server allows it only there when the editor's blocks are
 * a list (Archives::allow_archive_loop()); when every block is allowed it
 * can't take part in that list, so this keeps the block out of the inserter
 * and out of other editors (pages, templates).
 */

/**
 * WordPress dependencies
 */
import { addFilter } from '@wordpress/hooks';
import { select } from '@wordpress/data';

/**
 * Internal dependencies
 */
import { CAN_INSERT_FILTER } from './can-insert';

const BLOCK = 'matter/archive-loop';
const POST_TYPE = 'matter_archive';

/**
 * Whether a block can be inserted: the Archive list only in an archive entry.
 *
 * @param {boolean} canInsert Whether it can.
 * @param {Object}  blockType The block type.
 * @param {string}  postType  The type of what's being edited.
 * @return {boolean} Whether it can.
 */
export const withArchiveLoopOnlyInEntries = (canInsert, blockType, postType) =>
	blockType?.name === BLOCK ? canInsert && postType === POST_TYPE : canInsert;

addFilter(
	CAN_INSERT_FILTER,
	'matter/archive-loop-only-in-entries',
	(canInsert, blockType) =>
		withArchiveLoopOnlyInEntries(
			canInsert,
			blockType,
			select('core/editor')?.getCurrentPostType?.()
		)
);
