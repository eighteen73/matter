/**
 * WordPress dependencies
 */
import { store as coreStore } from '@wordpress/core-data';
import { useDispatch } from '@wordpress/data';
import { useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { MEGAMENU_TEMPLATE_QUERY } from './use-megamenu-templates';

/**
 * Generate a unique slug and title from a base value.
 *
 * @param {string}        baseSlug          Preferred slug.
 * @param {string}        baseTitle         Preferred title.
 * @param {Array<Object>} existingTemplates Existing template parts.
 * @return {{slug: string, title: string}} Unique slug and title.
 */
function generateUniqueSlugAndTitle(
	baseSlug,
	baseTitle,
	existingTemplates = []
) {
	const slugs = new Set(
		(existingTemplates || []).map((template) => template.slug)
	);

	if (!slugs.has(baseSlug)) {
		return { slug: baseSlug, title: baseTitle };
	}

	let counter = 2;
	while (slugs.has(`${baseSlug}-${counter}`)) {
		counter++;
	}

	return {
		slug: `${baseSlug}-${counter}`,
		title: `${baseTitle} ${counter}`,
	};
}

/**
 * Create a megamenu template part via the core entity API.
 *
 * @param {Object}             options                          Hook options.
 * @param {string}             options.templateArea             Template part area.
 * @param {string}             options.baseSlug                 Preferred slug.
 * @param {string}             options.baseTitle                Preferred title.
 * @param {Array<Object>}      options.existingTemplates        Existing template parts.
 * @param {string}             options.currentTheme             Active theme stylesheet.
 * @param {Function}           options.onSuccess                Called with the created template.
 * @param {Function|undefined} options.onNavigateToEntityRecord Site Editor navigation.
 * @param {Function}           options.getAdminUrl              Admin URL for the fallback editor link.
 * @return {{createTemplate: Function, isCreating: boolean}} Creation helpers.
 */
export default function useTemplateCreation({
	templateArea,
	baseSlug,
	baseTitle,
	existingTemplates = [],
	currentTheme,
	onSuccess = () => {},
	onNavigateToEntityRecord,
	getAdminUrl,
}) {
	const [isCreating, setIsCreating] = useState(false);
	const { invalidateResolution, saveEntityRecord } = useDispatch(coreStore);

	const createTemplate = async () => {
		if (isCreating) {
			return;
		}

		setIsCreating(true);

		try {
			const { slug, title } = generateUniqueSlugAndTitle(
				baseSlug,
				baseTitle,
				existingTemplates
			);

			const newTemplate = await saveEntityRecord(
				'postType',
				'wp_template_part',
				{
					slug,
					theme: currentTheme || 'theme',
					type: 'wp_template_part',
					area: templateArea,
					title: {
						raw: title,
						rendered: title,
					},
					content: '',
					status: 'publish',
				}
			);

			await invalidateResolution('getEntityRecords', [
				'postType',
				'wp_template_part',
				MEGAMENU_TEMPLATE_QUERY,
			]);

			if (!newTemplate?.id) {
				return;
			}

			onSuccess(newTemplate);

			if (onNavigateToEntityRecord) {
				onNavigateToEntityRecord({
					postType: 'wp_template_part',
					postId: newTemplate.id,
				});
				return;
			}

			const adminUrl = getAdminUrl ? getAdminUrl() : '/wp-admin/';
			const theme = encodeURIComponent(currentTheme || 'theme');
			const encodedSlug = encodeURIComponent(newTemplate.slug);
			const editUrl = `${adminUrl}site-editor.php?p=%2Fwp_template_part%2F${theme}%2F%2F${encodedSlug}&canvas=edit`;
			window.open(editUrl, '_blank', 'noopener,noreferrer');
		} finally {
			setIsCreating(false);
		}
	};

	return {
		createTemplate,
		isCreating,
	};
}
