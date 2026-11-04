/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	store as blockEditorStore,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useContext, useEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { IconControl } from '../../components/icon-picker';
import { ActiveTabContext } from '../tabs/context';

const TEMPLATE = [
	['core/paragraph', { placeholder: __('Tab content…', 'matter') }],
];

export default function Edit({ attributes, setAttributes, clientId }) {
	const { activeId, setActiveId } = useContext(ActiveTabContext);

	// Selecting this tab (or anything in it), e.g. from List View, shows it.
	const { isSelected, isQueryItem } = useSelect(
		(select) => {
			const {
				hasSelectedInnerBlock,
				isBlockSelected,
				getBlockRootClientId,
				getBlockName,
			} = select(blockEditorStore);

			return {
				isSelected:
					hasSelectedInnerBlock(clientId, true) ||
					isBlockSelected(clientId),
				isQueryItem:
					getBlockName(getBlockRootClientId(clientId)) ===
					'core/post-template',
			};
		},
		[clientId]
	);

	// Only when the selection moves here, so clicking another tab's label
	// isn't immediately overridden while this one stays selected.
	const wasSelected = useRef(isSelected);

	useEffect(() => {
		if (isSelected && !wasSelected.current && activeId !== null) {
			setActiveId(clientId);
		}

		wasSelected.current = isSelected;
	}, [isSelected, activeId, clientId, setActiveId]);

	const blockProps = useBlockProps({
		className:
			activeId !== null && activeId !== clientId
				? 'is-inactive-tab'
				: undefined,
	});
	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		template: TEMPLATE,
	});

	return (
		<>
			{/* A query's tabs have no editable label row: choose the icon here. */}
			{isQueryItem && (
				<InspectorControls>
					<PanelBody title={__('Settings', 'matter')}>
						<IconControl
							label={__('Icon', 'matter')}
							value={attributes.icon}
							onChange={(icon) =>
								setAttributes({ icon: icon ?? '' })
							}
						/>
					</PanelBody>
				</InspectorControls>
			)}
			<div {...innerBlocksProps} />
		</>
	);
}
