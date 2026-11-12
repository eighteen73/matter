/**
 * IDs that links point at (an overlay's `#id`, a tab's or accordion's deep
 * link), kept stable and unique among the page's blocks.
 *
 * - A block gets an ID when it has none (inserted, or added before IDs were
 *   saved), and a new one only when it's shown with an ID an earlier block
 *   already has (duplicated or pasted). That check runs when the block is
 *   shown, never as an ID is edited, so editing one block's ID can't rename
 *   another's and break its links.
 * - Assigning an ID isn't an undo step: undoing an insert removes the block.
 * - IdControl edits an ID: it's applied when the field loses focus, and an
 *   empty ID, or one another block has, is refused.
 */

/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { TextControl } from '@wordpress/components';
import { useRegistry, useSelect } from '@wordpress/data';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * A short random suffix.
 *
 * @return {string} Suffix.
 */
const randomSuffix = () => Math.random().toString(36).slice(2, 7);

/**
 * An ID as it may be saved: lowercase letters, numbers, hyphens and underscores.
 *
 * @param {string} value Typed value.
 * @return {string} ID.
 */
export const sanitizeId = (value) =>
	String(value ?? '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '-')
		.replace(/^-+|-+$/g, '');

/**
 * Whether another block on the page uses an ID in the attribute.
 *
 * @param {Object}  select    Block editor selectors.
 * @param {string}  clientId  The block.
 * @param {string}  attribute Attribute name.
 * @param {string}  id        ID.
 * @param {boolean} before    Only count blocks earlier on the page.
 * @return {boolean} Taken.
 */
export const isIdTaken = (select, clientId, attribute, id, before = false) => {
	const { getClientIdsWithDescendants, getBlockAttributes } = select;
	const ids = getClientIdsWithDescendants();
	const position = ids.indexOf(clientId);

	return ids.some(
		(other, index) =>
			other !== clientId &&
			(!before || index < position) &&
			getBlockAttributes(other)?.[attribute] === id
	);
};

/**
 * Keep a block's ID attribute set and unique (see above).
 *
 * @param {string} clientId  Block client ID.
 * @param {string} attribute Attribute holding the ID.
 * @param {string} prefix    Prefix for new IDs, e.g. "modal".
 */
export function useStableId(clientId, attribute, prefix) {
	const registry = useRegistry();
	const checked = useRef(false);
	const id = useSelect(
		(select) =>
			select(blockEditorStore).getBlockAttributes(clientId)?.[
				attribute
			] ?? '',
		[clientId, attribute]
	);

	useEffect(() => {
		const select = registry.select(blockEditorStore);
		// Duplicates are only checked when the block is first shown.
		const isDuplicate =
			!checked.current &&
			!!id &&
			isIdTaken(select, clientId, attribute, id, true);

		checked.current = true;

		if (id && !isDuplicate) {
			return;
		}

		const {
			updateBlockAttributes,
			__unstableMarkNextChangeAsNotPersistent: markNotPersistent,
		} = registry.dispatch(blockEditorStore);

		let next;

		do {
			next = `${prefix}-${randomSuffix()}`;
		} while (isIdTaken(select, clientId, attribute, next));

		markNotPersistent({ history: 'ignore' });
		updateBlockAttributes(clientId, { [attribute]: next });
	}, [registry, clientId, attribute, prefix, id]);
}

/**
 * A field for a block's ID: applied when it loses focus; empty or taken IDs
 * are refused.
 *
 * @param {Object}   props
 * @param {string}   props.clientId  Block client ID.
 * @param {string}   props.attribute Attribute holding the ID.
 * @param {string}   props.value     Current ID.
 * @param {Function} props.onChange  Called with a valid new ID.
 * @param {string}   props.label     Field label.
 * @param {string}   props.help      Help text.
 * @return {Element} Field.
 */
export function IdControl({
	clientId,
	attribute,
	value,
	onChange,
	label = __('ID', 'matter'),
	help,
}) {
	const registry = useRegistry();
	const [draft, setDraft] = useState(null);
	const [error, setError] = useState('');

	const commit = () => {
		if (draft === null) {
			return;
		}

		const next = sanitizeId(draft);

		if (!next) {
			setError(
				__('An ID is needed. The previous one was kept.', 'matter')
			);
			setDraft(null);
			return;
		}

		if (
			next !== value &&
			isIdTaken(
				registry.select(blockEditorStore),
				clientId,
				attribute,
				next
			)
		) {
			setError(
				__(
					'Another block on this page uses this ID. Choose a different one.',
					'matter'
				)
			);
			return;
		}

		setError('');
		setDraft(null);

		if (next !== value) {
			onChange(next);
		}
	};

	return (
		<TextControl
			__nextHasNoMarginBottom
			__next40pxDefaultSize
			label={label}
			value={draft ?? value ?? ''}
			onChange={(next) => {
				setDraft(next);
				setError('');
			}}
			onBlur={commit}
			onKeyDown={(event) => {
				if (event.key === 'Enter') {
					commit();
				}
			}}
			help={error || help}
			className={error ? 'has-error' : undefined}
		/>
	);
}
