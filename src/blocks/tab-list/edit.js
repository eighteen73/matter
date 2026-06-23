/**
 * External dependencies
 */
import clsx from 'clsx';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
	InspectorControls,
} from '@wordpress/block-editor';
import { useSelect, useDispatch } from '@wordpress/data';
import { useCallback, useEffect, useRef } from '@wordpress/element';
import ColorControl from '../../components/color-control';
import { getColorStyles, storeColorValue } from '../../utils/colors';
import { useEffectiveActiveTabIndex } from '../tabs/utils/use-effective-active-tab-index';

const EMPTY_ARRAY = [];

function Edit({ attributes, setAttributes, clientId, context }) {
	const { tabBackgroundColor, tabActiveColor } = attributes;

	const tabsList = context['matter/tabs-list'] || EMPTY_ARRAY;
	const collapses = context['matter/tabs-collapses'] || false;
	const collapsesOn = context['matter/tabs-collapsesOn'] || 'lg';
	const isQueryMode = context['matter/tabs-isQueryMode'] ?? false;
	const effectiveActiveIndex = useEffectiveActiveTabIndex(context);
	const colorStyles = getColorStyles(attributes, 'tabList');

	const { tabsClientId } = useSelect(
		(select) => {
			const { getBlockRootClientId } = select(blockEditorStore);

			return {
				tabsClientId: getBlockRootClientId(clientId),
			};
		},
		[clientId]
	);

	const { __unstableMarkNextChangeAsNotPersistent, updateBlockAttributes } =
		useDispatch(blockEditorStore);

	const handleSelectChange = useCallback(
		(event) => {
			const selectedIndex = parseInt(event.target.value, 10);

			if (Number.isNaN(selectedIndex) || !tabsClientId) {
				return;
			}

			if (selectedIndex !== effectiveActiveIndex) {
				__unstableMarkNextChangeAsNotPersistent();
				updateBlockAttributes(tabsClientId, {
					editorActiveTabIndex: selectedIndex,
				});
			}
		},
		[
			tabsClientId,
			effectiveActiveIndex,
			updateBlockAttributes,
			__unstableMarkNextChangeAsNotPersistent,
		]
	);

	const handleTabClick = useCallback(
		(index) => {
			if (!tabsClientId || index === effectiveActiveIndex) {
				return;
			}

			__unstableMarkNextChangeAsNotPersistent();
			updateBlockAttributes(tabsClientId, {
				editorActiveTabIndex: index,
			});
		},
		[
			tabsClientId,
			effectiveActiveIndex,
			updateBlockAttributes,
			__unstableMarkNextChangeAsNotPersistent,
		]
	);

	const menuRef = useRef();
	const prevTabCountRef = useRef(tabsList.length);

	useEffect(() => {
		const prevCount = prevTabCountRef.current;
		prevTabCountRef.current = tabsList.length;

		if (!menuRef.current || tabsList.length === prevCount) {
			return;
		}

		const focusButtonAt = (index) => {
			window.requestAnimationFrame(() => {
				const buttons = menuRef.current?.querySelectorAll(
					'.wp-block-matter-tab-button'
				);
				const target = buttons?.[index];
				if (!target) {
					return;
				}
				const richText = target.querySelector('[contenteditable]');
				if (richText) {
					richText.focus();
				} else {
					target.focus();
				}
			});
		};

		if (tabsList.length > prevCount) {
			focusButtonAt(tabsList.length - 1);
		} else {
			focusButtonAt(effectiveActiveIndex);
		}
	}, [tabsList.length, effectiveActiveIndex]);

	const blockProps = useBlockProps({
		className: clsx({
			'is-collapsible': collapses,
			[`is-collapsible-until-${collapsesOn}`]: collapses,
		}),
		style: colorStyles,
		...(collapses
			? {
					'data-collapses': 'true',
					'data-collapses-on': collapsesOn,
				}
			: {}),
	});

	const innerBlocksProps = useInnerBlocksProps(
		{
			className: 'wp-block-matter-tab-list__list',
			role: 'tablist',
			ref: menuRef,
		},
		{
			allowedBlocks: ['matter/tab-button'],
			templateLock: false,
			renderAppender: false,
			orientation: attributes.layout?.orientation ?? 'horizontal',
		}
	);

	const { children: innerBlocksChildren, ...listLayoutProps } =
		innerBlocksProps;

	const queryTabButtons = isQueryMode ? (
		<div {...listLayoutProps}>
			{tabsList.map((tab, index) => (
				<button
					key={tab.clientId || index}
					type="button"
					className={clsx('wp-block-matter-tab-button', {
						'is-active': effectiveActiveIndex === index,
					})}
					role="tab"
					aria-selected={effectiveActiveIndex === index}
					onClick={() => handleTabClick(index)}
				>
					<span className="wp-block-matter-tab-button__label">
						{tab.label || __('Tab title', 'matter')}
					</span>
				</button>
			))}
		</div>
	) : (
		<div {...innerBlocksProps}>{innerBlocksChildren}</div>
	);

	return (
		<>
			<InspectorControls group="color">
				<ColorControl
					label={__('Tab background', 'matter')}
					value={tabBackgroundColor}
					onChange={(value, slug) =>
						setAttributes({
							tabBackgroundColor: storeColorValue(slug, value),
						})
					}
					panelId={clientId}
				/>

				<ColorControl
					label={__('Tab active', 'matter')}
					value={tabActiveColor}
					onChange={(value, slug) =>
						setAttributes({
							tabActiveColor: storeColorValue(slug, value),
						})
					}
					panelId={clientId}
				/>
			</InspectorControls>

			<div {...blockProps}>
				{queryTabButtons}

				{collapses && (
					<select
						className="wp-block-matter-tab-list__select"
						aria-label={__('Select tab', 'matter')}
						value={String(effectiveActiveIndex)}
						onChange={handleSelectChange}
					>
						{tabsList.map((tab, index) => (
							<option key={tab.clientId || index} value={index}>
								{tab.label || __('Tab title', 'matter')}
							</option>
						))}
					</select>
				)}
			</div>
		</>
	);
}

export default Edit;
