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
	__experimentalVStack as VStack, // eslint-disable-line @wordpress/no-unsafe-wp-apis -- What core's document panels use for spacing.
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
import { rememberTarget } from './targets';

const META = '_matter_archive_target';
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

	useEffect(() => {
		if (!isArchive) {
			return;
		}

		let current = true;

		Promise.all([
			fetchTargets({ search }),
			target ? fetchTargets({ include: target }) : [],
		]).then(([found, selected]) => {
			if (!current) {
				return;
			}

			[...found, ...selected].forEach(rememberTarget);
			setOptions(
				[...selected, ...found].filter(
					(option, index, all) =>
						all.findIndex(({ value }) => value === option.value) ===
						index
				)
			);
		});

		return () => {
			current = false;
		};
	}, [isArchive, search, target]);

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
