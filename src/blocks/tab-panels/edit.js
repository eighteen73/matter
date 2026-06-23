/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import { getColorStyles, storeColorValue } from '../../utils/colors';
import ColorControl from '../../components/color-control';

const TAB_PANELS_TEMPLATE = [['matter/tab-panel'], ['matter/tab-panel']];

export default function Edit({ attributes, setAttributes, clientId }) {
	const { tabPanelActiveColor } = attributes;

	const colorStyles = getColorStyles(attributes, 'tabPanel');

	const blockProps = useBlockProps({
		style: colorStyles,
	});

	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		template: TAB_PANELS_TEMPLATE,
		templateLock: false,
		renderAppender: false,
	});

	return (
		<>
			<InspectorControls group="color">
				<ColorControl
					label={__('Tab panel active', 'matter')}
					value={tabPanelActiveColor}
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
