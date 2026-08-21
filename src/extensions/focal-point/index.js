/**
 * Featured image focal point document panel.
 */

import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { FocalPointPicker } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useEntityProp } from '@wordpress/core-data';
import { __ } from '@wordpress/i18n';

const PostFeaturedImageFocalPoint = () => {
	const postType = useSelect(
		(select) => select('core/editor').getCurrentPostType(),
		[]
	);

	const supportsThumbnail = useSelect(
		(select) => {
			const type = select('core').getPostType(postType);
			return type?.supports?.thumbnail === true;
		},
		[postType]
	);

	const [meta, setMeta] = useEntityProp('postType', postType, 'meta');

	const featuredImageId = useSelect(
		(select) =>
			select('core/editor').getEditedPostAttribute('featured_media'),
		[]
	);

	const featuredImageUrl = useSelect(
		(select) => {
			if (!featuredImageId) {
				return null;
			}
			const image = select('core').getEntityRecord(
				'postType',
				'attachment',
				featuredImageId
			);
			return image?.source_url;
		},
		[featuredImageId]
	);

	if (!supportsThumbnail || meta === undefined || meta === null) {
		return null;
	}

	const { _thumbnail_focal_point: focalPoint } = meta;

	const onChangeFocalPoint = (value) => {
		setMeta({
			...meta,
			_thumbnail_focal_point: value,
		});
	};

	return (
		<>
			{featuredImageUrl && (
				<PluginDocumentSettingPanel
					name="featured-image"
					title={__('Featured Image', 'matter')}
					className="featured-image"
				>
					<FocalPointPicker
						label={__('Focal Point', 'matter')}
						value={focalPoint || { x: 0.5, y: 0.5 }}
						url={featuredImageUrl}
						onChange={onChangeFocalPoint}
						__nextHasNoMarginBottom
					/>
				</PluginDocumentSettingPanel>
			)}
		</>
	);
};

registerPlugin('matter-focal-point', {
	render: PostFeaturedImageFocalPoint,
});
