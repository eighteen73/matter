/**
 * Slot matching, shared by the editor's useSlots and its tests. No WordPress
 * dependencies, so it can be unit tested.
 */

/**
 * Old names of renamed slots (`previously`), mapped to the slot's name. An
 * old name that is declared again is ignored. Matches Sections::get_slot_aliases().
 *
 * @param {Object} slots Declared slots.
 * @return {Map<string, string>} Old name => current name.
 */
export const getSlotAliases = (slots) => {
	const aliases = new Map();

	Object.entries(slots ?? {}).forEach(([name, slot]) => {
		(slot?.previously ?? []).forEach((old) => {
			if (!(old in slots)) {
				aliases.set(old, name);
			}
		});
	});

	return aliases;
};

const isSlot = (block) => block?.name === 'matter/slot';
const isEmpty = (block) => !block.innerBlocks?.length;

/**
 * The slot blocks a block should have: one per declared slot, in declared
 * order, matched by name (not position, as core's template sync does).
 *
 * - An existing slot with the name keeps its content; the first one wins.
 * - A slot saved under an old name (`previously`) takes the new name, when
 *   no slot has it or that slot is empty.
 * - Missing slots are created, filled from their `template`.
 * - Anything else (undeclared or duplicate slots) moves to the end, so
 *   content is never lost: the editor shows it for the client to move or
 *   remove, and the front end doesn't output it.
 *
 * Matches Sections::slots() on the front end.
 *
 * @param {Array}    blocks     Current inner blocks.
 * @param {Object}   slots      Declared slots.
 * @param {Function} createSlot Creates a new slot block for a name.
 * @return {Array|null} The blocks to use, or null when nothing changes.
 */
export function reconcileSlots(blocks, slots, createSlot) {
	const names = Object.keys(slots ?? {});
	const aliases = getSlotAliases(slots);
	const kept = new Map();
	const used = new Set();

	// Exact names first.
	blocks.forEach((block) => {
		const name = block.attributes?.name;

		if (isSlot(block) && names.includes(name) && !kept.has(name)) {
			kept.set(name, block);
			used.add(block);
		}
	});

	// Then old names, for slots that are missing or empty.
	blocks.forEach((block) => {
		const name = isSlot(block) && aliases.get(block.attributes?.name);

		if (!name || used.has(block) || isEmpty(block)) {
			return;
		}

		const current = kept.get(name);

		if (current && !isEmpty(current)) {
			return;
		}

		if (current) {
			used.delete(current);
		}

		kept.set(name, {
			...block,
			attributes: { ...block.attributes, name },
		});
		used.add(block);
	});

	const next = [
		...names.map((name) => kept.get(name) ?? createSlot(name)),
		...blocks.filter((block) => !used.has(block)),
	];

	const unchanged =
		next.length === blocks.length &&
		next.every((block, index) => block === blocks[index]);

	return unchanged ? null : next;
}
