import {
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';
import { PanelBody, SelectControl, TextControl } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import { getConfigValue } from '../../utils/config';
import {
	AREA_BLOCK,
	NAVIGATION_BLOCK,
	TOGGLE_BLOCK,
	alwaysCollapsedTemplate,
	breakpointTemplate,
} from './templates';
import {
	EDITOR_MODE_CHANGE_EVENT,
	NavigationMenuEditorModeControls,
} from './editor-mode-controls';

const ALLOWED_BLOCKS = [AREA_BLOCK, TOGGLE_BLOCK];

function getBreakpointOptions() {
	const breakpoints = getConfigValue('breakpoints', 'breakpoints', {});
	const defaultSlug = getConfigValue('breakpoints', 'default', 'md');

	return {
		options: Object.entries(breakpoints).map(([slug, config]) => ({
			value: slug,
			label: config?.label || slug,
		})),
		defaultSlug,
	};
}

function createMenuArea(area) {
	return createBlock(AREA_BLOCK, { area }, [
		createBlock(NAVIGATION_BLOCK, {
			__unstableLocation: 'primary',
			type: area === 'desktop' ? 'simple' : 'drill-down',
			layout: {
				type: 'flex',
				orientation: area === 'desktop' ? 'horizontal' : 'vertical',
			},
		}),
	]);
}

function createMenuToggle(label) {
	return createBlock(TOGGLE_BLOCK, {
		label: label || __('Menu', 'matter'),
		showLabel: true,
	});
}

function getFirstBlockByArea(blocks, area) {
	return blocks.find(
		(block) => block.name === AREA_BLOCK && block.attributes?.area === area
	);
}

function getOrderedMenuChildren(blocks, collapseMode, toggleLabel) {
	const desktopBlock = getFirstBlockByArea(blocks, 'desktop');
	const collapsedBlock = getFirstBlockByArea(blocks, 'collapsed');
	const toggleBlock = blocks.find((block) => block.name === TOGGLE_BLOCK);
	const orderedBlocks = [];

	if (collapseMode === 'breakpoint') {
		orderedBlocks.push(desktopBlock || createMenuArea('desktop'));
	}

	orderedBlocks.push(toggleBlock || createMenuToggle(toggleLabel));
	orderedBlocks.push(collapsedBlock || createMenuArea('collapsed'));

	if (collapseMode === 'always' && desktopBlock) {
		orderedBlocks.push(desktopBlock);
	}

	return orderedBlocks;
}

function haveSameBlockOrder(currentBlocks, nextBlocks) {
	if (currentBlocks.length !== nextBlocks.length) {
		return false;
	}

	return currentBlocks.every(
		(block, index) => block.clientId === nextBlocks[index]?.clientId
	);
}

function useEnsureMenuChildren(clientId, collapseMode, toggleLabel) {
	const { replaceInnerBlocks } = useDispatch(blockEditorStore);
	const { getBlocks } = useSelect(
		(select) => ({
			getBlocks: select(blockEditorStore).getBlocks,
		}),
		[]
	);

	useEffect(() => {
		const blocks = getBlocks(clientId);
		const nextBlocks = getOrderedMenuChildren(
			blocks,
			collapseMode,
			toggleLabel
		);

		if (!haveSameBlockOrder(blocks, nextBlocks)) {
			replaceInnerBlocks(clientId, nextBlocks);
		}
	}, [clientId, collapseMode, getBlocks, replaceInnerBlocks, toggleLabel]);
}

export default function Edit({ attributes, setAttributes, clientId }) {
	const {
		collapseMode = 'breakpoint',
		navigationType = 'anchored',
		drawerPosition = 'right',
		breakpoint,
		toggleLabel,
		closeLabel,
	} = attributes;
	const [isEditingCollapsed, setIsEditingCollapsed] = useState(
		collapseMode === 'always'
	);
	const { options: breakpointOptions, defaultSlug } = useMemo(
		getBreakpointOptions,
		[]
	);

	useEnsureMenuChildren(clientId, collapseMode, toggleLabel);

	useEffect(() => {
		if (collapseMode === 'always') {
			setIsEditingCollapsed(true);
		}
	}, [collapseMode]);

	useEffect(() => {
		const handleEditorModeChange = (event) => {
			if (event.detail?.clientId !== clientId) {
				return;
			}

			setIsEditingCollapsed(!!event.detail.isEditingCollapsed);
		};

		document.addEventListener(
			EDITOR_MODE_CHANGE_EVENT,
			handleEditorModeChange
		);

		return () => {
			document.removeEventListener(
				EDITOR_MODE_CHANGE_EVENT,
				handleEditorModeChange
			);
		};
	}, [clientId]);

	const blockProps = useBlockProps({
		className: [
			`is-collapse-mode-${collapseMode}`,
			`is-navigation-type-${navigationType}`,
			navigationType === 'drawer'
				? `is-drawer-position-${drawerPosition}`
				: '',
			collapseMode === 'breakpoint' ? 'has-breakpoint-collapse' : '',
			isEditingCollapsed ? 'is-editing-collapsed' : '',
		]
			.filter(Boolean)
			.join(' '),
	});

	const innerBlocksProps = useInnerBlocksProps(
		{
			className: 'wp-block-matter-navigation-menu__areas',
		},
		{
			allowedBlocks: ALLOWED_BLOCKS,
			template:
				collapseMode === 'always'
					? alwaysCollapsedTemplate
					: breakpointTemplate,
			templateLock: false,
		}
	);

	const navigationTypeOptions = [
		{
			value: 'anchored',
			label: __('Anchored below header', 'matter'),
		},
		{
			value: 'fullscreen',
			label: __('Fullscreen overlay', 'matter'),
		},
		{
			value: 'drawer',
			label: __('Drawer', 'matter'),
		},
	];

	const drawerPositionOptions = [
		{
			value: 'left',
			label: __('Left', 'matter'),
		},
		{
			value: 'right',
			label: __('Right', 'matter'),
		},
	];

	const collapseModeOptions = [
		{
			value: 'breakpoint',
			label: __('Collapse at breakpoint', 'matter'),
		},
		{
			value: 'always',
			label: __('Always collapsed', 'matter'),
		},
	];

	const showDesktopEditor =
		collapseMode === 'breakpoint' && !isEditingCollapsed;
	const showCollapsedEditor = isEditingCollapsed;

	return (
		<>
			{collapseMode === 'breakpoint' && (
				<NavigationMenuEditorModeControls
					parentClientId={clientId}
					isEditingCollapsed={isEditingCollapsed}
				/>
			)}

			<InspectorControls>
				<PanelBody title={__('Settings', 'matter')}>
					<SelectControl
						__next40pxDefaultSize
						label={__('Navigation type', 'matter')}
						help={__(
							'Choose how the collapsed menu surface is rendered on the frontend.',
							'matter'
						)}
						value={navigationType}
						options={navigationTypeOptions}
						onChange={(value) =>
							setAttributes({
								navigationType: value || 'anchored',
							})
						}
					/>
					{navigationType === 'drawer' && (
						<SelectControl
							__next40pxDefaultSize
							label={__('Drawer position', 'matter')}
							help={__(
								'Choose which side of the viewport the drawer opens from.',
								'matter'
							)}
							value={drawerPosition}
							options={drawerPositionOptions}
							onChange={(value) =>
								setAttributes({
									drawerPosition: value || 'right',
								})
							}
						/>
					)}
					<SelectControl
						__next40pxDefaultSize
						label={__('Collapse mode', 'matter')}
						help={__(
							'Choose whether the menu is always collapsed or only below a breakpoint.',
							'matter'
						)}
						value={collapseMode}
						options={collapseModeOptions}
						onChange={(value) =>
							setAttributes({
								collapseMode: value || 'breakpoint',
							})
						}
					/>
					{collapseMode === 'breakpoint' && (
						<SelectControl
							__next40pxDefaultSize
							label={__('Breakpoint', 'matter')}
							help={__(
								'The collapsed menu is shown below this breakpoint.',
								'matter'
							)}
							value={breakpoint || defaultSlug}
							options={breakpointOptions}
							onChange={(value) =>
								setAttributes({
									breakpoint: value || defaultSlug,
								})
							}
						/>
					)}
					<TextControl
						__next40pxDefaultSize
						label={__('Close label', 'matter')}
						value={closeLabel}
						onChange={(value) =>
							setAttributes({
								closeLabel: value,
							})
						}
					/>
				</PanelBody>
			</InspectorControls>

			<div {...blockProps}>
				<div {...innerBlocksProps} />
			</div>
		</>
	);
}
