/**
 * WordPress dependencies
 */
import { getBlockDefaultClassName, getBlockType } from '@wordpress/blocks';
import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import { useMemo } from '@wordpress/element';

/**
 * Shared editor for every section block.
 *
 * Renders one locked `matter/slot` per slot declared in the section's
 * `supports.matter.slots`. templateLock "all" means changes to the declared
 * slots are applied to existing instances when they're next edited.
 *
 * @param {Object} props
 * @param {string} props.name Block name.
 * @return {Element} Section editor.
 */
export default function SectionEdit({ name }) {
	const { slots, align } = getBlockType(name)?.supports?.matter ?? {};

	const template = useMemo(
		() =>
			Object.keys(slots ?? {}).map((slot) => [
				'matter/slot',
				{ name: slot },
			]),
		[slots]
	);

	const blockProps = useBlockProps({
		className: ['is-section', align === 'full' && 'alignfull']
			.filter(Boolean)
			.join(' '),
	});

	// Same structure as the front end: wrapper > __inner > slots.
	const innerBlocksProps = useInnerBlocksProps(
		{ className: `${getBlockDefaultClassName(name)}__inner` },
		{
			allowedBlocks: ['matter/slot'],
			template,
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
