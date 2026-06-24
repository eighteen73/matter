/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useCallback, useEffect, useState } from '@wordpress/element';
import { ComboboxControl, Notice } from '@wordpress/components';

import OverlayTargetOption from './overlay-target-option';
import { filterOverlayTargetOptions } from '../utils/overlay-targets';

/**
 * @param {Object}   props               Component props.
 * @param {string}   props.value         Selected target ID.
 * @param {Function} props.onChange      Change handler.
 * @param {Array}    props.options       All overlay target options.
 * @param {boolean}  props.isResolving   Whether options are loading.
 * @param {boolean}  props.hasTargets    Whether any targets exist.
 * @param {boolean}  props.showPreviewUnavailableNotice Show preview unavailable notice.
 * @return {Element} Element to render.
 */
export default function OverlayTargetControl({
	value,
	onChange,
	options,
	isResolving,
	hasTargets,
	selectedMissing,
	showPreviewUnavailableNotice,
}) {
	const [filteredOptions, setFilteredOptions] = useState(options);
	const [filterValue, setFilterValue] = useState('');

	useEffect(() => {
		setFilteredOptions(filterOverlayTargetOptions(options, filterValue));
	}, [options, filterValue]);

	const handleFilterValueChange = useCallback(
		(inputValue) => {
			setFilterValue(inputValue);
			setFilteredOptions(filterOverlayTargetOptions(options, inputValue));
		},
		[options]
	);

	return (
		<>
			<ComboboxControl
				__next40pxDefaultSize
				label={__('Target', 'matter')}
				help={__(
					'Choose a modal, drawer, or collapsible block to open.',
					'matter'
				)}
				value={value || null}
				onChange={(nextValue) => onChange(nextValue || '')}
				options={filteredOptions}
				isLoading={isResolving}
				onFilterValueChange={handleFilterValueChange}
				__experimentalRenderItem={({ item }) => (
					<OverlayTargetOption item={item} />
				)}
			/>

			{!isResolving && !hasTargets && (
				<Notice status="warning" isDismissible={false}>
					{__(
						'No modal, drawer, or collapsible blocks were found on this page or in template parts.',
						'matter'
					)}
				</Notice>
			)}

			{selectedMissing && (
				<Notice status="warning" isDismissible={false}>
					{__(
						'The selected target could not be found. Choose another target or update the template part.',
						'matter'
					)}
				</Notice>
			)}
		</>
	);
}
