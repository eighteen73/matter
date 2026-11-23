/**
 * WordPress components Matter uses that are still exported under an
 * `__experimental` prefix (though core uses them throughout and they're
 * stable in practice). Each prefers the stable name, so when WordPress drops
 * the prefix, or renames one, this file is the only one to change.
 *
 * Import these components from here, never from the components or block
 * editor packages directly.
 *
 * It covers imported components only. The other unstable names Matter relies
 * on aren't exports, so can't be aliased here; each is used where it's needed,
 * and the weekly compatibility run (.github/workflows/compatibility.yml)
 * runs the editor tests against WordPress nightly to catch a change:
 *
 * - `__experimentalLabel`, a block type's list view label (the `loop-item`,
 *   `tab`, `accordion-item`, `filter`, `slot` and `template-part` blocks, and
 *   sections, in their `index.js` or `editor/`).
 * - `__unstableMarkNextChangeAsNotPersistent`, a block editor action, for
 *   changes the editor makes itself (components/stable-id, query-display,
 *   loop-item, slots).
 * - `__unstableOnSplitAtEnd`, RichText's Enter prop (components/enter-content).
 * - `__experimentalFetchLinkSuggestions`, a block editor setting
 *   (editor/overlays/link-suggestions).
 * - `blockEditor.__unstableCanInsertBlockType`, a `wp.hooks` filter
 *   (editor/extensions/can-insert; WooCommerce uses it too).
 * - `wc.wcBlocksRegistry.__experimentalRegisterProductCollection`, with
 *   WooCommerce's own block registry (integrations/woocommerce).
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
