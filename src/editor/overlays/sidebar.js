/**
 * The Overlays sidebar: the modals and drawers being edited, to open one for
 * editing (it opens on the canvas as on the front end) or add one.
 * Collapsibles sit in the page, so aren't listed.
 */

/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';
import {
	Button,
	DropdownMenu,
	MenuGroup,
	MenuItem,
	PanelBody,
	Path,
	SVG,
} from '@wordpress/components';
import { useCopyToClipboard } from '@wordpress/compose';
import { useDispatch, useSelect } from '@wordpress/data';
import { PluginSidebar } from '@wordpress/editor';
import { __, sprintf } from '@wordpress/i18n';
import { moreVertical } from '@wordpress/icons';
import { registerPlugin } from '@wordpress/plugins';

/**
 * Internal dependencies
 */
import { getOverlay, getOverlayIds } from './utils';

const icon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path d="M18.5 4h-13A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 18.5 4Zm0 14.5h-13v-13h13v13ZM8 9h8v6H8V9Z" />
	</SVG>
);

const LISTED = ['matter/modal', 'matter/drawer'];

const ADDABLE = [
	['matter/modal', __('Add modal', 'matter')],
	['matter/drawer', __('Add drawer', 'matter')],
];

/**
 * How an overlay opens, besides links to it.
 *
 * @param {Object}  overlay            Overlay details.
 * @param {Object}  overlay.attributes Block attributes.
 * @param {boolean} overlay.hasTrigger It has a trigger on the page.
 * @return {string[]} Short notes.
 */
const opensWith = ({ attributes, hasTrigger }) =>
	[
		hasTrigger && __('Trigger on the page', 'matter'),
		attributes.openOnLoad && __('On page load', 'matter'),
		attributes.openOnScroll &&
			sprintf(
				/* translators: %d: percentage of the page */
				__('After scrolling %d%%', 'matter'),
				attributes.scrollThreshold
			),
		attributes.urlTriggers?.length && __('URL parameter', 'matter'),
	].filter(Boolean);

function OverlayItem({ clientId }) {
	const overlay = useSelect(
		(select) => getOverlay(select, clientId),
		[clientId]
	);
	const isEditing = useSelect(
		(select) => {
			const { isBlockSelected, hasSelectedInnerBlock } =
				select(blockEditorStore);

			return (
				isBlockSelected(clientId) ||
				hasSelectedInnerBlock(clientId, true)
			);
		},
		[clientId]
	);
	const { selectBlock, removeBlock } = useDispatch(blockEditorStore);
	const copyRef = useCopyToClipboard(`#${overlay?.id ?? ''}`);

	if (!overlay) {
		return null;
	}

	const notes = opensWith(overlay);

	return (
		<li
			className={`matter-overlays__item${isEditing ? ' is-editing' : ''}`}
		>
			<button
				type="button"
				className="matter-overlays__open"
				onClick={() => selectBlock(clientId)}
				aria-current={isEditing || undefined}
			>
				<span className="matter-overlays__title">{overlay.title}</span>
				<span className="matter-overlays__meta">
					{overlay.type} · #{overlay.id}
				</span>
				{notes.length > 0 && (
					<span className="matter-overlays__meta">
						{notes.join(', ')}
					</span>
				)}
			</button>
			<DropdownMenu
				icon={moreVertical}
				label={__('Options', 'matter')}
				size="small"
			>
				{({ onClose }) => (
					<MenuGroup>
						<MenuItem ref={copyRef} onClick={onClose}>
							{__('Copy link', 'matter')}
						</MenuItem>
						<MenuItem
							isDestructive
							onClick={() => {
								removeBlock(clientId, false);
								onClose();
							}}
						>
							{__('Delete', 'matter')}
						</MenuItem>
					</MenuGroup>
				)}
			</DropdownMenu>
		</li>
	);
}

function OverlaysSidebar() {
	const ids = useSelect((select) => getOverlayIds(select, LISTED), []);
	// Joined, so the selector returns a stable value.
	const canInsert = useSelect(
		(select) =>
			ADDABLE.filter(([name]) =>
				select(blockEditorStore).canInsertBlockType(name, '')
			)
				.map(([name]) => name)
				.join(','),
		[]
	);
	const blockCount = useSelect(
		(select) => select(blockEditorStore).getBlockCount(''),
		[]
	);
	const { insertBlock } = useDispatch(blockEditorStore);

	return (
		<PluginSidebar
			name="matter-overlays"
			title={__('Overlays', 'matter')}
			icon={icon}
		>
			<PanelBody>
				{ids.length > 0 ? (
					<ul className="matter-overlays">
						{ids.map((clientId) => (
							<OverlayItem key={clientId} clientId={clientId} />
						))}
					</ul>
				) : (
					<p className="matter-overlays__empty">
						{__('No modals or drawers here yet.', 'matter')}
					</p>
				)}
				<p className="components-base-control__help">
					{__(
						'Any button or link to an overlay opens it: search for its name when adding the link.',
						'matter'
					)}
				</p>
				{canInsert && (
					<div className="matter-overlays__add">
						{ADDABLE.filter(([name]) =>
							canInsert.split(',').includes(name)
						).map(([name, label]) => (
							<Button
								key={name}
								variant="secondary"
								__next40pxDefaultSize
								// At the end: where it sits doesn't matter, and
								// selecting it opens it.
								onClick={() =>
									insertBlock(createBlock(name), blockCount)
								}
							>
								{label}
							</Button>
						))}
					</div>
				)}
			</PanelBody>
		</PluginSidebar>
	);
}

registerPlugin('matter-overlays', { render: OverlaysSidebar });
