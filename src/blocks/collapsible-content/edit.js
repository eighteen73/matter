import {
	BlockControls,
	InnerBlocks,
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { ToolbarButton, ToolbarGroup } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

import { useOpenParentOnSelection } from '../../utils/use-open-parent-on-selection';

import './editor.scss';

/**
 * @param {Object} props          Component props.
 * @param {Object} props.context  Block context.
 * @param {string} props.clientId Block client ID.
 * @return {Element} Element to render.
 */
export default function Edit({ context, clientId }) {
	const isOpen = !!context['matter/collapsible-is-open'];
	useOpenParentOnSelection(clientId, isOpen);
	const parentClientId = useSelect(
		(select) => select(blockEditorStore).getBlockRootClientId(clientId),
		[clientId]
	);
	const { updateBlockAttributes, __unstableMarkNextChangeAsNotPersistent } =
		useDispatch(blockEditorStore);
	const blockProps = useBlockProps({
		className: 'wp-block-matter-collapsible__content',
	});
	const { children, ...innerBlocksProps } = useInnerBlocksProps(blockProps, {
		renderAppender: InnerBlocks.ButtonBlockAppender,
		templateLock: false,
	});

	const closeEditorPreview = () => {
		if (!parentClientId) {
			return;
		}

		__unstableMarkNextChangeAsNotPersistent();
		updateBlockAttributes(parentClientId, {
			editorIsOpen: false,
		});
	};

	return (
		<>
			{isOpen && (
				<BlockControls>
					<ToolbarGroup>
						<ToolbarButton onClick={closeEditorPreview}>
							{__('Close collapsible', 'matter')}
						</ToolbarButton>
					</ToolbarGroup>
				</BlockControls>
			)}
			<div {...innerBlocksProps}>
				<div className="wp-block-matter-collapsible-content__container">
					{children}
				</div>
			</div>
		</>
	);
}
