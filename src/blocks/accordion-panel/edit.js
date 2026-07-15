/**
 * WordPress dependencies
 */
import {
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import clsx from 'clsx';

const TEMPLATE = [
	[
		'core/paragraph',
		{
			placeholder: __('Type / to add content…', 'matter'),
		},
	],
];

const QUERY_TEMPLATE = [
	['core/post-featured-image', { isLink: true, aspectRatio: '16/9' }],
	['core/post-title'],
	['core/post-excerpt'],
];

export default function Edit({ attributes, clientId, context }) {
	const { templateLock } = attributes;
	const isQueryMode = context['matter/accordion-isQueryMode'] ?? false;
	const openByDefault = context['matter/accordion-open-by-default'] ?? false;

	const { isSelected } = useSelect(
		(select) => {
			const { isBlockSelected, hasSelectedInnerBlock, getBlockParents } =
				select(blockEditorStore);

			if (openByDefault || isQueryMode) {
				return { isSelected: true };
			}

			const parents = getBlockParents(clientId);
			const itemClientId = parents[parents.length - 1];
			const itemSelected =
				itemClientId &&
				(isBlockSelected(itemClientId) ||
					hasSelectedInnerBlock(itemClientId, true));

			return {
				isSelected:
					isBlockSelected(clientId) ||
					hasSelectedInnerBlock(clientId, true) ||
					!!itemSelected,
			};
		},
		[clientId, openByDefault, isQueryMode]
	);

	const blockProps = useBlockProps({
		role: 'region',
		className: clsx({
			'is-open': openByDefault || isSelected,
		}),
	});

	const { children, ...innerBlocksProps } = useInnerBlocksProps(blockProps, {
		template: isQueryMode ? QUERY_TEMPLATE : TEMPLATE,
		templateLock: templateLock || false,
		templateInsertUpdatesSelection: true,
	});

	return (
		<div {...innerBlocksProps}>
			<div className="wp-block-matter-accordion-panel__content">
				{children}
			</div>
		</div>
	);
}
