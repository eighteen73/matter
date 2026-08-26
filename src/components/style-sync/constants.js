/**
 * Syncable container block names.
 *
 * A synced container peers its similar siblings/cousins and maps style
 * changes anywhere in that container's subtree by relative path.
 *
 * Groups are the explicit card wrapper. Columns are included so repeating
 * column layouts sync without an extra Group inside each column.
 */
export const SYNCABLE_BLOCK_NAMES = ['core/group', 'core/column'];

/**
 * Block attribute that enables style sync on a container.
 */
export const STYLE_SYNC_ATTRIBUTE = 'styleSync';

/**
 * Stable notice IDs for snackbar deduplication.
 */
export const NOTICE_ID_OFFER = 'matter/style-sync-offer';
export const NOTICE_ID_SYNCED = 'matter/style-sync-synced';
