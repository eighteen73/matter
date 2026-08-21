/**
 * Columns stack: Layout toggle that follows the current editor viewport.
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
import { __, sprintf } from '@wordpress/i18n';

import { registerBlockExtension } from '../../utils/register-block-extension';
import clsx from 'clsx';

import './editor.scss';

const STACK_KEY_BY_DEVICE = {
	Desktop: 'default',
	Tablet: '@tablet',
	Mobile: '@mobile',
};

const STACK_CLASSES = [
	'has-stacked-states',
	'is-stacked-default',
	'is-not-stacked-default',
	'is-stacked-at-tablet',
	'is-not-stacked-at-tablet',
	'is-stacked-at-mobile',
	'is-not-stacked-at-mobile',
];

const additionalAttributes = {
	stacked: {
		type: 'object',
	},
};

/**
 * @param {string} className Block className attribute.
 * @return {string} Class name without generated stack utilities.
 */
function stripStackClasses(className) {
	if (!className) {
		return '';
	}

	return className
		.split(/\s+/)
		.filter((token) => token && !STACK_CLASSES.includes(token))
		.join(' ');
}

/**
 * @param {string} deviceType Editor device type.
 * @return {string} Stack object key.
 */
function getStackKey(deviceType) {
	return STACK_KEY_BY_DEVICE[deviceType] || 'default';
}

/**
 * Resolve stack flags. Untouched columns stack on mobile only.
 *
 * @param {Object} attributes Block attributes.
 * @return {Object} Resolved stack flags for default, tablet, and mobile.
 */
function getComputedStacked(attributes) {
	const { stacked, isStackedOnMobile } = attributes;

	if (stacked && typeof stacked === 'object') {
		return {
			default: stacked.default === true,
			'@tablet': stacked['@tablet'],
			'@mobile': stacked['@mobile'],
		};
	}

	const fromCore = isStackedOnMobile !== false;

	return {
		default: false,
		'@tablet': false,
		'@mobile': fromCore,
	};
}

/**
 * @param {Object} computed Computed stack flags.
 * @param {string} key      Stack object key.
 * @return {boolean} Whether columns stack at this viewport.
 */
