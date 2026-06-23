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
import { useMemo, useCallback, useEffect, useRef } from '@wordpress/element';
import ColorControl from '../../components/color-control';
import { getColorStyles, storeColorValue } from '../../utils/colors';

const EMPTY_ARRAY = [];

function Edit({ attributes, setAttributes, clientId, context }) {
	const { tabBackgroundColor, tabActiveColor } = attributes;

	const tabsList = context['matter/tabs-list'] || EMPTY_ARRAY;
	const collapses = context['matter/tabs-collapses'] || false;
	const collapsesOn = context['matter/tabs-collapsesOn'] || 'lg';
	const colorStyles = getColorStyles(attributes, 'tabList');

	const { tabsClientId, editorActiveTabIndex, activeTabIndex } = useSelect(
		(select) => {
			const { getBlockRootClientId, getBlockAttributes } =
				select(blockEditorStore);

			const _tabsClientId = getBlockRootClientId(clientId);
			const tabsAttributes = _tabsClientId
				? getBlockAttributes(_tabsClientId)
				: {};

			return {
				tabsClientId: _tabsClientId,
				editorActiveTabIndex: tabsAttributes?.editorActiveTabIndex,
				activeTabIndex: tabsAttributes?.activeTabIndex ?? 0,
			};
		},
		[clientId]
	);

	const effectiveActiveIndex = useMemo(() => {
		return editorActiveTabIndex ?? activeTabIndex;
	}, [editorActiveTabIndex, activeTabIndex]);

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
				<div {...innerBlocksProps} />

				{collapses && (
					<select
						className="wp-block-matter-tab-list__select"
						aria-label={__('Select tab', 'matter')}
						value={String(effectiveActiveIndex)}
						onChange={handleSelectChange}
					>
						{tabsList.map((tab, index) => (
							<option key={tab.clientId || index} value={index}>
								{tab.label || __('Tab title')}
							</option>
						))}
					</select>
				)}
			</div>
		</>
	);
}

export default Edit;
