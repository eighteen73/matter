/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { Modal, SearchControl } from '@wordpress/components';
import { useState, useMemo, useCallback } from '@wordpress/element';
import { useDebounce } from '@wordpress/compose';

/**
 * Internal dependencies
 */
import IconGrid from './icon-grid';
import { normalizeSearchInput } from '../../utils/search-patterns';

/**
 * @param {Object}   props                  Component props.
 * @param {Array}    props.icons            Available icons.
 * @param {Function} props.setInserterOpen  Close modal callback.
 * @param {Object}   props.attributes       Block attributes.
 * @param {Function} props.setAttributes    Update block attributes.
 * @return {Element} Element to render.
 */
export default function IconInserterModal({
	icons = [],
	setInserterOpen,
	attributes,
	setAttributes,
}) {
	const [searchInput, setSearchInput] = useState('');
	const debouncedSetSearchInput = useDebounce(setSearchInput, 300);

	const setIcon = useCallback(
		(name) => {
			setAttributes({ icon: name });
			setInserterOpen(false);
		},
		[setAttributes, setInserterOpen]
	);

	const filteredIcons = useMemo(() => {
		if (searchInput) {
			const input = normalizeSearchInput(searchInput);
			return icons.filter((icon) => {
				const iconName = normalizeSearchInput(icon.name);
				const iconLabel = normalizeSearchInput(icon.label);

				return iconName.includes(input) || iconLabel.includes(input);
			});
		}

		return icons;
	}, [searchInput, icons]);

	return (
		<Modal
			className="wp-block-matter-icon__inserter"
			title={__('Select icon', 'matter')}
			onRequestClose={() => setInserterOpen(false)}
			isFullScreen
		>
			<div className="wp-block-matter-icon__inserter-header">
				<SearchControl
					__nextHasNoMarginBottom
					onChange={debouncedSetSearchInput}
					value={searchInput}
					label={__('Search', 'matter')}
					placeholder={__('Search icons…', 'matter')}
				/>
			</div>
			<IconGrid icons={filteredIcons} onChange={setIcon} attributes={attributes} />
		</Modal>
	);
}