function isStackedAtKey(computed, key) {
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
 * Hide core's Stack on mobile ToolsPanel item while Columns is selected.
 *
 * @return {void}
 */
function useHideCoreStackOnMobileControl() {
	useEffect(() => {
		// Match core Columns' unprefixed string so translated labels still hide.
		const label = __('Stack on mobile');

		const hide = () => {
			document
				.querySelectorAll(
					'.block-editor-block-inspector .components-tools-panel-item'
				)
				.forEach((item) => {
					const toggleLabel = item.querySelector(
						'.components-toggle-control__label'
					);

					if (toggleLabel?.textContent?.trim() === label) {
						item.hidden = true;
					}
				});
		};

		hide();

		const inspector = document.querySelector(
			'.block-editor-block-inspector'
		);

		if (!inspector) {
			return;
		}

		const { MutationObserver } = window;
		const observer = new MutationObserver(hide);
		observer.observe(inspector, { childList: true, subtree: true });

		return () => observer.disconnect();
	}, []);
}

/**
 * Remove stack utilities that extraProps persisted onto className.
 *
 * @param {string}   className
 * @param {Function} setAttributes
 * @return {void}
 */
function useStripPersistedStackClasses(className, setAttributes) {
	useEffect(() => {
		const cleaned = stripStackClasses(className);

		if (cleaned === (className || '')) {
			return;
		}

		setAttributes({ className: cleaned || undefined });
	}, [className, setAttributes]);
}

/**
 * @param {string} deviceType Editor device type.
 * @return {string} Translated viewport name.
 */
function getViewportLabel(deviceType) {
	if (deviceType === 'Tablet') {
		return __('Tablet', 'matter');
	}

	if (deviceType === 'Mobile') {
		return __('Mobile', 'matter');
	}

	return __('Desktop', 'matter');
}

/**
 * @param {Object}   props
 * @param {string}   props.clientId
 * @param {Object}   props.attributes
 * @param {Function} props.setAttributes
 * @return {Element} The component.
 */
function BlockEdit({ clientId, attributes, setAttributes }) {
	useHideCoreStackOnMobileControl();
	useStripPersistedStackClasses(attributes.className, setAttributes);

	const deviceType = useSelect((select) => {
		const editorSelect = select(editorStore);

		if (typeof editorSelect?.getDeviceType !== 'function') {
			return 'Desktop';
		}

		return editorSelect.getDeviceType() || 'Desktop';
	}, []);

	const stackKey = getStackKey(deviceType);
	const computed = getComputedStacked(attributes);
	const checked = isStackedAtKey(computed, stackKey);

	const viewportLabel = getViewportLabel(deviceType);

	const updateStacked = (value) => {
		const next = {
			default: computed.default === true,
		};

		if (typeof computed['@tablet'] === 'boolean') {
			next['@tablet'] = computed['@tablet'];
		}

		if (typeof computed['@mobile'] === 'boolean') {
			next['@mobile'] = computed['@mobile'];
		}

		next[stackKey] = value;

		setAttributes({
			stacked: next,
			isStackedOnMobile: false,
			className: stripStackClasses(attributes.className) || undefined,
		});
	};

	const resetStacked = () => {
		setAttributes({
			stacked: undefined,
			isStackedOnMobile: true,
			className: stripStackClasses(attributes.className) || undefined,
		});
	};

	return (
		<InspectorControls
			group="layout"
			resetAllFilter={(blockAttributes) => ({
				stacked: undefined,
				isStackedOnMobile: true,
				className:
					stripStackClasses(blockAttributes.className) || undefined,
			})}
		>
			<ToolsPanelItem
				className="matter-columns-stack-control"
				hasValue={() => !!attributes.stacked}
				isShownByDefault
				label={__('Stack columns', 'matter')}
				panelId={clientId}
				onDeselect={resetStacked}
			>
				<ToggleControl
					__nextHasNoMarginBottom
					label={__('Stack columns', 'matter')}
					checked={checked}
					onChange={updateStacked}
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
	const { stacked } = attributes;

	if (!stacked || typeof stacked !== 'object') {
		return '';
	}

	return clsx({
		'has-stacked-states': true,
		'is-stacked-default': stacked.default === true,
		'is-not-stacked-default': stacked.default !== true,
		'is-stacked-at-tablet': stacked['@tablet'] === true,
		'is-not-stacked-at-tablet': stacked['@tablet'] === false,
		'is-stacked-at-mobile': stacked['@mobile'] === true,
		'is-not-stacked-at-mobile': stacked['@mobile'] === false,
	});
}

/**
 * @param {string} className  Existing className.
 * @param {Object} attributes Block attributes.
 * @return {string|undefined} Class name with current stack utilities.
 */
function applyStackClassName(className, attributes) {
	return (
		clsx(stripStackClasses(className), generateClassNames(attributes)) ||
		undefined
	);
}

registerBlockExtension(['core/columns'], {
	extensionName: 'matter/stack',
	attributes: additionalAttributes,
	classNameGenerator: generateClassNames,
	Edit: BlockEdit,
	order: 'after',
});

/**
 * extraProps persists generated classes onto className. Strip them first so
 * toggling off can actually drop is-stacked-default instead of stacking both.
 */
const withStrippedPersistedStackClasses = createHigherOrderComponent(
	(BlockList) => {
		return (props) => {
			if (props.name !== 'core/columns') {
				return <BlockList {...props} />;
			}

			return (
				<BlockList
					{...props}
					className={applyStackClassName(
						props.className,
						props.attributes
					)}
				/>
			);
		};
	},
	'withStrippedPersistedStackClasses'
);

addFilter(
	'editor.BlockListBlock',
	'matter/stack/strip-persisted-classes',
	withStrippedPersistedStackClasses,
	20
);

addFilter(
	'blocks.getSaveContent.extraProps',
	'matter/stack/strip-persisted-classes',
	(props, block, attributes) => {
		if (block.name !== 'core/columns') {
			return props;
		}

		return {
			...props,
			className: applyStackClassName(props.className, attributes),
		};
	},
	20
);
