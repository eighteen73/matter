/**
 * WordPress Imports
 */
import { createBlock } from '@wordpress/blocks';
import { Button } from '@wordpress/components';
import { withSelect, withDispatch } from '@wordpress/data';
import { compose } from '@wordpress/compose';

/**
 * Custom Appender meant to be used when there is only one type of block that can be inserted to an InnerBlocks instance.
 *
 * @param {Object}   props
 * @param {Function} props.onClick
 * @param {Function} props.onClickAfter
 * @param {string}   props.clientId
 * @param {Array}    props.allowedBlock
 * @param {Array}    props.innerBlocks
 * @param {boolean}  props.isEnabled
 */
const SingleBlockTypeAppender = ({
	onClick,
	onClickAfter,
	clientId,
	allowedBlock,
	innerBlocks,
	isEnabled = true,
	...props
}) => {
	if (isEnabled) {
		return <Button onClick={() => onClick(onClickAfter)} {...props} />;
	}
};

export default compose([
	withSelect((select, ownProps) => {
		return {
			innerBlocks: select('core/block-editor').getBlock(ownProps.clientId)
				.innerBlocks,
		};
	}),
	withDispatch((dispatch, ownProps) => {
		return {
			onClick(onClickAfter) {
				const newBlock = createBlock(ownProps.allowedBlock);
				dispatch('core/block-editor')
					.insertBlock(
						newBlock,
						ownProps.innerBlocks.length,
						ownProps.clientId
					)
					.then(() => {
						onClickAfter();
					});
			},
		};
	}),
])(SingleBlockTypeAppender);
