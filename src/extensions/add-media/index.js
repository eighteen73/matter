/**
 * Icon block custom SVG upload.
 */

import {
	BlockControls,
	MediaReplaceFlow,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import { ToolbarButton, ToolbarGroup } from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { store as coreStore } from '@wordpress/core-data';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';

import { registerBlockExtension } from '../../utils/register-block-extension';

import './style.scss';

const ALLOWED_MEDIA_TYPES = ['image/svg+xml'];
const SVG_MIME = 'image/svg+xml';
const MEDIA_ICON_PREFIX = 'matter-media/';
const LEGACY_MEDIA_ICON_PREFIX = 'pulsar-media/';

const additionalAttributes = {
	iconId: {
		type: 'number',
	},
};

/**
 * @param {number} iconId
 * @param {string} [existingIcon]
 * @return {string} Generated string.
 */
const getMediaIconName = (iconId, existingIcon) => {
	if (
		typeof existingIcon === 'string' &&
		existingIcon.startsWith(LEGACY_MEDIA_ICON_PREFIX)
	) {
		return `${LEGACY_MEDIA_ICON_PREFIX}${iconId}`;
	}

	return `${MEDIA_ICON_PREFIX}${iconId}`;
};

/**
 * @param {string} iconName
 * @return {boolean} Whether the condition is true.
 */
const isMediaIcon = (iconName) =>
	iconName.startsWith(MEDIA_ICON_PREFIX) ||
	iconName.startsWith(LEGACY_MEDIA_ICON_PREFIX);

/**
 * @param {Object} media
 * @return {boolean} Whether the condition is true.
 */
const isSvgMedia = (media) => {
	if (!media) {
		return false;
	}

	return (
		media.mime === SVG_MIME ||
		media.mime_type === SVG_MIME ||
		media.subtype === 'svg+xml' ||
		(typeof media.url === 'string' && media.url.endsWith('.svg')) ||
		(typeof media.source_url === 'string' &&
			media.source_url.endsWith('.svg'))
	);
};

/**
 * @param {Function} receiveEntityRecords
 * @param {number}   iconId
 * @param {string}   content
 * @param {string}   name
 */
const seedMediaIconEntity = (receiveEntityRecords, iconId, content, name) => {
	if (!iconId || !content || typeof receiveEntityRecords !== 'function') {
		return;
	}

	receiveEntityRecords(
		'root',
		'icon',
		[
			{
				name,
				label: __('Custom SVG', 'matter'),
				content,
			},
		],
		undefined,
		false
	);
};

/**
 * Keep registry icons and custom media mutually exclusive.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes
 * @param {Function} props.setAttributes
 * @return {null} Renderless plugin.
 */
const CustomIconSync = ({ attributes, setAttributes }) => {
	const { icon, iconId } = attributes;
	const { receiveEntityRecords } = useDispatch(coreStore);

	useEffect(() => {
		if (!iconId) {
			return;
		}

		const iconName = icon ? String(icon) : '';
		const isRegistryIcon = iconName !== '' && !isMediaIcon(iconName);

		if (isRegistryIcon) {
			setAttributes({ iconId: undefined });
			return;
		}

		const mediaIconName = getMediaIconName(iconId, iconName);

		if (iconName !== mediaIconName) {
			setAttributes({ icon: mediaIconName });
		}

		let cancelled = false;

		apiFetch({
			path: `/matter/v1/icon-svg/${iconId}`,
		})
			.then((response) => {
				if (cancelled || typeof response?.content !== 'string') {
					return;
				}
				seedMediaIconEntity(
					receiveEntityRecords,
					iconId,
					response.content,
					mediaIconName
				);
			})
			.catch(() => {});

		return () => {
			cancelled = true;
		};
	}, [icon, iconId, receiveEntityRecords, setAttributes]);

	return null;
};

/**
 * @param {Object}   props
 * @param {Object}   props.attributes
 * @param {Function} props.setAttributes
 * @return {Element} The component.
 */
const AddMediaEdit = (props) => {
	const { attributes, setAttributes } = props;
	const { iconId } = attributes;

	const { receiveEntityRecords } = useDispatch(coreStore);

	const media = useSelect(
		(select) => {
			if (!iconId) {
				return null;
			}

			return select(coreStore).getEntityRecord(
				'postType',
				'attachment',
				iconId,
				{ context: 'view' }
			);
		},
		[iconId]
	);

	const onSelectMedia = (selected) => {
		if (!isSvgMedia(selected)) {
			return;
		}

		const nextId = selected.id;
		const mediaIconName = getMediaIconName(nextId);

		setAttributes({
			iconId: nextId,
			icon: mediaIconName,
		});

		apiFetch({
			path: `/matter/v1/icon-svg/${nextId}`,
		})
			.then((response) => {
				if (typeof response?.content === 'string') {
					seedMediaIconEntity(
						receiveEntityRecords,
						nextId,
						response.content,
						mediaIconName
					);
				}
			})
			.catch(() => {});
	};

	const onRemoveMedia = () => {
		setAttributes({
			iconId: undefined,
			icon: undefined,
		});
	};

	return (
		<>
			<BlockControls group="other">
				<ToolbarGroup>
					<MediaUploadCheck>
						{iconId ? (
							<MediaReplaceFlow
								mediaId={iconId}
								mediaURL={media?.source_url}
								allowedTypes={ALLOWED_MEDIA_TYPES}
								accept={SVG_MIME}
								onSelect={onSelectMedia}
								onReset={onRemoveMedia}
								name={__('Edit custom icon', 'matter')}
							/>
						) : (
							<MediaUpload
								onSelect={onSelectMedia}
								allowedTypes={ALLOWED_MEDIA_TYPES}
								accept={SVG_MIME}
								value={iconId}
								render={({ open }) => (
									<ToolbarButton
										text={__('Custom icon', 'matter')}
										onClick={open}
									/>
								)}
							/>
						)}
					</MediaUploadCheck>
				</ToolbarGroup>
			</BlockControls>
		</>
	);
};

const withCustomIconSync = createHigherOrderComponent((BlockEdit) => {
	return (props) => {
		if (props.name !== 'core/icon') {
			return <BlockEdit {...props} />;
		}

		return (
			<>
				<BlockEdit {...props} />
				<CustomIconSync {...props} />
			</>
		);
	};
}, 'withCustomIconSync');

addFilter('editor.BlockEdit', 'matter/icon-add-media-sync', withCustomIconSync);

/**
 * @param {Object} attributes
 * @return {string|null} Generated string or null.
 */
function generateClassNames(attributes) {
	const { iconId } = attributes;

	if (!iconId) {
		return null;
	}

	return 'has-custom-icon';
}

registerBlockExtension(['core/icon'], {
	extensionName: 'matter/add-media',
	attributes: additionalAttributes,
	classNameGenerator: generateClassNames,
	Edit: AddMediaEdit,
});
