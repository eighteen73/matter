/**
 * Column order: Layout control that follows the current editor viewport.
 */

import {
	InspectorControls,
	store as blockEditorStore,
	useBlockEditContext,
} from '@wordpress/block-editor';
import {
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControl as ToggleGroupControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
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

const ORDER_KEY_BY_DEVICE = {
	Desktop: 'default',
	Tablet: '@tablet',
	Mobile: '@mobile',
};

const AUTO_VALUE = 'auto';
const MAX_ORDER = 12;

const additionalAttributes = {
	columnOrder: {
		type: 'object',
	},
};

/**
 * @param {unknown} value Raw order value.
 * @return {boolean} Whether the value is a persistable order.
 */
function isPositiveOrder(value) {
	return Number.isInteger(value) && value > 0;
}

/**
 * @param {string} className Block className attribute.
 * @return {string} Class name without generated order utilities.
 */
function stripOrderClasses(className) {
	if (!className) {
		return '';
	}

	return className
		.split(/\s+/)
		.filter(
			(token) =>
				token &&
				token !== 'has-order-states' &&
				!/^is-order-(default|at-tablet|at-mobile)-\d+$/.test(token)
		)
		.join(' ');
}

/**
 * @param {string} deviceType Editor device type.
 * @return {string} Order object key.
 */
function getOrderKey(deviceType) {
	return ORDER_KEY_BY_DEVICE[deviceType] || 'default';
}

/**
 * @param {Object} attributes Block attributes.
 * @return {Object} Order values for default, tablet, and mobile.
 */
function getComputedOrder(attributes) {
	const { columnOrder } = attributes;

	if (!columnOrder || typeof columnOrder !== 'object') {
		return {};
	}

	return {
		default: columnOrder.default,
		'@tablet': columnOrder['@tablet'],
		'@mobile': columnOrder['@mobile'],
	};
}

/**
 * @param {Object} computed Computed order values.
 * @return {Object} Persistable order object.
 */
function getPersistedOrder(computed) {
	const next = {};

	if (isPositiveOrder(computed.default)) {
		next.default = computed.default;
	}

	if (isPositiveOrder(computed['@tablet'])) {
		next['@tablet'] = computed['@tablet'];
	}

	if (isPositiveOrder(computed['@mobile'])) {
		next['@mobile'] = computed['@mobile'];
	}

	return next;
}

/**
 * @param {Object} next Persistable order object.
 * @return {Object|undefined} Order attribute or unset.
 */
function toOrderAttribute(next) {
	return Object.keys(next).length ? next : undefined;
}

/**
 * @param {string}   className
 * @param {Function} setAttributes
 * @return {void}
 */
function useStripPersistedOrderClasses(className, setAttributes) {
	useEffect(() => {
		const cleaned = stripOrderClasses(className);

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
 * @return {Element|null} The component.
 */
function BlockEdit({ clientId: clientIdProp, attributes, setAttributes }) {
	useStripPersistedOrderClasses(attributes.className, setAttributes);

	const { clientId: contextClientId } = useBlockEditContext();
	const clientId = clientIdProp || contextClientId;

	const deviceType = useSelect((select) => {
		const editorSelect = select(editorStore);

		if (typeof editorSelect?.getDeviceType !== 'function') {
			return 'Desktop';
		}

		return editorSelect.getDeviceType() || 'Desktop';
	}, []);

	const columnCount = useSelect(
		(select) => {
			const { getBlockRootClientId, getBlock } = select(blockEditorStore);

			if (!clientId) {
				return 0;
			}

			const parent = getBlock(getBlockRootClientId(clientId));

			if (parent?.name !== 'core/columns') {
				return 0;
			}

			return parent.innerBlocks?.length || 0;
		},
		[clientId]
	);

	const itemCount = Math.min(MAX_ORDER, Math.max(0, columnCount));
	const columnOrder = attributes.columnOrder;

	useEffect(() => {
		if (itemCount < 2) {
			return;
		}

		const next = getPersistedOrder(getComputedOrder({ columnOrder }));
		let changed = false;

		['default', '@tablet', '@mobile'].forEach((key) => {
			if (isPositiveOrder(next[key]) && next[key] > itemCount) {
				next[key] = itemCount;
				changed = true;
			}
		});

		if (!changed) {
			return;
		}

		setAttributes({
			columnOrder: toOrderAttribute(next),
			className: stripOrderClasses(attributes.className) || undefined,
		});
	}, [attributes.className, columnOrder, itemCount, setAttributes]);

	if (itemCount < 1) {
		return null;
	}

	const orderKey = getOrderKey(deviceType);
	const computed = getComputedOrder(attributes);
	const viewportLabel = getViewportLabel(deviceType);

	const updateOrder = (value) => {
		const next = getPersistedOrder(computed);

		if (value === AUTO_VALUE) {
			delete next[orderKey];
		} else {
			const parsed = Number(value);

			if (isPositiveOrder(parsed)) {
				next[orderKey] = parsed;
			} else {
				delete next[orderKey];
			}
		}

		setAttributes({
			columnOrder: toOrderAttribute(next),
			className: stripOrderClasses(attributes.className) || undefined,
		});
	};

	return (
		<InspectorControls group="layout">
			<div className="matter-column-order-control">
				<ToggleGroupControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					isBlock
					label={__('Order', 'matter')}
					value={
						isPositiveOrder(computed[orderKey])
							? String(computed[orderKey])
							: AUTO_VALUE
					}
					onChange={updateOrder}
				>
					<ToggleGroupControlOption
						value={AUTO_VALUE}
						label={__('Auto', 'matter')}
					/>
					{Array.from(
						{ length: Math.max(itemCount, 1) },
						(_unused, index) => {
							const optionValue = String(index + 1);

							return (
								<ToggleGroupControlOption
									key={optionValue}
									value={optionValue}
									label={optionValue}
								/>
							);
						}
					)}
				</ToggleGroupControl>
			</div>
		</InspectorControls>
	);
}

/**
 * @param {Object} attributes Block attributes.
 * @return {string} Generated string.
 */
function generateClassNames(attributes) {
	const { columnOrder } = attributes;

	if (!columnOrder || typeof columnOrder !== 'object') {
		return '';
	}

	return clsx({
		'has-order-states': true,
		[`is-order-default-${columnOrder.default}`]: isPositiveOrder(
			columnOrder.default
		),
		[`is-order-at-tablet-${columnOrder['@tablet']}`]: isPositiveOrder(
			columnOrder['@tablet']
		),
		[`is-order-at-mobile-${columnOrder['@mobile']}`]: isPositiveOrder(
			columnOrder['@mobile']
		),
	});
}

/**
 * @param {string} className  Existing className.
 * @param {Object} attributes Block attributes.
 * @return {string|undefined} Class name with current order utilities.
 */
function applyOrderClassName(className, attributes) {
	return (
		clsx(stripOrderClasses(className), generateClassNames(attributes)) ||
		undefined
	);
}

registerBlockExtension(['core/column'], {
	extensionName: 'matter/order',
	attributes: additionalAttributes,
	classNameGenerator: generateClassNames,
	Edit: () => null,
	order: 'after',
});

const withColumnOrderControls = createHigherOrderComponent(
	(BlockEditComponent) => {
		return (props) => {
			if (props.name !== 'core/column') {
				return <BlockEditComponent {...props} />;
			}

			return (
				<>
					<BlockEditComponent {...props} />
					<BlockEdit {...props} />
				</>
			);
		};
	},
	'withColumnOrderControls'
);

addFilter(
	'editor.BlockEdit',
	'matter/order/inspector',
	withColumnOrderControls
);

const withStrippedPersistedOrderClasses = createHigherOrderComponent(
	(BlockList) => {
		return (props) => {
			if (props.name !== 'core/column') {
				return <BlockList {...props} />;
			}

			return (
				<BlockList
					{...props}
					className={applyOrderClassName(
						props.className,
						props.attributes
					)}
				/>
			);
		};
	},
	'withStrippedPersistedOrderClasses'
);

addFilter(
	'editor.BlockListBlock',
	'matter/order/strip-persisted-classes',
	withStrippedPersistedOrderClasses,
	20
);

addFilter(
	'blocks.getSaveContent.extraProps',
	'matter/order/strip-persisted-classes',
	(props, block, attributes) => {
		if (block.name !== 'core/column') {
			return props;
		}

		return {
			...props,
			className: applyOrderClassName(props.className, attributes),
		};
	},
	20
);
