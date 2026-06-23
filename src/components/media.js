import { BlockControls, InspectorControls } from '@wordpress/block-editor';
import { MediaToolbar, useMedia } from '@10up/block-components';
import { ImageControl } from '@humanmade/block-editor-components';
import { FocalPointPicker, PanelBody, Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function Media({
	mediaId,
	mediaType,
	focalPoint,
	posterId,
	videoClassName,
	imageClassName,
	setAttributes,
}) {
	const { media, hasResolvedMedia } = useMedia(mediaId);

	const focalPointStyle = {
		objectFit: 'cover',
		objectPosition: `${focalPoint?.x * 100}% ${focalPoint?.y * 100}%`,
	};

	let mediaContent = null;

	if (mediaId && !hasResolvedMedia) {
		mediaContent = <Spinner />;
	} else if (mediaId && mediaType === 'video') {
		mediaContent = (
			<video
				src={media?.source_url}
				playsInline
				muted
				className={videoClassName}
				style={focalPointStyle}
			/>
		);
	} else if (mediaId) {
		mediaContent = (
			<img
				src={media?.source_url}
				alt={media?.alt}
				className={imageClassName}
				style={focalPointStyle}
			/>
		);
	}

	return (
		<>
			<BlockControls>
				<MediaToolbar
					id={mediaId}
					onSelect={(selected) =>
						setAttributes({
							mediaId: selected.id,
							mediaType: selected.type,
						})
					}
					isOptional={true}
					onRemove={() =>
						setAttributes({ mediaId: null, mediaType: null })
					}
					labels={{
						add: __('Add Media', 'matter'),
						replace: __('Replace Media', 'matter'),
						remove: __('Remove Media', 'matter'),
					}}
				/>
			</BlockControls>

			{mediaId && (
				<InspectorControls>
					{mediaType === 'video' && (
						<PanelBody title={__('Poster')} initialOpen={true}>
							<ImageControl
								help={__(
									'The image to display while the video is loading.',
									'pulsar'
								)}
								value={posterId}
								onChange={(image) =>
									setAttributes({ posterId: image?.id })
								}
							/>
						</PanelBody>
					)}

					<PanelBody title={__('Focal Point')} initialOpen={false}>
						<FocalPointPicker
							url={media?.source_url}
							autoPlay={true}
							value={focalPoint}
							onChange={(value) =>
								setAttributes({ focalPoint: value })
							}
						/>
					</PanelBody>
				</InspectorControls>
			)}

			{mediaContent}
		</>
	);
}
