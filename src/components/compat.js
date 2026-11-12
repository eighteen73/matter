/**
 * WordPress components Matter uses that are still exported under an
 * `__experimental` prefix (though core uses them throughout and they're
 * stable in practice). Each prefers the stable name, so when WordPress drops
 * the prefix, or renames one, this file is the only one to change.
 *
 * Import them from here, never from the components or block editor packages
 * directly.
 */

/**
 * WordPress dependencies
 */
import * as blockEditor from '@wordpress/block-editor';
import * as components from '@wordpress/components';

export const ToolsPanel =
	components.ToolsPanel ?? components.__experimentalToolsPanel;

export const ToolsPanelItem =
	components.ToolsPanelItem ?? components.__experimentalToolsPanelItem;

export const ToggleGroupControl =
	components.ToggleGroupControl ??
	components.__experimentalToggleGroupControl;

export const ToggleGroupControlOption =
	components.ToggleGroupControlOption ??
	components.__experimentalToggleGroupControlOption;

export const NumberControl =
	components.NumberControl ?? components.__experimentalNumberControl;

export const VStack = components.VStack ?? components.__experimentalVStack;

export const BlockVariationPicker =
	blockEditor.BlockVariationPicker ??
	blockEditor.__experimentalBlockVariationPicker;
