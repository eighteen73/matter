/**
 * Archive content: the "Shows on" panel, choosing the archive an entry is for
 * (a post type archive, all terms of a taxonomy, one term, search or 404),
 * and whether it also shows on the archives below it (a category's
 * subcategories; a post type's category and tag pages) without their own.
 */

/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import {
	ComboboxControl,
	ExternalLink,
	ToggleControl,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import {
	PluginDocumentSettingPanel,
	store as editorStore,
} from '@wordpress/editor';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';
import { registerPlugin } from '@wordpress/plugins';

/**
 * Internal dependencies
 */
import { VStack } from '../../components/compat';
import { rememberTarget } from './targets';

const META = '_matter_archive_target';

// Wait for typing to pause before searching.
const SEARCH_DELAY = 300;
const CASCADE = '_matter_archive_cascade';

const fetchTargets = (args) =>
	apiFetch({ path: addQueryArgs('/matter/v1/archive-targets', args) });

function ShowsOn() {
	const { isArchive, target, cascade } = useSelect((select) => {
		const editor = select(editorStore);
		const meta = editor.getEditedPostAttribute('meta');

		return {
			isArchive: 'matter_archive' === editor.getCurrentPostType(),
			target: meta?.[META] ?? '',
			cascade: !!meta?.[CASCADE],
		};
	}, []);
	const { editPost } = useDispatch(editorStore);
	const [options, setOptions] = useState([]);
	const [search, setSearch] = useState('');

	// The chosen archive, fetched once per choice (not per keystroke).
	const [selectedOption, setSelectedOption] = useState([]);

	useEffect(() => {
		if (!isArchive || !target) {
			setSelectedOption([]);
			return;
		}

		let current = true;

		fetchTargets({ include: target })
			.then((selected) => {
				if (current) {
					selected.forEach(rememberTarget);
					setSelectedOption(selected);
				}
			})
			.catch(() => current && setSelectedOption([]));

		return () => {
			current = false;
		};
	}, [isArchive, target]);

	// Archives matching the search, once typing pauses.
	const [found, setFound] = useState([]);

	useEffect(() => {
		if (!isArchive) {
			return;
		}

		let current = true;
		const timer = setTimeout(
			() =>
				fetchTargets({ search })
					.then((results) => {
						if (current) {
							results.forEach(rememberTarget);
							setFound(results);
						}
					})
					// Keep the last results: the list just doesn't update.
					.catch(() => {}),
			search ? SEARCH_DELAY : 0
		);

		return () => {
			current = false;
			clearTimeout(timer);
		};
	}, [isArchive, search]);

	useEffect(
		() =>
			setOptions(
				[...selectedOption, ...found].filter(
					(option, index, all) =>
						all.findIndex(({ value }) => value === option.value) ===
						index
				)
			),
		[selectedOption, found]
	);

	if (!isArchive) {
		return null;
	}

	const selected = options.find(({ value }) => value === target);

	return (
		<PluginDocumentSettingPanel
			name="matter-archive-target"
			title={__('Shows on', 'matter')}
		>
			{/* Spaced like core's document panels (e.g. Summary). */}
			<VStack spacing={4}>
				<VStack spacing={2}>
					<ComboboxControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={__('Archive', 'matter')}
						hideLabelFromVision
						value={target || null}
						options={options}
						onFilterValueChange={setSearch}
						onChange={(value) =>
							editPost({ meta: { [META]: value ?? '' } })
						}
						help={__('Type to find a category or tag.', 'matter')}
					/>
					{selected?.url && (
						<ExternalLink href={selected.url}>
							{__('View archive', 'matter')}
						</ExternalLink>
					)}
				</VStack>
				{selected?.cascade && (
					<ToggleControl
						__nextHasNoMarginBottom
						label={selected.cascade}
						checked={cascade}
						onChange={(value) =>
							editPost({ meta: { [CASCADE]: value } })
						}
					/>
				)}
				<p
					className="components-base-control__help"
					style={{ margin: 0 }}
				>
					{__(
						'The newest published one shows. To swap it on a date, schedule a new version in Appearance › Archives.',
						'matter'
					)}
				</p>
			</VStack>
		</PluginDocumentSettingPanel>
	);
}

registerPlugin('matter-archive-shows-on', { render: ShowsOn });
