/**
 * Columns reverse: Layout toggle that follows the current editor viewport.
 */

import { InspectorControls } from '@wordpress/block-editor';
import {
	ToggleControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useSelect } from '@wordpress/data';
import { store as editorStore } from '@wordpress/editor';
import { useEffect } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

import { registerBlockExtension } from '../../utils/register-block-extension';
import clsx from 'clsx';

import './editor.scss';

const REVERSE_KEY_BY_DEVICE = {
	Desktop: 'default',
	Tablet: '@tablet',
	Mobile: '@mobile',
};

const REVERSE_CLASSES = [
	'has-reversed-states',
	'is-reversed-default',
	'is-not-reversed-default',
	'is-reversed-at-tablet',
	'is-not-reversed-at-tablet',
	'is-reversed-at-mobile',
	'is-not-reversed-at-mobile',
];

const additionalAttributes = {
	reversed: {
		type: 'object',
	},
};

/**
 * @param {string} className Block className attribute.
 * @return {string} Class name without generated reverse utilities.
 */
function stripReverseClasses(className) {
	if (!className) {
		return '';
	}

	return className
		.split(/\s+/)
		.filter((token) => token && !REVERSE_CLASSES.includes(token))
		.join(' ');
}

/**
 * @param {string} deviceType Editor device type.
 * @return {string} Reverse object key.
 */
function getReverseKey(deviceType) {
	return REVERSE_KEY_BY_DEVICE[deviceType] || 'default';
}

/**
 * Resolve reverse flags. Untouched columns are not reversed at any viewport.
 *
 * @param {Object} attributes Block attributes.
 * @return {Object} Resolved reverse flags for default, tablet, and mobile.
 */
function getComputedReversed(attributes) {
	const { reversed } = attributes;

	if (reversed && typeof reversed === 'object') {
		return {
			default: reversed.default === true,
			'@tablet': reversed['@tablet'],
			'@mobile': reversed['@mobile'],
		};
	}

	return {
		default: false,
		'@tablet': undefined,
		'@mobile': undefined,
	};
}

/**
 * @param {Object} computed Computed reverse flags.
 * @param {string} key      Reverse object key.
 * @return {boolean} Whether columns reverse at this viewport.
 */
function isReversedAtKey(computed, key) {
	if (key === 'default') {
		return computed.default === true;
	}

	if (computed[key] === true) {
		return true;
	}

	if (computed[key] === false) {
		return false;
	}

	return computed.default === true;
}

/**
 * Remove reverse utilities that extraProps persisted onto className.
 *
 * @param {string}   className
 * @param {Function} setAttributes
 * @return {void}
 */
function useStripPersistedReverseClasses(className, setAttributes) {
	useEffect(() => {
		const cleaned = stripReverseClasses(className);

		if (cleaned === (className || '')) {
			return;
		}

		setAttributes({ className: cleaned || undefined });
	}, [className, setAttributes]);
}

/**
 * @param {Object}   props
 * @param {string}   props.clientId
 * @param {Object}   props.attributes
 * @param {Function} props.setAttributes
 * @return {Element} The component.
 */
function BlockEdit({ clientId, attributes, setAttributes }) {
	useStripPersistedReverseClasses(attributes.className, setAttributes);

	const deviceType = useSelect((select) => {
		const editorSelect = select(editorStore);

		if (typeof editorSelect?.getDeviceType !== 'function') {
			return 'Desktop';
		}

		return editorSelect.getDeviceType() || 'Desktop';
	}, []);

	const reverseKey = getReverseKey(deviceType);
	const computed = getComputedReversed(attributes);
	const checked = isReversedAtKey(computed, reverseKey);

	const updateReversed = (value) => {
		const next = {
			default: computed.default === true,
		};

		if (typeof computed['@tablet'] === 'boolean') {
			next['@tablet'] = computed['@tablet'];
		}

		if (typeof computed['@mobile'] === 'boolean') {
			next['@mobile'] = computed['@mobile'];
		}

		next[reverseKey] = value;

		setAttributes({
			reversed: next,
			className: stripReverseClasses(attributes.className) || undefined,
		});
	};

	const resetReversed = () => {
		setAttributes({
			reversed: undefined,
			className: stripReverseClasses(attributes.className) || undefined,
		});
	};

	return (
		<InspectorControls
			group="layout"
			resetAllFilter={(blockAttributes) => ({
				reversed: undefined,
				className:
					stripReverseClasses(blockAttributes.className) || undefined,
			})}
		>
			<ToolsPanelItem
				className="matter-columns-reverse-control"
				hasValue={() => !!attributes.reversed}
				isShownByDefault
				label={__('Reverse columns', 'matter')}
				panelId={clientId}
				onDeselect={resetReversed}
			>
				<ToggleControl
					__nextHasNoMarginBottom
					label={__('Reverse columns', 'matter')}
					checked={checked}
					onChange={updateReversed}
				/>
			</ToolsPanelItem>
		</InspectorControls>
	);
}

/**
 * @param {Object} attributes Block attributes.
 * @return {string} Generated string.
 */
function generateClassNames(attributes) {
	const { reversed } = attributes;

	if (!reversed || typeof reversed !== 'object') {
		return '';
	}

	return clsx({
		'has-reversed-states': true,
		'is-reversed-default': reversed.default === true,
		'is-not-reversed-default': reversed.default !== true,
		'is-reversed-at-tablet': reversed['@tablet'] === true,
		'is-not-reversed-at-tablet': reversed['@tablet'] === false,
		'is-reversed-at-mobile': reversed['@mobile'] === true,
		'is-not-reversed-at-mobile': reversed['@mobile'] === false,
	});
}

/**
 * @param {string} className  Existing className.
 * @param {Object} attributes Block attributes.
 * @return {string|undefined} Class name with current reverse utilities.
 */
function applyReverseClassName(className, attributes) {
	return (
		clsx(stripReverseClasses(className), generateClassNames(attributes)) ||
		undefined
	);
}

registerBlockExtension(['core/columns'], {
	extensionName: 'matter/reverse',
	attributes: additionalAttributes,
	classNameGenerator: generateClassNames,
	Edit: BlockEdit,
	order: 'after',
});

/**
 * extraProps persists generated classes onto className. Strip them first so
 * toggling off can actually drop is-reversed-default instead of stacking both.
 */
const withStrippedPersistedReverseClasses = createHigherOrderComponent(
	(BlockList) => {
		return (props) => {
			if (props.name !== 'core/columns') {
				return <BlockList {...props} />;
			}

			return (
				<BlockList
					{...props}
					className={applyReverseClassName(
						props.className,
						props.attributes
					)}
				/>
			);
		};
	},
	'withStrippedPersistedReverseClasses'
);

addFilter(
	'editor.BlockListBlock',
	'matter/reverse/strip-persisted-classes',
	withStrippedPersistedReverseClasses,
	20
);

addFilter(
	'blocks.getSaveContent.extraProps',
	'matter/reverse/strip-persisted-classes',
	(props, block, attributes) => {
		if (block.name !== 'core/columns') {
			return props;
		}

		return {
			...props,
			className: applyReverseClassName(props.className, attributes),
		};
	},
	20
);
