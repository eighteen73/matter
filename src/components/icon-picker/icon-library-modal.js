/**
 * Icon library modal, matching the core Icon block's inserter: a full-screen
 * modal with search and collections in a sidebar and a labelled icon grid.
 *
 * Icons come from the WordPress icon registry (core-data `root/icon`), limited
 * to the collections the theme allows (`matter_icon_collections`).
 */

/**
 * WordPress dependencies
 */
import {
	Button,
	Icon,
	Modal,
	SearchControl,
	Spinner,
} from '@wordpress/components';
import { useDebounce } from '@wordpress/compose';
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { chevronRight } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { IconGrid } from './icon-grid';
import { allowedCollections, useIcons } from './use-icons';

/**
 * @param {Object}   props
 * @param {string}   props.value          Selected icon name.
 * @param {string}   [props.title]        Modal title.
 * @param {Function} props.onSelect       Called with the chosen icon name.
 * @param {Function} [props.onRemove]     Remove the current icon (shows a button).
 * @param {Function} props.onRequestClose Close the modal.
 * @return {Element} Modal.
 */
export function IconLibraryModal({
	value,
	title,
	onSelect,
	onRemove,
	onRequestClose,
}) {
	const [inputValue, setInputValue] = useState('');
	const [search, setSearch] = useState('');
	const debouncedSetSearch = useDebounce(setSearch, 300);

	const allCollections = useSelect(
		(select) =>
			select(coreStore).getEntityRecords('root', 'iconCollection'),
		[]
	);
	const collections = useMemo(() => {
		const allowed = allowedCollections();

		return (allCollections ?? []).filter(
			({ slug }) => !allowed.length || allowed.includes(slug)
		);
	}, [allCollections]);

	// Start on the selected icon's collection, else the first theme collection.
	const [current, setCurrent] = useState(null);
	const valueCollection = value?.includes('/') ? value.split('/')[0] : null;
	const collection =
		current ??
		(
			collections.find(({ slug }) => slug === valueCollection) ??
			collections.find(({ slug }) => slug !== 'core') ??
			collections[0]
		)?.slug ??
		'';

	const tabs =
		collections.length > 1
			? [{ slug: '', label: __('All', 'matter') }, ...collections]
			: collections;

	return (
		<Modal
			className="wp-block-icon__inserter-modal matter-icon-library-modal"
			title={title || __('Icon library', 'matter')}
			onRequestClose={onRequestClose}
			isFullScreen
		>
			<div className="wp-block-icon__inserter">
				<div className="wp-block-icon__inserter-sidebar">
					<SearchControl
						__nextHasNoMarginBottom
						value={inputValue}
						onChange={(next) => {
							setInputValue(next);
							debouncedSetSearch(next);
						}}
					/>
					{tabs.length > 1 && (
						<div
							className="matter-icon-library-modal__collections"
							role="tablist"
							aria-orientation="vertical"
						>
							{tabs.map((tab) => {
								const isActive = collection === tab.slug;

								return (
									<Button
										key={tab.slug || 'all'}
										className={`matter-icon-library-modal__collection${
											isActive ? ' is-active' : ''
										}`}
										role="tab"
										aria-selected={isActive}
										onClick={() => setCurrent(tab.slug)}
									>
										{tab.label}
										<Icon icon={chevronRight} />
									</Button>
								);
							})}
						</div>
					)}
					{onRemove && (
						<Button
							variant="secondary"
							isDestructive
							__next40pxDefaultSize
							onClick={() => {
								onRemove();
								onRequestClose();
							}}
						>
							{__('Remove icon', 'matter')}
						</Button>
					)}
				</div>
				<div className="wp-block-icon__inserter-panel">
					<IconLibraryPanel
						collection={collection}
						search={search}
						value={value}
						onSelect={(name) => {
							onSelect(name);
							onRequestClose();
						}}
					/>
				</div>
			</div>
		</Modal>
	);
}

function IconLibraryPanel({ collection, search, value, onSelect }) {
	const icons = useIcons(collection);

	const filtered = useMemo(() => {
		const term = search.trim().toLowerCase();

		return (icons ?? []).filter(
			(icon) =>
				!term ||
				(icon.label || '').toLowerCase().includes(term) ||
				(icon.name || '').toLowerCase().includes(term)
		);
	}, [icons, search]);

	if (icons === null) {
		return (
			<div
				className="wp-block-icon__inserter-loading"
				role="status"
				aria-label={__('Loading…', 'matter')}
			>
				<Spinner />
			</div>
		);
	}

	return <IconGrid icons={filtered} value={value} onSelect={onSelect} />;
}
