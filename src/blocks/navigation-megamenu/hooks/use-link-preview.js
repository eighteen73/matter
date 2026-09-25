/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { safeDecodeURI } from '@wordpress/url';

/**
 * Internal dependencies
 */
import { isHashLink, isRelativePath } from '../utils/link';

/**
 * Capitalize the first letter of a string.
 *
 * @param {string} value String to capitalize.
 * @return {string} Capitalized string.
 */
function capitalize(value) {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Whether a URL points to the site homepage.
 *
 * @param {string} url     URL to check.
 * @param {string} homeUrl WordPress site URL.
 * @return {boolean} True if the URL is the homepage.
 */
function isHomepage(url, homeUrl) {
	if (url === '/') {
		return true;
	}

	if (!url || !homeUrl) {
		return false;
	}

	try {
		const urlParsed = new URL(url, homeUrl);
		const homeParsed = new URL(homeUrl);

		if (urlParsed.hostname !== homeParsed.hostname) {
			return false;
		}

		const urlPath = urlParsed.pathname.replace(/\/$/, '');
		const homePath = homeParsed.pathname.replace(/\/$/, '');

		return urlPath === homePath;
	} catch {
		return false;
	}
}

/**
 * Strip the site URL for internal links.
 *
 * @param {Object} options         Options.
 * @param {string} options.linkUrl Link URL.
 * @param {string} options.homeUrl WordPress site URL.
 * @return {{displayUrl: string, isExternal: boolean}} Display URL and external flag.
 */
function computeDisplayUrl({ linkUrl, homeUrl } = {}) {
	if (!linkUrl) {
		return { displayUrl: '', isExternal: false };
	}

	let displayUrl = safeDecodeURI(linkUrl);
	let isExternal = false;

	if (isRelativePath(linkUrl) || isHashLink(linkUrl)) {
		return { displayUrl, isExternal: false };
	}

	try {
		const parsedUrl = new URL(linkUrl);
		const siteHost = new URL(homeUrl).host;

		if (parsedUrl.host === siteHost) {
			let path = parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
			if (path.endsWith('/') && path.length > 1) {
				path = path.slice(0, -1);
			}
			displayUrl = path;
		} else {
			isExternal = true;
		}
	} catch {
		isExternal = true;
	}

	return { displayUrl, isExternal };
}

/**
 * Compute badges for the link preview.
 *
 * @param {Object}  options                   Options.
 * @param {string}  options.url               Link URL.
 * @param {string}  options.homeUrl           WordPress site URL.
 * @param {string}  options.type              Entity type.
 * @param {boolean} options.isExternal        Whether the link is external.
 * @param {string}  options.entityStatus      Entity status.
 * @param {boolean} options.hasBinding        Whether the link has an entity binding.
 * @param {boolean} options.isEntityAvailable Whether the bound entity exists.
 * @return {Array<{label: string, intent: string}>} Badge list.
 */
function computeBadges({
	url,
	homeUrl,
	type,
	isExternal,
	entityStatus,
	hasBinding,
	isEntityAvailable,
}) {
	const badges = [];

	if (url) {
		if (isExternal) {
			badges.push({
				label: __('External link', 'matter'),
				intent: 'default',
			});
		} else if (isHashLink(url)) {
			badges.push({
				label: __('Internal link', 'matter'),
				intent: 'default',
			});
		} else if (isHomepage(url, homeUrl)) {
			badges.push({
				label: __('Homepage', 'matter'),
				intent: 'default',
			});
		} else if (type && type !== 'custom') {
			badges.push({ label: capitalize(type), intent: 'default' });
		} else {
			badges.push({
				label: __('Page', 'matter'),
				intent: 'default',
			});
		}
	}

	if (hasBinding && !isEntityAvailable) {
		badges.push({
			label: sprintf(
				/* translators: %s is the entity type (e.g., "page", "post", "category") */
				__('Missing %s', 'matter'),
				type
			),
			intent: 'error',
		});
	} else if (!url) {
		badges.push({
			label: __('No link selected', 'matter'),
			intent: 'error',
		});
	} else if (entityStatus) {
		const statusMap = {
			publish: { label: __('Published', 'matter'), intent: 'success' },
			future: { label: __('Scheduled', 'matter'), intent: 'warning' },
			draft: { label: __('Draft', 'matter'), intent: 'warning' },
			pending: { label: __('Pending', 'matter'), intent: 'warning' },
			private: { label: __('Private', 'matter'), intent: 'default' },
			trash: { label: __('Trash', 'matter'), intent: 'error' },
		};
		const badge = statusMap[entityStatus];
		if (badge) {
			badges.push(badge);
		}
	}

	return badges;
}

/**
 * Entity record display title.
 *
 * @param {Object} entityRecord Entity record.
 * @return {string|undefined} Display title.
 */
function getEntityTitle(entityRecord) {
	const title = entityRecord?.title;

	if (typeof title === 'string') {
		return title;
	}

	if (title && 'rendered' in title) {
		return title.rendered || __('(no title)', 'matter');
	}

	return entityRecord?.name;
}

/**
 * Load the linked entity for inspector preview, matching core navigation-link.
 *
 * @param {Object} attributes Block attributes.
 * @return {Object|null} Entity record.
 */
function useLinkedEntityRecord(attributes) {
	const { id, kind, type } = attributes;

	return useSelect(
		(select) => {
			if (!id) {
				return null;
			}

			const isPostType = kind === 'post-type' || !kind;
			const isTaxonomy = kind === 'taxonomy';

			if (!isPostType && !isTaxonomy) {
				return null;
			}

			const entityType = isTaxonomy ? 'taxonomy' : 'postType';
			const typeForAPI = type === 'tag' ? 'post_tag' : type || 'page';

			return select(coreStore).getEntityRecord(
				entityType,
				typeForAPI,
				id
			);
		},
		[id, kind, type]
	);
}

/**
 * Compute link preview data for the inspector LinkPicker.
 *
 * @see https://github.com/WordPress/gutenberg/blob/trunk/packages/block-library/src/navigation-link/shared/use-link-preview.js
 *
 * @param {Object}  options                     Options.
 * @param {string}  options.url                 Link URL.
 * @param {string}  options.type                Entity type.
 * @param {Object}  options.attributes          Block attributes.
 * @param {Object}  [options.entityRecord]      Optional preloaded entity record.
 * @param {boolean} [options.hasBinding]        Whether the link has an entity binding.
 * @param {boolean} [options.isEntityAvailable] Whether the bound entity exists.
 * @return {{title: string, url: string, image: string|null, badges: Array}} Preview data.
 */
export default function useLinkPreview({
	url,
	type,
	attributes = {},
	entityRecord: entityRecordProp,
	hasBinding = false,
	isEntityAvailable = true,
}) {
	const fetchedRecord = useLinkedEntityRecord(attributes);
	const entityRecord = entityRecordProp ?? fetchedRecord;

	const homeUrl = useSelect((select) => {
		return select(coreStore).getEntityRecord('root', '__unstableBase')
			?.home;
	}, []);

	const title = getEntityTitle(entityRecord);
	const { displayUrl, isExternal } = computeDisplayUrl({
		linkUrl: url,
		homeUrl,
	});

	const image = useSelect(
		(select) => {
			if (!entityRecord?.featured_media) {
				return null;
			}

			const media = select(coreStore).getEntityRecord(
				'postType',
				'attachment',
				entityRecord.featured_media
			);

			return (
				media?.media_details?.sizes?.thumbnail?.source_url ||
				media?.media_details?.sizes?.medium?.source_url ||
				media?.source_url ||
				null
			);
		},
		[entityRecord?.featured_media]
	);

	const badges = computeBadges({
		url,
		homeUrl,
		type,
		isExternal,
		entityStatus: entityRecord?.status,
		hasBinding,
		isEntityAvailable,
	});

	const displayTitle = url
		? title || safeDecodeURI(url)
		: __('Add link', 'matter');

	return {
		title: displayTitle,
		url: displayUrl,
		image,
		badges,
	};
}
