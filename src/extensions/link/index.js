/**
 * Group link overlay extension.
 */

import { BlockControls } from '@wordpress/block-editor';

import { registerBlockExtension } from '../../utils/register-block-extension';
import clsx from 'clsx';

import LinkControl from '../../components/link-control';
import './style.scss';

const additionalAttributes = {
	url: {
		type: 'string',
	},
	linkDestination: {
		type: 'string',
	},
	linkTarget: {
		type: 'string',
	},
	rel: {
		type: 'string',
	},
	linkClass: {
		type: 'string',
	},
};

/**
 * @param {Object}   props
 * @param {Object}   props.attributes
 * @param {Function} props.setAttributes
 * @return {Element} The component.
 */
function BlockEdit(props) {
	const { attributes, setAttributes } = props;
	const { url, linkDestination, linkTarget, rel, linkClass } = attributes;

	return (
		<BlockControls group="block">
			<LinkControl
				url={url}
				linkDestination={linkDestination}
				linkTarget={linkTarget}
				rel={rel}
				linkClass={linkClass}
				setAttributes={setAttributes}
			/>
		</BlockControls>
	);
}

/**
 * @param {Object} attributes
 * @return {string} Generated string.
 */
function generateClassNames(attributes) {
	const { url, linkDestination, linkClass } = attributes;

	return clsx({
		'is-linked': !!url || linkDestination === 'post',
		'is-linked-to-post': linkDestination === 'post',
		[linkClass]: !!linkClass,
	});
}

registerBlockExtension(['core/group'], {
	extensionName: 'matter/link',
	attributes: additionalAttributes,
	classNameGenerator: generateClassNames,
	Edit: BlockEdit,
	order: 'after',
});
