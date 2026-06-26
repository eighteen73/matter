import {
	useBlockProps,
	useInnerBlocksProps,
	InnerBlocks,
} from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';

import './editor.scss';

const QUERY_ALLOWED_BLOCKS = ['core/query', 'woocommerce/product-collection'];

export default function Edit({ attributes, clientId }) {
	const { allowedBlocks } = attributes;

	const isSelected = useSelect(
		(select) => select('core/block-editor').isBlockSelected(clientId),
		[clientId]
	);

	const hasSelectedInnerBlock = useSelect(
		(select) =>
			select('core/block-editor').hasSelectedInnerBlock(clientId, true),
		[clientId]
	);

	const blockProps = useBlockProps({
		className: 'embla__viewport',
	});

	const isSingleInserterEnabled = allowedBlocks && allowedBlocks.length === 1;
	const isQueryOnlyViewport =
		isSingleInserterEnabled &&
		QUERY_ALLOWED_BLOCKS.includes(allowedBlocks[0]);

	const showAppender =
		isSelected &&
		!hasSelectedInnerBlock &&
		!isQueryOnlyViewport &&
		!isSingleInserterEnabled;

	const innerBlocksOptions = {
		orientation: 'horizontal',
		templateLock: false,
		allowedBlocks: isSingleInserterEnabled ? allowedBlocks : null,
		renderAppender: showAppender ? InnerBlocks.ButtonBlockAppender : false,
	};

	if (showAppender && isSingleInserterEnabled) {
		innerBlocksOptions.directInsert = true;
		innerBlocksOptions.defaultBlock = [allowedBlocks[0], {}];
	}

	const { children, ...innerBlocksProps } = useInnerBlocksProps(
		blockProps,
		innerBlocksOptions
	);

	return (
		<div {...innerBlocksProps}>
			<div className="embla__container">{children}</div>
		</div>
	);
}
