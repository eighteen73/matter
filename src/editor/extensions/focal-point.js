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

/**
 * Internal dependencies
 */
import { validPoint } from './focal-point-value';

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

/**
 * The featured image block previews the post's focal point (an unsaved change
 * included, as the document panel edits the post's meta). A block's list
 * entry isn't given its context, but its edit component is, so the point goes
 * to the canvas as a custom property on the block (canvas.scss uses it).
 *
 * @param {Object} props Block edit props, and `BlockEdit`, the block's edit
 *                       component; `context` has the block's post.
 * @return {Element} The block.
 */
function FeaturedImageEdit(props) {
	const { BlockEdit, ...rest } = props;
	const { postId, postType } = rest.context ?? {};

	return (
		<>
			<BlockEdit {...rest} />
			{/* A template in the Site Editor has no post to read a point from. */}
			{postType && postId && (
				<FeaturedImagePoint
					clientId={rest.clientId}
					postId={postId}
					postType={postType}
				/>
			)}
		</>
	);
}

/**
 * The style that previews a post's focal point on its featured image block.
 *
 * @param {Object}        props          Props.
 * @param {string}        props.clientId Block client ID.
 * @param {number|string} props.postId   Post ID.
 * @param {string}        props.postType Post type.
 * @return {Element|null} The style, if the post has a point.
 */
function FeaturedImagePoint({ clientId, postId, postType }) {
	const [meta] = useEntityProp('postType', postType, 'meta', postId);
	const focalPoint = validPoint(meta?.[META_KEY]);

	if (!focalPoint) {
		return null;
	}

	// The image's position is set here, only for a post that has a point, so
	// a theme's own editor styles for the image are left alone otherwise.
	return (
		<style>
			{`[data-block="${clientId}"]{--image-focal-point:${toPosition(focalPoint)}}[data-block="${clientId}"] img{object-position:${toPosition(focalPoint)}}`}
		</style>
	);
}

addFilter(
	'editor.BlockEdit',
	'matter/focal-point/featured-image-preview',
	createHigherOrderComponent(
		(BlockEdit) => (props) =>
			props.name === 'core/post-featured-image' ? (
				<FeaturedImageEdit BlockEdit={BlockEdit} {...props} />
			) : (
				<BlockEdit {...props} />
			),
		'withFeaturedImageFocalPointPreview'
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

	// The Site Editor edits templates, which have no featured image.
	return postType && featuredImageUrl ? (
		<FeaturedImagePanel
			postType={postType}
			featuredImageUrl={featuredImageUrl}
		/>
	) : null;
}

function FeaturedImagePanel({ postType, featuredImageUrl }) {
	const [meta, setMeta] = useEntityProp('postType', postType, 'meta');

	if (!meta || typeof meta !== 'object' || !(META_KEY in meta)) {
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
				value={validPoint(meta[META_KEY]) ?? CENTRE}
				onChange={(value) => setMeta({ ...meta, [META_KEY]: value })}
				help={HELP}
			/>
		</PluginDocumentSettingPanel>
	);
}

registerPlugin('matter-featured-image-focal-point', {
	render: FeaturedImageFocalPoint,
});
