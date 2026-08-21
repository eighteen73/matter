/**
 * Icon library modal.
 *
 * Browses icons registered through the WordPress 7.1 icon API.
 * Collections become tabs; `value` / `onSelect` use `{collection}/{name}`
 * so this can later be swapped for a public core IconPickerModal.
 */

import { __ } from '@wordpress/i18n';
import {
	Button,
	Icon,
	Modal,
	SearchControl,
	Spinner,
	TabPanel,
} from '@wordpress/components';
import { chevronRight } from '@wordpress/icons';
import { store as coreStore } from '@wordpress/core-data';
import { useDebounce } from '@wordpress/compose';
import { useMemo, useState } from '@wordpress/element';
import { useSelect } from '@wordpress/data';

import { IconGrid } from './icon-grid';

/**
 * @param {Object}   props
 * @param {string}   props.value
 * @param {string}   [props.title]
 * @param {string}   [props.description]
 * @param {string}   [props.defaultCollection]
 * @param {Array}    [props.extraOptions]
 * @param {Function} props.onSelect
 * @param {Function} [props.onReset]
 * @param {string}   [props.resetValue]
 * @param {Function} props.onRequestClose
 * @return {Element} The component.
 */
export const IconLibraryModal = ({
	value,
	title,
	description,
	defaultCollection = 'matter',
	extraOptions,
	onSelect,
	onReset,
	resetValue = '',
	onRequestClose,
}) => {
	const [inputValue, setInputValue] = useState('');
	const [search, setSearch] = useState('');
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

	const tabs = useMemo(() => {
		const items = [
			{ name: '', title: __('All', 'matter') },
			...(collections ?? []).map((collection) => ({
				name: collection.slug,
				title: collection.label,
			})),
		];

		return items.map((tab) => ({
			...tab,
			title: (
				<>
					{tab.title}
					<Icon icon={chevronRight} />
				</>
			),
		}));
	}, [collections]);

	const initialTabName = value?.includes('/')
		? value.split('/')[0]
		: defaultCollection;

	return (
		<Modal
			className="matter-icon-library-modal"
			title={title || __('Icon Library', 'matter')}
			onRequestClose={onRequestClose}
			size="large"
		>
			{description && (
				<p className="matter-icon-library-modal__description">
					{description}
				</p>
			)}

			<div className="matter-icon-library-modal__toolbar">
				<SearchControl
					__nextHasNoMarginBottom
					value={inputValue}
					onChange={handleSearchChange}
				/>
				{onReset && (
					<Button
						variant="tertiary"
						onClick={() => {
							onReset(resetValue);
							onRequestClose();
						}}
					>
						{__('Reset Icon', 'matter')}
					</Button>
				)}
			</div>

			<TabPanel
				className="matter-icon-library-modal__tabs"
				tabs={tabs}
				initialTabName={
					tabs.some((tab) => tab.name === initialTabName)
						? initialTabName
						: ''
				}
			>
				{(tab) => (
					<IconLibraryPanel
						collection={tab.name}
						search={search}
						value={value}
						onSelect={(name) => {
							onSelect(name);
							onRequestClose();
						}}
						extraOptions={
							tab.name === defaultCollection || tab.name === ''
								? extraOptions
								: []
						}
					/>
				)}
			</TabPanel>
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

		if (search) {
			args.search = search;
		}

		return args;
	}, [collection, search]);

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

	const filteredExtras = useMemo(() => {
		const term = search.trim().toLowerCase();

		return (extraOptions || [])
			.filter(
				(option) => !term || option.label.toLowerCase().includes(term)
			)
			.map((option) => ({
				name: option.value,
				label: option.label,
				text: option.icon,
			}));
	}, [extraOptions, search]);

	if (!hasResolved) {
		return (
			<div className="matter-icon-library-modal__loading">
				<Spinner />
			</div>
		);
	}

	return (
		<IconGrid
			icons={[...(icons || []), ...filteredExtras]}
			value={value}
			onSelect={onSelect}
		/>
	);
};
