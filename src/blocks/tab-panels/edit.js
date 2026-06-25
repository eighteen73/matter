/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import { useMemo } from '@wordpress/element';

import { storeColorValue } from '../../utils/colors';
import { getBlockStyles } from '../../utils/block-styles';
import ColorControl from '../../components/color-control';

const TAB_PANELS_TEMPLATE = [['matter/tab-panel'], ['matter/tab-panel']];

export default function Edit({ attributes, setAttributes, clientId, context }) {
	const { tabPanelActiveColor } = attributes;
	const isQueryMode = context['matter/tabs-isQueryMode'] ?? false;

	const cssVarStyles = useMemo(
		() => getBlockStyles(attributes, 'tab-panel'),
		[attributes]
	);

	const blockProps = useBlockProps({
		style: {
			...cssVarStyles,
		},
	});

	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		...(isQueryMode ? {} : { template: TAB_PANELS_TEMPLATE }),
		allowedBlocks: isQueryMode ? ['core/query'] : ['matter/tab-panel'],
		templateLock: false,
		renderAppender: false,
	});

	return (
		<>
			<InspectorControls group="color">
				<ColorControl
					label={__('Tab panel active', 'matter')}
					value={tabPanelActiveColor}
					attributeName="tabPanelActiveColor"
					onChange={(value, slug) =>
						setAttributes({
							tabPanelActiveColor: storeColorValue(slug, value),
						})
					}
					panelId={clientId}
				/>
			</InspectorControls>

			<div {...innerBlocksProps} />
		</>
	);
}
