/**
 * Focal points for cropped images: core/image blocks (core's own `focalPoint`
 * attribute) and featured images (post meta). The front end sets object-position on the
 * <img>; the editor previews it via a CSS custom property (canvas.scss).
 */

/**
 * WordPress dependencies
 */
import { InspectorControls } from '@wordpress/block-editor';
import { FocalPointPicker, PanelBody } from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useEntityProp } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import {
	PluginDocumentSettingPanel,
	store as editorStore,
} from '@wordpress/editor';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';

const META_KEY = '_thumbnail_focal_point';
const CENTRE = { x: 0.5, y: 0.5 };

const toPosition = ({ x, y }) => `${x * 100}% ${y * 100}%`;

const HELP = __(
	'Choose which part of the image stays in view when it is cropped.',
	'matter'
);

addFilter(
	'editor.BlockEdit',
	'matter/focal-point/image-control',
	createHigherOrderComponent(
		(BlockEdit) => (props) => {
			// Core offers its own focal point for images with a scale set.
			if (
				props.name !== 'core/image' ||
				!props.attributes.url ||
				props.attributes.scale
			) {
				return <BlockEdit {...props} />;
			}

			const { url, focalPoint } = props.attributes;

			return (
				<>
					<BlockEdit {...props} />
					<InspectorControls>
						<PanelBody title={__('Focal point', 'matter')}>
							<FocalPointPicker
								__nextHasNoMarginBottom
								url={url}
								value={focalPoint ?? CENTRE}
								onChange={(value) =>
									props.setAttributes({ focalPoint: value })
								}
								help={HELP}
							/>
						</PanelBody>
					</InspectorControls>
				</>
			);
		},
		'withImageFocalPoint'
	)
);

addFilter(
	'editor.BlockListBlock',
	'matter/focal-point/image-preview',
	createHigherOrderComponent(
		(BlockListBlock) => (props) => {
			const { focalPoint } = props.attributes ?? {};

			if (props.name !== 'core/image' || !focalPoint) {
				return <BlockListBlock {...props} />;
			}

			return (
				<BlockListBlock
					{...props}
					wrapperProps={{
						...props.wrapperProps,
						style: {
							...props.wrapperProps?.style,
							'--image-focal-point': toPosition(focalPoint),
						},
					}}
				/>
			);
		},
		'withImageFocalPointPreview'
	)
);

function FeaturedImageFocalPoint() {
	const { postType, featuredImageUrl } = useSelect((select) => {
		const { getCurrentPostType, getEditedPostAttribute } =
			select(editorStore);
		const mediaId = getEditedPostAttribute('featured_media');

		return {
			postType: getCurrentPostType(),
			featuredImageUrl: mediaId
				? select('core').getMedia(mediaId)?.source_url
				: null,
		};
	}, []);
	const [meta, setMeta] = useEntityProp('postType', postType, 'meta');

	if (!featuredImageUrl || !meta || !(META_KEY in meta)) {
		return null;
	}

	return (
		<PluginDocumentSettingPanel
			name="matter-featured-image-focal-point"
			title={__('Featured image focal point', 'matter')}
		>
			<FocalPointPicker
				__nextHasNoMarginBottom
				url={featuredImageUrl}
				value={meta[META_KEY] ?? CENTRE}
				onChange={(value) => setMeta({ ...meta, [META_KEY]: value })}
				help={HELP}
			/>
		</PluginDocumentSettingPanel>
	);
}

registerPlugin('matter-featured-image-focal-point', {
	render: FeaturedImageFocalPoint,
});
