/**
 * WordPress dependencies
 */
import {
	getBlockDefaultClassName,
	getBlockType,
	store as blocksStore,
} from '@wordpress/blocks';
import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import useSlots from './use-slots';

/**
 * Shared editor for every section block.
 *
 * Holds one locked `matter/slot` per slot declared in the section's
 * `supports.matter.slots`, kept in step by name (useSlots), so declared slots
 * can be added, reordered, renamed (`previously`) or removed without losing
 * content.
 *
 * A section in its default variant gets that variant's class
 * (`is-style-default`), as on the front end (Sections), though core saves none.
 *
 * @param {Object} props
 * @param {string} props.name       Block name.
 * @param {string} props.clientId   Block client ID.
 * @param {Object} props.attributes Block attributes.
 * @return {Element} Section editor.
 */
export default function SectionEdit({ name, clientId, attributes }) {
	const { align } = getBlockType(name)?.supports?.matter ?? {};
	const defaultVariant = useSelect(
		(select) =>
			select(blocksStore)
				.getBlockStyles(name)
				?.find((style) => style.isDefault)?.name,
		[name]
	);
	const hasVariant = /(?:^|\s)is-style-/.test(attributes?.className ?? '');

	useSlots(clientId, name);

	const blockProps = useBlockProps({
		className: [
			'is-section',
			align === 'full' && 'alignfull',
			defaultVariant && !hasVariant && `is-style-${defaultVariant}`,
		]
			.filter(Boolean)
			.join(' '),
	});

	// Same structure as the front end: wrapper > __inner > slots. No
	// template: core's template sync matches by position, so useSlots
	// manages the slots instead. templateLock stops them being moved or
	// removed by hand.
	const innerBlocksProps = useInnerBlocksProps(
		{ className: `${getBlockDefaultClassName(name)}__inner` },
		{
			allowedBlocks: ['matter/slot'],
			templateLock: 'all',
			renderAppender: false,
		}
	);

	return (
		<div {...blockProps}>
			<div {...innerBlocksProps} />
		</div>
	);
}
