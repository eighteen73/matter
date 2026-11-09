/**
 * Archive content: the "Shows on" panel, choosing the archive an entry is for
 * (a post type archive, all terms of a taxonomy, one term, search or 404).
 */

/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import { ComboboxControl, ExternalLink } from '@wordpress/components';
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

const fetchTargets = (args) =>
	apiFetch({ path: addQueryArgs('/matter/v1/archive-targets', args) });

function ShowsOn() {
	const { isArchive, target } = useSelect((select) => {
		const editor = select(editorStore);

		return {
			isArchive: 'matter_archive' === editor.getCurrentPostType(),
			target: editor.getEditedPostAttribute('meta')?.[META] ?? '',
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
				help={__(
					'Type to find a category or other term. Child terms use this too, unless they have their own.',
					'matter'
				)}
			/>
			{selected?.url && (
				<p>
					<ExternalLink href={selected.url}>
						{__('View page', 'matter')}
					</ExternalLink>
				</p>
			)}
			<p className="components-base-control__help">
				{__(
					'The newest published entry for an archive shows. Schedule a new version to replace this one on a date; unpublish it to go back.',
					'matter'
				)}
			</p>
		</PluginDocumentSettingPanel>
	);
}

registerPlugin('matter-archive-shows-on', { render: ShowsOn });
