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
			<ComboboxControl
				__next40pxDefaultSize
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
			{selected?.cascade && (
				<ToggleControl
					__nextHasNoMarginBottom
					label={selected.cascade}
					help={__('Those without their own.', 'matter')}
					checked={cascade}
					onChange={(value) =>
						editPost({ meta: { [CASCADE]: value } })
					}
				/>
			)}
			{selected?.url && (
				<p>
					<ExternalLink href={selected.url}>
						{__('View archive', 'matter')}
					</ExternalLink>
				</p>
			)}
			<p className="components-base-control__help">
				{__(
					'If an archive has more than one, the newest published one shows. To replace this one on a date, use New version in Appearance › Archives and schedule it.',
					'matter'
				)}
			</p>
		</PluginDocumentSettingPanel>
	);
}

registerPlugin('matter-archive-shows-on', { render: ShowsOn });
