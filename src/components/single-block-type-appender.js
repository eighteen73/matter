/**
 * WordPress Imports
 */
import { createBlock } from '@wordpress/blocks';
import { Button } from '@wordpress/components';
import { withDispatch } from '@wordpress/data';
import { compose } from '@wordpress/compose';

/**
 * Custom Appender meant to be used when there is only one type of block that can be inserted to an InnerBlocks instance.
 *
 * @param {Object}       props
 * @param {Function}     props.onClick
 * @param {Function}     props.onClickAfter
 * @param {string|null}  props.clientId        Parent block to insert into.
 * @param {string|Array} props.allowedBlock    Block name (or array with one name).
 * @param {Object}       props.blockAttributes Attributes for the new block.
 * @param {boolean}      props.isEnabled
 */
const SingleBlockTypeAppender = ({
	onClick,
	onClickAfter,
	clientId,
	isEnabled = true,
	allowedBlock,
	blockAttributes,
	...props
}) => {
	if (!isEnabled || !clientId) {
		return null;
	}

	return <Button onClick={() => onClick(onClickAfter)} {...props} />;
};

export default compose([
	withDispatch((dispatch, ownProps, { select }) => {
		return {
			onClick(onClickAfter) {
				const blockName = Array.isArray(ownProps.allowedBlock)
					? ownProps.allowedBlock[0]
					: ownProps.allowedBlock;

				if (!blockName || !ownProps.clientId) {
					return;
				}

				const block = select('core/block-editor').getBlock(
					ownProps.clientId
				);
				const insertAt = block?.innerBlocks?.length ?? 0;
				const newBlock = createBlock(
					blockName,
					ownProps.blockAttributes ?? {}
				);

				dispatch('core/block-editor')
					.insertBlock(newBlock, insertAt, ownProps.clientId, false)
					.then(() => {
						if (typeof onClickAfter === 'function') {
							onClickAfter(insertAt);
						}
					});
			},
		};
	}),
])(SingleBlockTypeAppender);
