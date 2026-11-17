/**
 * A block showing the archive's title or description (bound to
 * `matter/archive`) can't be typed into: its sidebar says where the text
 * comes from and links there ("Edit the category").
 */

/**
 * WordPress dependencies
 */
import { InspectorControls } from '@wordpress/block-editor';
import { ExternalLink, PanelBody } from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useSelect } from '@wordpress/data';
import { store as editorStore } from '@wordpress/editor';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { getTarget } from './targets';

const isBound = (attributes) =>
	Object.values(attributes?.metadata?.bindings ?? {}).some(
		(binding) => 'matter/archive' === binding?.source
	);

function SourceNotice() {
	const source = useSelect(
		(select) =>
			getTarget(
				select(editorStore).getEditedPostAttribute('meta')
					?._matter_archive_target ?? ''
			)?.source,
		[]
	);

	if (!source?.text) {
		return null;
	}

	return (
		<InspectorControls>
			<PanelBody title={__('Where this text comes from', 'matter')}>
				<p>{source.text}</p>
				{source.link && (
					<ExternalLink href={source.link}>
						{source.linkText}
					</ExternalLink>
				)}
			</PanelBody>
		</InspectorControls>
	);
}

addFilter(
	'editor.BlockEdit',
	'matter/archives/bound-source',
	createHigherOrderComponent(
		(BlockEdit) => (props) =>
			props.isSelected && isBound(props.attributes) ? (
				<>
					<BlockEdit {...props} />
					<SourceNotice />
				</>
			) : (
				<BlockEdit {...props} />
			),
		'withArchiveSource'
	)
);
