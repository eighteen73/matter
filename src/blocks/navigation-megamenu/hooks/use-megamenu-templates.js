/**
 * WordPress dependencies
 */
import { useEntityRecords } from '@wordpress/core-data';

export const MEGAMENU_AREA = 'megamenu';

export const MEGAMENU_TEMPLATE_QUERY = {
	per_page: -1,
	context: 'edit',
};

/**
 * Load template parts for the megamenu selector.
 *
 * @param {string} selectedSlug Currently selected template part slug.
 * @return {{hasResolved: boolean, templates: Array<Object>, selectedRecord: Object|null, isMissing: boolean}} Template part state.
 */
export default function useMegamenuTemplates(selectedSlug = '') {
	const { hasResolved, records } = useEntityRecords(
		'postType',
		'wp_template_part',
		MEGAMENU_TEMPLATE_QUERY
	);

	const allRecords = hasResolved && records ? records : [];
	const templates = allRecords.filter((item) => item.area === MEGAMENU_AREA);
	const selectedRecord = selectedSlug
		? allRecords.find((item) => item.slug === selectedSlug) || null
		: null;
	const isMissing = hasResolved && !!selectedSlug && !selectedRecord;

	return {
		hasResolved,
		templates,
		selectedRecord,
		isMissing,
	};
}
