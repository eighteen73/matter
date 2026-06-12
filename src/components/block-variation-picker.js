/**
 * WordPress dependencies
 */
import { useDispatch, useSelect } from '@wordpress/data';
import {
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalBlockVariationPicker as BlockVariationPicker,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	store as blocksStore,
	createBlocksFromInnerBlocksTemplate,
} from '@wordpress/blocks';

export default function BlockVariationPickerComponent({
	blockName,
	setAttributes,
	clientId,
	defaultTemplate = [],
}) {
	const { blockType, variations } = useSelect(
		(select) => {
			const { getBlockVariations, getBlockType } = select(blocksStore);
			return {
				blockType: getBlockType(blockName),
				variations: getBlockVariations(blockName, 'block'),
			};
		},
		[blockName]
	);

	const { replaceInnerBlocks } = useDispatch(blockEditorStore);

	return (
		<BlockVariationPicker
			icon={blockType?.icon?.src}
			label={blockType?.title}
			variations={variations}
			allowSkip={defaultTemplate.length > 0}
			onSelect={(nextVariation) => {
				if (!nextVariation) {
					if (defaultTemplate.length) {
						replaceInnerBlocks(
							clientId,
							createBlocksFromInnerBlocksTemplate(
								defaultTemplate
							),
							true
						);
					}
					return;
				}

				if (nextVariation.attributes) {
					setAttributes(nextVariation.attributes);
				}

				if (nextVariation.innerBlocks) {
					replaceInnerBlocks(
						clientId,
						createBlocksFromInnerBlocksTemplate(
							nextVariation.innerBlocks
						),
						true
					);
				}
			}}
		/>
	);
}
