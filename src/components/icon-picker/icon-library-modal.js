/**
 * Icon library modal.
 *
 * Mirrors the WordPress 7.1 core Icon block inserter: fullscreen modal,
 * sidebar search and collections, labeled icon grid.
 */

import { __ } from '@wordpress/i18n';
import {
	Button,
	Icon,
	Modal,
	SearchControl,
	Spinner,
} from '@wordpress/components';
import { chevronRight } from '@wordpress/icons';
import { store as coreStore } from '@wordpress/core-data';
import { useDebounce } from '@wordpress/compose';
import { useMemo, useState } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import clsx from 'clsx';

import { IconGrid } from './icon-grid';

/**
 * @param {Array}  collections
 * @param {string} selectedCollection
 * @param {string} defaultCollection
 * @return {string} Collection slug.
 */
function getInitialCollectionSlug(
	collections,
	selectedCollection,
	defaultCollection
) {
	if (collections?.some(({ slug }) => slug === selectedCollection)) {
		return selectedCollection;
	}

	if (
		defaultCollection &&
		collections?.some(({ slug }) => slug === defaultCollection)
	) {
		return defaultCollection;
	}

	const themeCollection = collections?.find(
		({ slug }) => slug && slug !== 'core'
	);

	if (themeCollection) {
		return themeCollection.slug;
	}

	return collections?.[0]?.slug ?? '';
}

/**
 * @param {Object}   props
 * @param {string}   props.value
 * @param {string}   [props.title]
 * @param {string}   [props.description]
 * @param {string}   [props.defaultCollection]
 * @param {Array}    [props.extraOptions]
 * @param {Function} props.onSelect
 * @param {Function} props.onRequestClose
 * @return {Element} The component.
 */
export const IconLibraryModal = ({
	value,
	title,
	description,
	defaultCollection,
	extraOptions,
	onSelect,
	onRequestClose,
}) => {
	const [inputValue, setInputValue] = useState('');
	const [search, setSearch] = useState('');
	const [currentCollection, setCurrentCollection] = useState(null);
	const debouncedSetSearch = useDebounce(setSearch, 300);

	const handleSearchChange = (next) => {
		setInputValue(next);
		debouncedSetSearch(next);
	};

	const collections = useSelect(
		(select) =>
			select(coreStore).getEntityRecords('root', 'iconCollection'),
		[]
	);

	const selectedCollection = value?.includes('/')
		? value.split('/')[0]
		: null;

	const collectionSlug =
		currentCollection ??
		getInitialCollectionSlug(
			collections,
			selectedCollection,
			defaultCollection
		);

	const collectionTabs = useMemo(
		() => [
			{ slug: '', label: __('All', 'matter') },
			...(collections ?? []).map((collection) => ({
				slug: collection.slug,
				label: collection.label,
			})),
		],
		[collections]
	);

	return (
		<Modal
			className="wp-block-icon__inserter-modal matter-icon-library-modal"
			title={title || __('Icon library', 'matter')}
			onRequestClose={onRequestClose}
			isFullScreen
		>
			{description && (
				<p className="matter-icon-library-modal__description">
					{description}
				</p>
			)}

			<div className="wp-block-icon__inserter">
				<div className="wp-block-icon__inserter-sidebar">
					<SearchControl
						__nextHasNoMarginBottom
						value={inputValue}
						onChange={handleSearchChange}
					/>
					<div
						className="matter-icon-library-modal__collections"
						role="tablist"
						aria-orientation="vertical"
					>
						{collectionTabs.map((collection) => {
							const isActive = collectionSlug === collection.slug;

							return (
								<Button
									key={collection.slug || 'all'}
									className={clsx(
										'matter-icon-library-modal__collection',
										{
											'is-active': isActive,
										}
									)}
									role="tab"
									aria-selected={isActive}
									onClick={() =>
										setCurrentCollection(collection.slug)
									}
								>
									{collection.label}
									<Icon icon={chevronRight} />
								</Button>
							);
						})}
					</div>
				</div>

				<div className="wp-block-icon__inserter-panel">
					<IconLibraryPanel
						collection={collectionSlug}
						search={search}
						value={value}
						onSelect={(name) => {
							onSelect(name);
							onRequestClose();
						}}
						extraOptions={
							collectionSlug === '' ||
							(defaultCollection &&
								collectionSlug === defaultCollection)
								? extraOptions
								: []
						}
					/>
				</div>
			</div>
		</Modal>
	);
};

/**
 * @param {Object}   props
 * @param {string}   props.collection
 * @param {string}   props.search
 * @param {string}   props.value
 * @param {Function} props.onSelect
 * @param {Array}    [props.extraOptions]
 * @return {Element} The component.
 */
const IconLibraryPanel = ({
	collection,
	search,
	value,
	onSelect,
	extraOptions = [],
}) => {
	const query = useMemo(() => {
		const args = {};

		if (collection) {
			args.collection = collection;
		}

		return args;
	}, [collection]);

	const { icons, hasResolved } = useSelect(
		(select) => {
			const { getEntityRecords, hasFinishedResolution } =
				select(coreStore);

			return {
				icons: getEntityRecords('root', 'icon', query),
				hasResolved: hasFinishedResolution('getEntityRecords', [
					'root',
					'icon',
					query,
				]),
			};
		},
		[query]
	);

	const filteredIcons = useMemo(() => {
		const term = search.trim().toLowerCase();
		const extras = (extraOptions || [])
			.filter(
				(option) => !term || option.label.toLowerCase().includes(term)
			)
			.map((option) => ({
				name: option.value,
				label: option.label,
				text: option.icon,
			}));

		const fromApi = (icons || []).filter((icon) => {
			if (!term) {
				return true;
			}

			return (
				(icon.label || '').toLowerCase().includes(term) ||
				(icon.name || '').toLowerCase().includes(term)
			);
		});

		return [...fromApi, ...extras];
	}, [extraOptions, icons, search]);

	if (!hasResolved) {
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

	return <IconGrid icons={filteredIcons} value={value} onSelect={onSelect} />;
};
