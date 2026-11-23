/**
 * Previous/next for a modal in a group, as on the front end: they open the
 * group's other modals (in page order, cycling) for editing.
 */

/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

/**
 * @param {Object} props
 * @param {string} props.clientId Modal client ID.
 * @param {string} props.group    Group name.
 * @return {Element} Group navigation.
 */
export default function GroupNav({ clientId, group }) {
	// Joined, so the selector returns a stable value.
	const members = useSelect(
		(select) => {
			const { getBlocksByName, getBlockAttributes } =
				select(blockEditorStore);

			return getBlocksByName('matter/modal')
				.filter((id) => getBlockAttributes(id)?.group === group)
				.join(',');
		},
		[group]
	).split(',');
	const { selectBlock } = useDispatch(blockEditorStore);
	const index = members.indexOf(clientId);
	const go = (offset) =>
		selectBlock(
			members[(index + offset + members.length) % members.length]
		);

	return (
		<nav
			className="wp-block-matter-modal__group-nav"
			aria-label={__('More in this group', 'matter')}
		>
			<button
				type="button"
				className="wp-block-matter-modal__previous"
				onClick={() => go(-1)}
			>
				<span className="screen-reader-text">
					{__('Previous', 'matter')}
				</span>
			</button>
			<span className="wp-block-matter-modal__position">
				{index + 1} / {members.length}
			</span>
			<button
				type="button"
				className="wp-block-matter-modal__next"
				onClick={() => go(1)}
			>
				<span className="screen-reader-text">
					{__('Next', 'matter')}
				</span>
			</button>
		</nav>
	);
}
