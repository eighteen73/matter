/**
 * Keeps a gallery's or carousel's own toolbar button ("Edit images", "Add
 * slide") on its children's toolbars, so it stays to hand while editing an
 * image or slide.
 */

/**
 * WordPress dependencies
 */
import {
	BlockControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { ToolbarButton, ToolbarGroup } from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useSelect } from '@wordpress/data';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { useAddSlide } from '../../carousel/editor/use-add-slide';
import {
	GalleryMediaUpload,
	useGalleryMedia,
} from '../../components/gallery-media';

const PARENTS = ['matter/gallery', 'matter/carousel'];

/**
 * @param {Object} props
 * @param {string} props.parentId   Gallery or carousel client ID.
 * @param {string} props.parentName Its block name.
 * @return {Element|null} Toolbar controls.
 */
function ParentToolbar({ parentId, parentName }) {
	const media = useGalleryMedia(parentId);
	const { lastSlide, addSlide } = useAddSlide(parentId);

	// A carousel of query results has no slides to manage here.
	if (lastSlide?.name === 'core/query') {
		return null;
	}

	const isImages = parentName === 'matter/gallery' || media.isImageOnly;

	return (
		<BlockControls group="other">
			<ToolbarGroup className="matter-parent-toolbar">
				{isImages ? (
					<GalleryMediaUpload
						ids={media.ids}
						onSelect={media.update}
						render={({ open, label }) => (
							<ToolbarButton onClick={open}>
								{label}
							</ToolbarButton>
						)}
					/>
				) : (
					<ToolbarButton onClick={addSlide}>
						{__('Add slide', 'matter')}
					</ToolbarButton>
				)}
			</ToolbarGroup>
		</BlockControls>
	);
}

function SelectedChild({ clientId }) {
	const { parentId, parentName } = useSelect(
		(select) => {
			const { getBlockRootClientId, getBlockName } =
				select(blockEditorStore);
			const rootId = getBlockRootClientId(clientId);

			return { parentId: rootId, parentName: getBlockName(rootId) };
		},
		[clientId]
	);

	if (!PARENTS.includes(parentName)) {
		return null;
	}

	return <ParentToolbar parentId={parentId} parentName={parentName} />;
}

addFilter(
	'editor.BlockEdit',
	'matter/parent-toolbar',
	createHigherOrderComponent(
		(BlockEdit) => (props) => (
			<>
				<BlockEdit {...props} />
				{props.isSelected && (
					<SelectedChild clientId={props.clientId} />
				)}
			</>
		),
		'withParentToolbar'
	)
);
