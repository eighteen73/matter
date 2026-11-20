/**
 * "Add …" on the toolbar of a list of items and of everything inside it, so it
 * stays to hand while editing an item: "Add tab", "Add item", "Add card", and
 * a gallery's or carousel's own "Edit images" / "Add slide".
 *
 * The list is the nearest block above the selection (or the selection itself)
 * that holds one kind of item: it allows a single block type, or adds one
 * directly (its `defaultBlock` with `directInsert`: filters, which allow
 * other blocks between them), not a core one (core's lists, like Buttons,
 * have their own inserters), and a new one can be added (a locked slot
 * can't). Core blocks are never the list. A selected
 * section with one such slot (Cards' items) offers it too.
 */

/**
 * WordPress dependencies
 */
import {
	BlockControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { ToolbarButton, ToolbarGroup } from '@wordpress/components';
import { createBlock, getBlockType } from '@wordpress/blocks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useDispatch, useSelect } from '@wordpress/data';
import { addFilter } from '@wordpress/hooks';
import { __, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { queryBlocks } from '../../query-display/templates';
import { useAddSlide } from '../../carousel/editor/use-add-slide';
import {
	GalleryMediaUpload,
	useGalleryMedia,
} from '../../components/gallery-media';

// Lists with their own button, shown on the list's own toolbar by its edit.
const PARENTS = ['matter/gallery', 'matter/carousel'];

// Items whose button reads better than "Add {title}".
const LABELS = {
	'matter/accordion-item': () => __('Add item', 'matter'),
};

/**
 * The list a selected block belongs to, if any.
 *
 * @param {Function} select   Registry select.
 * @param {string}   clientId Selected block.
 * @return {Object|null} `{ id, name, item }`: the list and, for a list of one
 *                       kind of item, that item's block name.
 */
export function findList(select, clientId) {
	const {
		getBlockName,
		getBlockOrder,
		getBlockParents,
		getBlockListSettings,
		canInsertBlockType,
	} = select(blockEditorStore);

	// A list of one kind of item (not a core block, not of core blocks): the
	// one type it allows, or the one it adds directly.
	const asList = (id) => {
		const name = getBlockName(id) ?? '';
		const settings = getBlockListSettings(id);
		const allowed = settings?.allowedBlocks;
		let item = null;

		if (Array.isArray(allowed) && allowed.length === 1) {
			item = allowed[0];
		} else if (settings?.directInsert && settings?.defaultBlock?.name) {
			item = settings.defaultBlock.name;
		}

		return item &&
			!name.startsWith('core/') &&
			!item.startsWith('core/') &&
			canInsertBlockType(item, id)
			? { id, name, item }
			: null;
	};

	for (const id of [clientId, ...getBlockParents(clientId, true)]) {
		const name = getBlockName(id) ?? '';

		if (PARENTS.includes(name)) {
			// Selected itself: its edit shows the button.
			return id === clientId ? null : { id, name };
		}

		const list = asList(id);

		if (list) {
			return list;
		}

		// A selected section whose one list is a slot (Cards: its items).
		if (id === clientId) {
			const slots = getBlockOrder(id)
				.filter((child) => getBlockName(child) === 'matter/slot')
				.map(asList)
				.filter(Boolean);

			if (slots.length === 1) {
				return slots[0];
			}
		}
	}

	return null;
}

/**
 * "Add {item}" for a list of one kind of item.
 *
 * @param {Object} props
 * @param {string} props.listId List client ID.
 * @param {string} props.item   Item block name.
 * @return {Element} Toolbar controls.
 */
function AddItem({ listId, item }) {
	const count = useSelect(
		(select) => select(blockEditorStore).getBlockCount(listId),
		[listId]
	);
	const { insertBlock } = useDispatch(blockEditorStore);
	const title = getBlockType(item)?.title ?? '';
	const name = title.charAt(0).toLowerCase() + title.slice(1);
	const label =
		LABELS[item]?.() ??
		sprintf(
			/* translators: %s: item, e.g. "card". */
			__('Add %s', 'matter'),
			name
		);

	return (
		<BlockControls group="other">
			<ToolbarGroup className="matter-parent-toolbar">
				<ToolbarButton
					onClick={() =>
						insertBlock(createBlock(item), count, listId)
					}
				>
					{label}
				</ToolbarButton>
			</ToolbarGroup>
		</BlockControls>
	);
}

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
	if (queryBlocks().includes(lastSlide?.name)) {
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
	const list = useSelect((select) => findList(select, clientId), [clientId]);

	if (!list) {
		return null;
	}

	return list.item ? (
		<AddItem listId={list.id} item={list.item} />
	) : (
		<ParentToolbar parentId={list.id} parentName={list.name} />
	);
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
