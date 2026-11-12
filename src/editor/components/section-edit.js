/**
 * WordPress dependencies
 */
import { getBlockDefaultClassName, getBlockType } from '@wordpress/blocks';
import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

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
 * @param {Object} props
 * @param {string} props.name     Block name.
 * @param {string} props.clientId Block client ID.
 * @return {Element} Section editor.
 */
export default function SectionEdit({ name, clientId }) {
	const { align } = getBlockType(name)?.supports?.matter ?? {};

	useSlots(clientId, name);

	const blockProps = useBlockProps({
		className: ['is-section', align === 'full' && 'alignfull']
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
